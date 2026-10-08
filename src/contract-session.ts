/**
 * CV-007 Verified Contract Session & Public State Inspection.
 *
 * Provides application-layer helpers to query, decode, verify, and attach
 * to an existing deployed CommonVeil contract address on Midnight Preprod.
 *
 * Crucial invariants:
 * - Querying performs NO transactions, creates NO secrets, and does NOT set private-state provider.
 * - Successful attachment sets private-state provider address ONLY after query and ledger decoding succeed.
 * - Role verification uses generated pure circuits locally without submitting any transaction.
 * - Secrets remain local in memory and are never returned, serialized, logged, or retained.
 * - JavaScript memory cannot guarantee perfect zeroization.
 */

import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { CommonVeilCircuit, PRIVATE_STATE_ID } from './providers';
import { CommonVeil } from './contract';
import { bytesToHex, validateContractAddress } from './role-packages';

export type CommonVeilProvidersLike = MidnightProviders<
  CommonVeilCircuit,
  typeof PRIVATE_STATE_ID,
  Record<string, never>
>;

export interface CommonVeilPublicState {
  readonly contractAddress: string;
  readonly registrarKey: string; // 32 bytes hex (64 chars)
  readonly certifierKey: string; // 32 bytes hex (64 chars)
  readonly policyActive: boolean;
  readonly members: bigint;
  readonly inventoryCommitments: bigint;
  readonly affectedReleases: bigint;
  readonly usedNullifiers: bigint;
  readonly accepted: bigint;
}

export interface CommonVeilContractSession {
  readonly publicState: CommonVeilPublicState;
  /**
   * Internal narrow helper to verify if a member credential is admitted
   * in the attached contract's memberCredentials set.
   */
  readonly hasMemberCredential: (memberCredentialBytes: Uint8Array) => boolean;
}

export type ContractSessionErrorCode =
  | 'INVALID_CONTRACT_ADDRESS'
  | 'CONTRACT_NOT_FOUND'
  | 'INCOMPATIBLE_CONTRACT'
  | 'INVALID_SECRET_LENGTH';

export class ContractSessionError extends Error {
  readonly code: ContractSessionErrorCode;

  constructor(code: ContractSessionErrorCode, message: string) {
    super(message);
    this.name = 'ContractSessionError';
    this.code = code;
    Object.setPrototypeOf(this, ContractSessionError.prototype);
  }
}

function requireExactly32Bytes(bytes: unknown, paramName: string): Uint8Array {
  if (!(bytes instanceof Uint8Array)) {
    throw new ContractSessionError(
      'INVALID_SECRET_LENGTH',
      `${paramName} must be provided as a Uint8Array`,
    );
  }
  if (bytes.length !== 32) {
    throw new ContractSessionError(
      'INVALID_SECRET_LENGTH',
      `${paramName} must be exactly 32 bytes (received ${bytes.length} bytes)`,
    );
  }
  return bytes;
}

/**
 * Normalizes and decodes raw contract state from the public data provider.
 */
