import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Binding, type FinalizedTransaction, Proof, SignatureEnabled, Transaction, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createProofProvider, type MidnightProviders, type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import semver from 'semver';
import { inMemoryPrivateStateProvider } from './private-state-provider.js';

export const PRIVATE_STATE_ID = 'commonveilPrivateState';
export type CommonVeilCircuit = 'registerMember' | 'certifyInventory' | 'registerAffectedRelease' | 'attest';
export type CommonVeilProviders = MidnightProviders<CommonVeilCircuit, typeof PRIVATE_STATE_ID, Record<string, never>>;

export type IndexerConfigurationStatus = 'Wallet-provided indexer' | 'Blockfrost override configured';

export interface ConnectedWallet {
  readonly name: string;
  readonly address: string;
  readonly dustBalance: bigint;
  readonly dustCap: bigint;
  readonly proofMode: 'wallet' | 'local-server';
  readonly indexerStatus: IndexerConfigurationStatus;
  readonly providers: CommonVeilProviders;
}

export interface IndexerEndpoints {
  readonly httpUri: string;
  readonly wsUri: string;
  readonly status: IndexerConfigurationStatus;
}

export class IndexerConfigurationError extends Error {
  constructor(message: string) {
    super(sanitizeTokens(message));
    this.name = 'IndexerConfigurationError';
    Object.setPrototypeOf(this, IndexerConfigurationError.prototype);
  }
}

/**
 * Sanitizes any text, errors, or URLs so that Blockfrost project IDs / tokens
 * are never shown in the UI, console, exceptions or diagnostics.
 */
