import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Binding, type FinalizedTransaction, Proof, SignatureEnabled, Transaction, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createProofProvider, type MidnightProviders, type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import semver from 'semver';
import { inMemoryPrivateStateProvider } from './private-state-provider';

export const PRIVATE_STATE_ID = 'commonveilPrivateState';
export type CommonVeilCircuit = 'registerMember' | 'registerAdvisory' | 'attest';
export type CommonVeilProviders = MidnightProviders<CommonVeilCircuit, typeof PRIVATE_STATE_ID, Record<string, never>>;

export interface ConnectedWallet {
  readonly name: string;
  readonly address: string;
  readonly dustBalance: bigint;
  readonly dustCap: bigint;
  readonly proofMode: 'wallet' | 'local-server';
  readonly providers: CommonVeilProviders;
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
    console.info('Wallet prover unavailable; using local proof server.', walletProofError);
  }

  return {
    name: initialAPI.name,
    address: unshielded.unshieldedAddress,
    dustBalance: dust.balance,
    dustCap: dust.cap,
    proofMode,
    providers: {
      privateStateProvider: inMemoryPrivateStateProvider<typeof PRIVATE_STATE_ID, Record<string, never>>(),
      zkConfigProvider,
      proofProvider,
      publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
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