function decodeLedgerState(
  contractAddress: string,
  rawStateData: unknown,
): { publicState: CommonVeilPublicState; ledger: CommonVeil.Ledger } {
  let decodedLedger: CommonVeil.Ledger;
  try {
    decodedLedger = CommonVeil.ledger(rawStateData as any);
  } catch (error) {
    throw new ContractSessionError(
      'INCOMPATIBLE_CONTRACT',
      `State at address '${contractAddress}' could not be decoded as CommonVeil ledger: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    // Validate required CommonVeil ledger fields exist
    if (
      !decodedLedger.admin ||
      !decodedLedger.certifier ||
      decodedLedger.memberCredentials === undefined ||
      decodedLedger.inventoryCommitments === undefined ||
      decodedLedger.affectedReleases === undefined ||
      decodedLedger.usedNullifiers === undefined ||
      typeof decodedLedger.policyActive !== 'boolean' ||
      typeof decodedLedger.accepted !== 'bigint'
    ) {
      throw new Error('Missing required CommonVeil ledger fields');
    }

    const registrarKey = bytesToHex(decodedLedger.admin);
    const certifierKey = bytesToHex(decodedLedger.certifier);
    if (registrarKey.length !== 64 || certifierKey.length !== 64) {
      throw new Error('Admin or certifier key is not 32 bytes');
    }

    const publicState: CommonVeilPublicState = {
      contractAddress,
      registrarKey,
      certifierKey,
      policyActive: decodedLedger.policyActive,
      members: decodedLedger.memberCredentials.size(),
      inventoryCommitments: decodedLedger.inventoryCommitments.size(),
      affectedReleases: decodedLedger.affectedReleases.size(),
      usedNullifiers: decodedLedger.usedNullifiers.size(),
      accepted: decodedLedger.accepted,
    };

    return { publicState, ledger: decodedLedger };
  } catch (error) {
    throw new ContractSessionError(
      'INCOMPATIBLE_CONTRACT',
      `State at address '${contractAddress}' is incompatible with CommonVeil: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Queries an existing contract address on Midnight Preprod via the public data provider.
 * Does NOT set the private-state provider address.
 * Performs NO transactions.
 */
export async function queryCommonVeilContract(
  providers: Pick<CommonVeilProvidersLike, 'publicDataProvider'>,
  contractAddress: string,
): Promise<CommonVeilContractSession> {
  let validatedAddress: string;
  try {
    validatedAddress = validateContractAddress(contractAddress);
  } catch (_error) {
    throw new ContractSessionError(
      'INVALID_CONTRACT_ADDRESS',
      'Contract address must be a non-empty string',
    );
  }

  let state;
  try {
    state = await providers.publicDataProvider.queryContractState(validatedAddress);
  } catch (error) {
    throw new ContractSessionError(
      'CONTRACT_NOT_FOUND',
      `Failed to query contract state at '${validatedAddress}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!state || !('data' in state) || state.data === null || state.data === undefined) {
    throw new ContractSessionError(
      'CONTRACT_NOT_FOUND',
      `Contract not found or not indexed at address '${validatedAddress}'`,
    );
  }

  const { publicState, ledger } = decodeLedgerState(validatedAddress, state.data);

  return {
    publicState,
    hasMemberCredential: (memberCredentialBytes: Uint8Array): boolean => {
      requireExactly32Bytes(memberCredentialBytes, 'memberCredential');
      return ledger.memberCredentials.member(memberCredentialBytes);
    },
  };
}

/**
 * Verified Attachment:
 * 1. Queries and decodes contract state.
 * 2. Scopes providers.privateStateProvider.setContractAddress ONLY after query succeeds.
 * 3. Returns the decoded CommonVeilContractSession.
 */
export async function attachCommonVeilContract(
  providers: Pick<CommonVeilProvidersLike, 'publicDataProvider' | 'privateStateProvider'>,
  contractAddress: string,
): Promise<CommonVeilContractSession> {
  const session = await queryCommonVeilContract(providers, contractAddress);
  providers.privateStateProvider.setContractAddress(session.publicState.contractAddress);
  return session;
}

/**
 * Verifies locally whether the supplied admin secret derives the on-chain registrar key.
 * Pure local calculation; performs no transactions.
 * Secrets are never returned, serialized, or logged.
 */
export function verifyRegistrarSecret(
  publicState: Pick<CommonVeilPublicState, 'registrarKey'>,
  adminSecret: Uint8Array,
): boolean {
  requireExactly32Bytes(adminSecret, 'adminSecret');
  const derivedAdminKey = CommonVeil.pureCircuits.deriveAdminKey(adminSecret);
  const derivedHex = bytesToHex(derivedAdminKey);
  return derivedHex.toLowerCase() === publicState.registrarKey.toLowerCase();
}

/**
 * Verifies locally whether the supplied certifier secret derives the on-chain certifier key.
 * Pure local calculation; performs no transactions.
 * Secrets are never returned, serialized, or logged.
 */
export function verifyCertifierSecret(
  publicState: Pick<CommonVeilPublicState, 'certifierKey'>,
  certifierSecret: Uint8Array,
): boolean {
  requireExactly32Bytes(certifierSecret, 'certifierSecret');
  const derivedCertifierKey = CommonVeil.pureCircuits.deriveCertifierKey(certifierSecret);
  const derivedHex = bytesToHex(derivedCertifierKey);
  return derivedHex.toLowerCase() === publicState.certifierKey.toLowerCase();
}

/**
 * Verifies locally whether the supplied member secret & salt derive an admitted member credential.
 * Pure local calculation against the decoded contract session; performs no transactions.
 * Secrets are never returned, serialized, or logged.
 */
export function verifyMemberCredential(
  session: CommonVeilContractSession,
  memberSecret: Uint8Array,
  memberSalt: Uint8Array,
): boolean {
  requireExactly32Bytes(memberSecret, 'memberSecret');
  requireExactly32Bytes(memberSalt, 'memberSalt');
  const derivedCredential = CommonVeil.pureCircuits.deriveMemberCredential(memberSecret, memberSalt);
  return session.hasMemberCredential(derivedCredential);
}