export function sanitizeTokens(value: string): string {
  if (!value) return '';
  return value
    .replace(/([?&]project_id=)[^& \r\n\t'"`)]*/gi, '$1[REDACTED]')
    .replace(/(project_id[:=]\s*)[^\s&,;'"`)]{6,}/gi, '$1[REDACTED]')
    .replace(/\b((?:midnight)?(?:preprod|mainnet|preview)[a-zA-Z0-9]{20,})\b/g, '[REDACTED_TOKEN]');
}

const BLOCKFROST_HOST = 'midnight-preprod.blockfrost.io';

/**
 * Validates candidate Blockfrost indexer override URLs.
 * Rejects:
 * - missing one of the two URLs
 * - http instead of https
 * - ws instead of wss
 * - placeholder YOUR_PROJECT_ID
 * - non-Blockfrost hosts for an explicit Blockfrost configuration
 * - malformed URLs
 */
export function validateBlockfrostOverride(
  httpCandidate: string | undefined,
  wsCandidate: string | undefined,
): { httpUri: string; wsUri: string } {
  const rawHttp = httpCandidate?.trim() ?? '';
  const rawWs = wsCandidate?.trim() ?? '';

  if (!rawHttp || !rawWs) {
    throw new IndexerConfigurationError(
      'Incomplete Blockfrost override configuration: both VITE_INDEXER_URI and VITE_INDEXER_WS_URI must be provided.',
    );
  }

  // Detect unreplaced placeholder tokens
  if (
    /YOUR_MIDNIGHT_PREPROD_PROJECT_ID/i.test(rawHttp) ||
    /YOUR_MIDNIGHT_PREPROD_PROJECT_ID/i.test(rawWs) ||
    /YOUR_PROJECT_ID/i.test(rawHttp) ||
    /YOUR_PROJECT_ID/i.test(rawWs)
  ) {
    throw new IndexerConfigurationError(
      'Blockfrost override rejected: placeholder YOUR_PROJECT_ID detected in indexer configuration.',
    );
  }

  let parsedHttp: URL;
  try {
    parsedHttp = new URL(rawHttp);
  } catch (_e) {
    throw new IndexerConfigurationError('Blockfrost override rejected: malformed VITE_INDEXER_URI.');
  }

  let parsedWs: URL;
  try {
    parsedWs = new URL(rawWs);
  } catch (_e) {
    throw new IndexerConfigurationError('Blockfrost override rejected: malformed VITE_INDEXER_WS_URI.');
  }

  if (parsedHttp.protocol !== 'https:') {
    throw new IndexerConfigurationError(
      `Blockfrost HTTP override rejected: unsafe protocol '${parsedHttp.protocol}'. HTTPS is strictly required.`,
    );
  }

  if (parsedWs.protocol !== 'wss:') {
    throw new IndexerConfigurationError(
      `Blockfrost WebSocket override rejected: unsafe protocol '${parsedWs.protocol}'. WSS is strictly required.`,
    );
  }

  if (parsedHttp.hostname.toLowerCase() !== BLOCKFROST_HOST) {
    throw new IndexerConfigurationError(
      `Blockfrost override rejected: invalid host '${parsedHttp.hostname}'. Expected host '${BLOCKFROST_HOST}'.`,
    );
  }

  if (parsedWs.hostname.toLowerCase() !== BLOCKFROST_HOST) {
    throw new IndexerConfigurationError(
      `Blockfrost override rejected: invalid WebSocket host '${parsedWs.hostname}'. Expected host '${BLOCKFROST_HOST}'.`,
    );
  }

  return {
    httpUri: rawHttp,
    wsUri: rawWs,
  };
}

/**
 * Determines indexer endpoints using either validated Blockfrost overrides
 * or wallet-provided configuration fallback.
 */
export function resolveIndexerEndpoints(
  envHttp: string | undefined,
  envWs: string | undefined,
  walletConfig: { indexerUri: string; indexerWsUri: string },
): IndexerEndpoints {
  const hasHttp = !!envHttp && envHttp.trim().length > 0;
  const hasWs = !!envWs && envWs.trim().length > 0;

  if (hasHttp || hasWs) {
    const validated = validateBlockfrostOverride(envHttp, envWs);
    return {
      httpUri: validated.httpUri,
      wsUri: validated.wsUri,
      status: 'Blockfrost override configured',
    };
  }

  return {
    httpUri: walletConfig.indexerUri,
    wsUri: walletConfig.indexerWsUri,
    status: 'Wallet-provided indexer',
  };
}

const findWallet = (): InitialAPI | undefined => {
  const wallets = Object.values(window.midnight ?? {}).filter(
    (wallet): wallet is InitialAPI =>
      !!wallet && typeof wallet === 'object' && 'apiVersion' in wallet && semver.satisfies(wallet.apiVersion, '4.x'),
  );
  return wallets.find((wallet) => /1am/i.test(`${wallet.name} ${wallet.rdns}`)) ?? wallets[0];
};

const waitForWallet = async (): Promise<InitialAPI> => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const wallet = findWallet();
    if (wallet) return wallet;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('No compatible Midnight wallet found. Open 1AM, unlock it, then reload this page.');
};

export const connectProviders = async (
  onSubmitted: (txId: string) => void,
): Promise<ConnectedWallet> => {
  setNetworkId('preprod');
  const initialAPI = await waitForWallet();
  const connectedAPI: ConnectedAPI = await initialAPI.connect('preprod');
  await connectedAPI.hintUsage([
    'getConfiguration',
    'getShieldedAddresses',
    'getUnshieldedAddress',
    'getDustBalance',
    'getProvingProvider',
    'balanceUnsealedTransaction',
    'submitTransaction',
  ]);

  const config = await connectedAPI.getConfiguration();
  if (!config.networkId.toLowerCase().includes('preprod')) {
    throw new Error(`Wallet connected to '${config.networkId}'. Switch 1AM to Preprod and reconnect.`);
  }

  const [shielded, unshielded, dust] = await Promise.all([
    connectedAPI.getShieldedAddresses(),
    connectedAPI.getUnshieldedAddress(),
    connectedAPI.getDustBalance(),
  ]);
  const zkConfigProvider = new FetchZkConfigProvider<CommonVeilCircuit>(window.location.origin, fetch.bind(window));

  let proofMode: ConnectedWallet['proofMode'] = 'wallet';
  let proofProvider;
  try {
    const walletProver = await connectedAPI.getProvingProvider(zkConfigProvider);
    proofProvider = createProofProvider(walletProver);
  } catch (walletProofError) {
    const proofServer = config.proverServerUri || 'http://localhost:6300';
    proofProvider = httpClientProofProvider(proofServer, zkConfigProvider);
    proofMode = 'local-server';
    const sanitizedMsg = sanitizeTokens(
      walletProofError instanceof Error ? walletProofError.message : String(walletProofError),
    );
    console.info('Wallet prover unavailable; using local proof server.', sanitizedMsg);
  }

  const indexerEndpoints = resolveIndexerEndpoints(
    import.meta.env.VITE_INDEXER_URI,
    import.meta.env.VITE_INDEXER_WS_URI,
    config,
  );

  return {
    name: initialAPI.name,
    address: unshielded.unshieldedAddress,
    dustBalance: dust.balance,
    dustCap: dust.cap,
    proofMode,
    indexerStatus: indexerEndpoints.status,
    providers: {
      privateStateProvider: inMemoryPrivateStateProvider<typeof PRIVATE_STATE_ID, Record<string, never>>(),
      zkConfigProvider,
      proofProvider,
      publicDataProvider: indexerPublicDataProvider(
        indexerEndpoints.httpUri,
        indexerEndpoints.wsUri,
      ),
      walletProvider: {
        getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
        getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
        balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
          const balanced = await connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize()));
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(balanced.tx));
        },
      },
      midnightProvider: {
        submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
          await connectedAPI.submitTransaction(toHex(tx.serialize()));
          const txId = tx.identifiers()[0];
          onSubmitted(txId);
          return txId;
        },
      },
    },
  };
};
