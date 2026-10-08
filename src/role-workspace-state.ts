/**
 * CV-007 Role Workspace pure routing, state, and sanitization logic.
 *
 * Provides pure helpers for URL parsing, role validation, safe error mapping,
 * safe wallet error mapping, address invalidation, registrar secret validation,
 * registrar backup payload schemas, safe registrar error sanitization, and async request race protection.
 */

import { ContractSessionError, type ContractSessionErrorCode } from './contract-session';
import {
  isHex,
  hexToBytes,
  bytesToHex,
  isValidIsoTimestamp,
  CERTIFIER_KEY_SCHEMA,
  type CertifierKeyPackage,
  validateCertifierKeyPackage,
} from './role-packages';

export type RoleType = 'registrar' | 'certifier' | 'member';

export const VALID_ROLES: readonly RoleType[] = ['registrar', 'certifier', 'member'] as const;

export interface RoleDescriptor {
  readonly role: RoleType;
  readonly label: string;
  readonly description: string;
}

export const ROLE_DESCRIPTORS: Record<RoleType, RoleDescriptor> = {
  registrar: {
    role: 'registrar',
    label: 'Registrar',
    description: 'Deploys governance parameters, admits member credentials, and activates policy.',
  },
  certifier: {
    role: 'certifier',
    label: 'Certifier',
    description: 'Reviews submitted inventory evidence and commits an authorized pre-policy snapshot.',
  },
  member: {
    role: 'member',
    label: 'Member',
    description: 'Proves private affected-release exposure using locally held credentials.',
  },
};

/**
 * Parses the role query parameter from a search query string or URL.
 * Returns RoleType if valid, or null if missing or unknown.
 */
export function parseRoleQuery(searchOrUrl: string): RoleType | null {
  try {
    let search = searchOrUrl;
    if (search.includes('?')) {
      search = search.slice(search.indexOf('?'));
    } else if (!search.startsWith('?')) {
      search = `?${search}`;
    }
    const params = new URLSearchParams(search);
    const roleParam = params.get('role')?.trim().toLowerCase();
    if (!roleParam) return null;

    if (roleParam === 'registrar' || roleParam === 'certifier' || roleParam === 'member') {
      return roleParam;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pure mapping of ContractSessionErrorCode to sanitized user-facing messages.
 * Never leaks raw internal errors, URLs, tokens, or stack traces.
 */
export const CONTRACT_SESSION_ERROR_MESSAGES: Record<ContractSessionErrorCode, string> = {
  INVALID_CONTRACT_ADDRESS: 'The supplied contract address format is invalid.',
  CONTRACT_NOT_FOUND: 'No indexed contract state exists at the supplied address.',
  INCOMPATIBLE_CONTRACT: 'The contract at this address does not expose a compatible CommonVeil ledger.',
  INDEXER_QUERY_FAILED: 'The Midnight indexer could not complete the contract lookup.',
  INVALID_SECRET_LENGTH: 'Secret and salt values must be exactly 32 bytes.',
};

const GENERIC_SAFE_ERROR_MESSAGE = 'The contract operation could not be completed. Check the address and try again.';

/**
 * Sanitizes any caught error for display in the workspace error panel.
 */
export function mapWorkspaceError(error: unknown): string {
  if (error instanceof ContractSessionError) {
    return CONTRACT_SESSION_ERROR_MESSAGES[error.code] ?? GENERIC_SAFE_ERROR_MESSAGE;
  }
  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code as ContractSessionErrorCode;
    if (code in CONTRACT_SESSION_ERROR_MESSAGES) {
      return CONTRACT_SESSION_ERROR_MESSAGES[code];
    }
  }
  return GENERIC_SAFE_ERROR_MESSAGE;
}

/**
 * Pure sanitization helper for wallet connection errors.
 * Never displays raw error messages, URLs, connector internals, tokens, or stack traces.
 */
export function mapWalletError(error: unknown): string {
  if (!error) {
    return 'Wallet connection was not completed. Unlock 1AM on Preprod and try again.';
  }

  const rawMessage = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof (error as any)?.message === 'string'
          ? (error as any).message
          : ''
  ).toLowerCase();

  // Distinguish known safe application conditions without leaking internals
  if (
    rawMessage.includes('no compatible midnight wallet') ||
    rawMessage.includes('wallet not found') ||
    rawMessage.includes('unlock')
  ) {
    return 'No compatible Midnight wallet found. Open 1AM, unlock it on Preprod, and try again.';
  }

  if (
    rawMessage.includes('preprod') ||
    rawMessage.includes('network') ||
    rawMessage.includes('wrong network')
  ) {
    return 'Wallet is not connected to Preprod. Switch 1AM network to Preprod and try again.';
  }

  if (
    rawMessage.includes('cancel') ||
    rawMessage.includes('reject') ||
    rawMessage.includes('denied') ||
    rawMessage.includes('declined')
  ) {
    return 'Wallet connection request was cancelled or declined in 1AM.';
  }

  return 'Wallet connection was not completed. Unlock 1AM on Preprod and try again.';
}

export type InspectionState = 'none' | 'inspecting' | 'inspected' | 'attaching' | 'attached';
export type CopyStatus = 'idle' | 'copied' | 'failed';

export interface WorkspaceContractState {
  readonly addressInput: string;
  readonly inspectionState: InspectionState;
  readonly inspectedState: import('./contract-session').CommonVeilPublicState | null;
  readonly attachedAddress: string | null;
  readonly errorMessage: string | null;
  readonly copyStatus: CopyStatus;
  readonly activeRequestId: number;
}

export const INITIAL_WORKSPACE_CONTRACT_STATE: WorkspaceContractState = {
  addressInput: '',
  inspectionState: 'none',
  inspectedState: null,
  attachedAddress: null,
  errorMessage: null,
  copyStatus: 'idle',
  activeRequestId: 0,
};

/**
 * Pure state reducer/updater for contract address changes.
 * Invalidates any prior inspected or attached state, copy status, and error message.
 * If currently busy inspecting or attaching, address mutation is rejected to prevent race conditions.
 */
export function handleAddressInputChange(
  prevState: WorkspaceContractState,
  newAddress: string,
): WorkspaceContractState {
  // Prevent address mutation while an async operation is in flight
  if (prevState.inspectionState === 'inspecting' || prevState.inspectionState === 'attaching') {
    return prevState;
  }
  if (prevState.addressInput === newAddress) {
    return prevState;
  }
  return {
    ...prevState,
    addressInput: newAddress,
    inspectionState: 'none',
    inspectedState: null,
    attachedAddress: null,
    errorMessage: null,
    copyStatus: 'idle',
  };
}

/**
 * Checks whether an async response matches the currently active request ID and address.
 * Prevents stale responses from overwriting newer state or attaching against a changed address.
 */
export function isResponseCurrent(
  currentState: WorkspaceContractState,
  requestId: number,
  originalAddress: string,
): boolean {
  if (currentState.activeRequestId !== requestId) {
    return false;
  }
  if (currentState.addressInput.trim() !== originalAddress.trim()) {
    return false;
  }
  return true;
}

/**
 * Pure helper for format short display of addresses / keys.
 */
export function shortenAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 10)}…${trimmed.slice(-8)}`;
}

/**
 * Pure helper for formatting DUST balance.
 */
export function formatDust(raw: bigint): string {
  const whole = raw / 1_000_000_000_000_000n;
  const fraction = (raw % 1_000_000_000_000_000n).toString().padStart(15, '0').slice(0, 4);
  return `${whole}.${fraction}`;
}

// ============================================================================
// Registrar Secret & Backup Pure Helpers
// ============================================================================

export const REGISTRAR_BACKUP_SCHEMA = 'commonveil.registrar-backup/v1' as const;

export interface RegistrarBackupPackage {
  readonly schema: typeof REGISTRAR_BACKUP_SCHEMA;
  readonly role: 'registrar';
  readonly registrarSecret: string; // 32-byte hex (64 chars)
  readonly createdAt: string;        // ISO timestamp
}

export type RegistrarVerificationStatus = 'unverified' | 'verified' | 'failed';

/**
 * Pure state model for Registrar secret lifecycle.
 * Invariant: Never contains a full plaintext secret string.
 */
export interface RegistrarSecretUiState {
  readonly hasSecret: boolean;
  readonly isLocked: boolean;
  readonly verificationStatus: RegistrarVerificationStatus;
  readonly canCopyOnce: boolean;
  readonly copyStatus: 'idle' | 'pending' | 'copied' | 'failed';
}

export const INITIAL_REGISTRAR_SECRET_UI_STATE: RegistrarSecretUiState = {
  hasSecret: false,
  isLocked: false,
  verificationStatus: 'unverified',
  canCopyOnce: false,
  copyStatus: 'idle',
};

/**
 * Validates a candidate 32-byte hexadecimal registrar secret string.
 * Returns normalized 64-char lowercase hex string.
 * Throws clean error if invalid without returning secret contents.
 */
export function validateRegistrarSecretHex(hex: unknown): string {
  if (typeof hex !== 'string') {
    throw new Error('Secret must be a hexadecimal string.');
  }
  const trimmed = hex.trim();
  if (trimmed.length !== 64) {
    throw new Error(`Secret must be exactly 32 bytes (64 hex characters), received ${trimmed.length} characters.`);
  }
  if (!isHex(trimmed, 32)) {
    throw new Error('Secret contains invalid non-hexadecimal characters.');
  }
  return trimmed.toLowerCase();
}

/**
 * Converts a validated 32-byte hex secret string to a Uint8Array.
 */
export function parseRegistrarSecretHex(hex: unknown): Uint8Array {
  const validated = validateRegistrarSecretHex(hex);
  return hexToBytes(validated);
}

/**
 * Generates a fresh 32-byte cryptographically secure random registrar secret.
 */
export function generateRegistrarSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Validates an unencrypted RegistrarBackupPackage payload before envelope encryption or after decryption.
 */
export function validateRegistrarBackupPackage(pkg: unknown): RegistrarBackupPackage {
  if (!pkg || typeof pkg !== 'object') {
    throw new Error('Registrar backup package must be an object.');
  }
  const p = pkg as Record<string, unknown>;
  if (p.schema !== REGISTRAR_BACKUP_SCHEMA) {
    throw new Error(`Invalid backup schema: expected '${REGISTRAR_BACKUP_SCHEMA}'.`);
  }
  if (p.role !== 'registrar') {
    throw new Error("Invalid backup role: expected 'registrar'.");
  }
  const validatedSecret = validateRegistrarSecretHex(p.registrarSecret);
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('Backup createdAt must be a valid ISO timestamp.');
  }
  return {
    schema: REGISTRAR_BACKUP_SCHEMA,
    role: 'registrar',
    registrarSecret: validatedSecret,
    createdAt: p.createdAt as string,
  };
}

/**
 * Creates an unencrypted RegistrarBackupPackage from an active 32-byte secret.
 */
export function buildRegistrarBackupPackage(
  secretBytes: Uint8Array,
  options?: { now?: Date },
): RegistrarBackupPackage {
  if (!(secretBytes instanceof Uint8Array) || secretBytes.length !== 32) {
    throw new Error('Secret bytes must be a 32-byte Uint8Array.');
  }
  const now = options?.now ?? new Date();
  return {
    schema: REGISTRAR_BACKUP_SCHEMA,
    role: 'registrar',
    registrarSecret: bytesToHex(secretBytes),
    createdAt: now.toISOString(),
  };
}

export const CERTIFIER_BACKUP_SCHEMA = 'commonveil.certifier-backup/v1' as const;

export interface CertifierBackupPackage {
  readonly schema: typeof CERTIFIER_BACKUP_SCHEMA;
  readonly role: 'certifier';
  readonly certifierSecret: string; // 32-byte hex (64 chars)
  readonly createdAt: string;        // ISO timestamp
}

export type CertifierVerificationStatus = 'unverified' | 'verified' | 'failed';

export interface CertifierSecretUiState {
  readonly hasSecret: boolean;
  readonly isLocked: boolean;
  readonly verificationStatus: CertifierVerificationStatus;
  readonly canCopyOnce: boolean;
  readonly copyStatus: 'idle' | 'pending' | 'copied' | 'failed';
}

export const INITIAL_CERTIFIER_SECRET_UI_STATE: CertifierSecretUiState = {
  hasSecret: false,
  isLocked: false,
  verificationStatus: 'unverified',
  canCopyOnce: false,
  copyStatus: 'idle',
};

/**
 * Validates a candidate 32-byte hexadecimal certifier secret string.
 * Returns normalized 64-char lowercase hex string.
 * Throws clean error if invalid without returning secret contents.
 */
export function validateCertifierSecretHex(hex: unknown): string {
  if (typeof hex !== 'string') {
    throw new Error('Secret must be a hexadecimal string.');
  }
  const trimmed = hex.trim();
  if (trimmed.length !== 64) {
    throw new Error(`Secret must be exactly 32 bytes (64 hex characters), received ${trimmed.length} characters.`);
  }
  if (!isHex(trimmed, 32)) {
    throw new Error('Secret contains invalid non-hexadecimal characters.');
  }
  return trimmed.toLowerCase();
}

/**
 * Converts a validated 32-byte hex certifier secret string to a Uint8Array.
 */
export function parseCertifierSecretHex(hex: unknown): Uint8Array {
  const validated = validateCertifierSecretHex(hex);
  return hexToBytes(validated);
}

/**
 * Generates a fresh 32-byte cryptographically secure random certifier secret.
 */
export function generateCertifierSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Validates an unencrypted CertifierBackupPackage payload before envelope encryption or after decryption.
 */
export function validateCertifierBackupPackage(pkg: unknown): CertifierBackupPackage {
  if (!pkg || typeof pkg !== 'object') {
    throw new Error('Certifier backup package must be an object.');
  }
  const p = pkg as Record<string, unknown>;
  if (p.schema !== CERTIFIER_BACKUP_SCHEMA) {
    throw new Error(`Invalid backup schema: expected '${CERTIFIER_BACKUP_SCHEMA}'.`);
  }
  if (p.role !== 'certifier') {
    throw new Error("Invalid backup role: expected 'certifier'.");
  }
  const validatedSecret = validateCertifierSecretHex(p.certifierSecret);
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('Backup createdAt must be a valid ISO timestamp.');
  }
  return {
    schema: CERTIFIER_BACKUP_SCHEMA,
    role: 'certifier',
    certifierSecret: validatedSecret,
    createdAt: p.createdAt as string,
  };
}

/**
 * Creates an unencrypted CertifierBackupPackage from an active 32-byte secret.
 */
export function buildCertifierBackupPackage(
  secretBytes: Uint8Array,
  options?: { now?: Date },
): CertifierBackupPackage {
  if (!(secretBytes instanceof Uint8Array) || secretBytes.length !== 32) {
    throw new Error('Secret bytes must be a 32-byte Uint8Array.');
  }
  const now = options?.now ?? new Date();
  return {
    schema: CERTIFIER_BACKUP_SCHEMA,
    role: 'certifier',
    certifierSecret: bytesToHex(secretBytes),
    createdAt: now.toISOString(),
  };
}

/**
 * Builds a public CertifierKeyPackage from a derived 32-byte certifier public key.
 * Never includes the private secret. Rejects all-zero public keys.
 */
export function buildCertifierKeyPackage(
  certifierPublicKeyBytes: Uint8Array,
  options?: { now?: Date },
): CertifierKeyPackage {
  if (!(certifierPublicKeyBytes instanceof Uint8Array) || certifierPublicKeyBytes.length !== 32) {
    throw new Error('Certifier public key must be a 32-byte Uint8Array.');
  }
  const hex = bytesToHex(certifierPublicKeyBytes);
  if (hex === '00'.repeat(32)) {
    throw new Error('Certifier public key cannot be a zero key.');
  }
  const now = options?.now ?? new Date();
  return {
    schema: CERTIFIER_KEY_SCHEMA,
    certifierKey: hex,
    createdAt: now.toISOString(),
  };
}

/**
 * Zeroizes a Uint8Array in memory.
 */
export function zeroizeBytes(bytes?: Uint8Array | null): void {
  if (bytes && bytes instanceof Uint8Array) {
    bytes.fill(0);
  }
}

/**
 * Pure state reducer when a fresh secret is created or imported directly.
 * Grants a one-time copy opportunity.
 */
export function onSecretGeneratedOrImported(
  prevState: RegistrarSecretUiState,
): RegistrarSecretUiState {
  return {
    ...prevState,
    hasSecret: true,
    isLocked: false,
    verificationStatus: 'unverified',
    canCopyOnce: true,
    copyStatus: 'idle',
  };
}

/**
 * Pure state reducer when a secret is restored from an encrypted backup.
 * Restored backups NEVER enable plaintext copying or revealing.
 */
export function onSecretRestoredFromBackup(
  prevState: RegistrarSecretUiState,
): RegistrarSecretUiState {
  return {
    ...prevState,
    hasSecret: true,
    isLocked: false,
    verificationStatus: 'unverified',
    canCopyOnce: false, // Invariant: Restored backups cannot be copied in plaintext
    copyStatus: 'idle',
  };
}

/**
 * Pure state reducer when a copy attempt is synchronously initiated.
 * Immediately reserves the attempt, transitions copyStatus to 'pending',
 * and prevents any concurrent copy execution.
 */
export function onCopyAttemptInitiated(
  prevState: RegistrarSecretUiState,
): RegistrarSecretUiState {
  if (!prevState.hasSecret || !prevState.canCopyOnce || prevState.copyStatus === 'pending') {
    return prevState;
  }
  return {
    ...prevState,
    copyStatus: 'pending',
  };
}

/**
 * Pure state reducer when a copy attempt succeeds or fails.
 */
export function onCopyAttemptResult(
  prevState: RegistrarSecretUiState,
  success: boolean,
): RegistrarSecretUiState {
  // If the state was reset (no secret, locked) or the matching operation is not pending, do not mutate
  if (!prevState.hasSecret || prevState.isLocked || prevState.copyStatus !== 'pending') {
    return prevState;
  }
  if (success) {
    return {
      ...prevState,
      canCopyOnce: false, // Permanently consumed
      copyStatus: 'copied',
    };
  }
  return {
    ...prevState,
    canCopyOnce: true, // Remains eligible for retry on failure
    copyStatus: 'failed',
  };
}

/**
 * Pure state reducer when session is locked, disconnected, or address changes.
 * Immediately purges any copy or reveal capability and resets verification.
 */
export function onSecretClearedOrLocked(
  prevState: RegistrarSecretUiState,
  isLocked: boolean = false,
): RegistrarSecretUiState {
  return {
    hasSecret: false,
    isLocked,
    verificationStatus: 'unverified',
    canCopyOnce: false,
    copyStatus: 'idle',
  };
}

/**
 * Pure sanitizer for registrar operation errors.
 * Never leaks raw Web Crypto, FileReader, JSON parse, stack traces, URLs, or exception messages.
 */
export function mapRegistrarOperationError(error: unknown): string {
  if (!error) {
    return 'The operation could not be completed. Check the input and try again.';
  }

  const raw = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof (error as any)?.message === 'string'
          ? (error as any).message
          : ''
  ).toLowerCase();

  if (raw.includes('64 hex characters') || raw.includes('exactly 32 bytes')) {
    return 'Secret must be exactly 32 bytes (64 hexadecimal characters).';
  }
  if (raw.includes('non-hex') || raw.includes('hexadecimal')) {
    return 'Secret contains invalid non-hexadecimal characters.';
  }
  if (raw.includes('passphrase') && (raw.includes('12') || raw.includes('length'))) {
    return 'Passphrase must be at least 12 characters.';
  }
  if (
    raw.includes('incorrect passphrase') ||
    raw.includes('tampered') ||
    raw.includes('decrypt') ||
    raw.includes('crypto') ||
    raw.includes('operationerror') ||
    raw.includes('tag mismatch') ||
    raw.includes('aes')
  ) {
    return 'Decryption failed. Check the passphrase or verify the backup file.';
  }
  if (raw.includes('json') || raw.includes('backup file') || raw.includes('schema') || raw.includes('package')) {
    return 'The selected file is not a valid CommonVeil encrypted backup.';
  }
  if (raw.includes('read') || raw.includes('file')) {
    return 'Could not read the selected backup file.';
  }
  if (raw.includes('attach')) {
    return 'Attach to a verified CommonVeil contract before verifying registrar identity.';
  }
  if (raw.includes('copy') || raw.includes('clipboard')) {
    return 'Clipboard write failed. Please check browser permissions and try again.';
  }
  if (raw.includes('certifier public key') || raw.includes('zero key') || raw.includes('certifier-key')) {
    return 'Invalid Certifier public key package. Key must be a genuine non-zero 32-byte hex key.';
  }

  return 'The operation could not be completed. Check the input and try again.';
}

/**
 * Pure sanitizer for certifier operation errors.
 * Never leaks raw Web Crypto, FileReader, JSON parse, stack traces, URLs, or exception messages.
 */
export function mapCertifierOperationError(error: unknown): string {
  if (!error) {
    return 'The certifier operation could not be completed. Check the input and try again.';
  }

  const raw = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof (error as any)?.message === 'string'
          ? (error as any).message
          : ''
  ).toLowerCase();

  if (raw.includes('64 hex characters') || raw.includes('exactly 32 bytes')) {
    return 'Certifier secret must be exactly 32 bytes (64 hexadecimal characters).';
  }
  if (raw.includes('non-hex') || raw.includes('hexadecimal')) {
    return 'Certifier secret contains invalid non-hexadecimal characters.';
  }
  if (raw.includes('passphrase') && (raw.includes('12') || raw.includes('length'))) {
    return 'Passphrase must be at least 12 characters.';
  }
  if (
    raw.includes('incorrect passphrase') ||
    raw.includes('tampered') ||
    raw.includes('decrypt') ||
    raw.includes('crypto') ||
    raw.includes('operationerror') ||
    raw.includes('tag mismatch') ||
    raw.includes('aes')
  ) {
    return 'Decryption failed. Check the passphrase or verify the backup file.';
  }
  if (raw.includes('json') || raw.includes('backup file') || raw.includes('schema') || raw.includes('package')) {
    return 'The selected file is not a valid CommonVeil encrypted backup.';
  }
  if (raw.includes('read') || raw.includes('file')) {
    return 'Could not read the selected backup file.';
  }
  if (raw.includes('copy') || raw.includes('clipboard')) {
    return 'Clipboard write failed. Please check browser permissions and try again.';
  }
  if (raw.includes('zero key')) {
    return 'Certifier key cannot be an all-zero key.';
  }

  return 'The certifier operation could not be completed. Check the input and try again.';
}

export const DEPLOYMENT_RECEIPT_SCHEMA = 'commonveil.deployment-receipt/v1' as const;

export interface DeploymentReceipt {
  readonly schema: typeof DEPLOYMENT_RECEIPT_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly deploymentTxId: string | null;
  readonly registrarPublicKey: string;
  readonly certifierPublicKey: string;
  readonly deployedAt: string;
  readonly status: 'finalized';
}

/**
 * Validates a deployment receipt structure.
 * Enforces schema, network preprod, 64-char hex keys, and valid ISO timestamp.
 * Strictly verifies no private secrets, seed phrases, or passphrases are present.
 */
export function validateDeploymentReceipt(receipt: unknown): DeploymentReceipt {
  if (!receipt || typeof receipt !== 'object') {
    throw new Error('Deployment receipt must be an object.');
  }
  const r = receipt as Record<string, unknown>;

  // Reject any private secret or credential fields
  const forbiddenKeys = [
    'secret',
    'adminSecret',
    'registrarSecret',
    'certifierSecret',
    'memberSecret',
    'privateKey',
    'seed',
    'passphrase',
    'salt',
    'inventory',
    'backup',
  ];
  for (const key of Object.keys(r)) {
    const lower = key.toLowerCase();
    if (forbiddenKeys.some((f) => lower.includes(f.toLowerCase()))) {
      throw new Error(`Deployment receipt contains forbidden sensitive property '${key}'.`);
    }
  }

  if (r.schema !== DEPLOYMENT_RECEIPT_SCHEMA) {
    throw new Error(`Invalid receipt schema: expected '${DEPLOYMENT_RECEIPT_SCHEMA}'.`);
  }
  if (r.network !== 'preprod') {
    throw new Error("Invalid receipt network: expected 'preprod'.");
  }
  if (typeof r.contractAddress !== 'string' || !r.contractAddress.trim()) {
    throw new Error('Receipt contractAddress must be a non-empty string.');
  }
  if (r.deploymentTxId !== null && typeof r.deploymentTxId !== 'string') {
    throw new Error('Receipt deploymentTxId must be a string or null.');
  }
  if (
    typeof r.registrarPublicKey !== 'string' ||
    !isHex(r.registrarPublicKey) ||
    r.registrarPublicKey.length !== 64
  ) {
    throw new Error('Receipt registrarPublicKey must be a 64-character hexadecimal string.');
  }
  if (
    typeof r.certifierPublicKey !== 'string' ||
    !isHex(r.certifierPublicKey) ||
    r.certifierPublicKey.length !== 64
  ) {
    throw new Error('Receipt certifierPublicKey must be a 64-character hexadecimal string.');
  }
  if (r.certifierPublicKey.toLowerCase() === '00'.repeat(32)) {
    throw new Error('Receipt certifierPublicKey cannot be a zero key.');
  }
  if (!isValidIsoTimestamp(r.deployedAt)) {
    throw new Error('Receipt deployedAt must be a valid ISO timestamp.');
  }
  if (r.status !== 'finalized') {
    throw new Error("Receipt status must be 'finalized'.");
  }

  return {
    schema: DEPLOYMENT_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: r.contractAddress.trim(),
    deploymentTxId: r.deploymentTxId ? (r.deploymentTxId as string).trim() : null,
    registrarPublicKey: r.registrarPublicKey.toLowerCase(),
    certifierPublicKey: r.certifierPublicKey.toLowerCase(),
    deployedAt: r.deployedAt as string,
    status: 'finalized',
  };
}

export type DeploymentStage =
  | 'idle'
  | 'confirming'
  | 'requesting-wallet'
  | 'deploying'
  | 'finalized-indexing'
  | 'deployed'
  | 'failed'
  | 'cancelled';

export interface RegistrarDeploymentUiState {
  readonly stage: DeploymentStage;
  readonly backupConfirmed: boolean;
  readonly certifierPublicKey: string | null;
  readonly contractAddress: string | null;
  readonly deploymentTxId: string | null;
  readonly receipt: DeploymentReceipt | null;
  readonly errorMessage: string | null;
}

export const INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE: RegistrarDeploymentUiState = {
  stage: 'idle',
  backupConfirmed: false,
  certifierPublicKey: null,
  contractAddress: null,
  deploymentTxId: null,
  receipt: null,
  errorMessage: null,
};

/**
 * Pure helper checking if the registrar deployment flow can be initiated.
 * Requires:
 * - Connected 1AM wallet on Midnight Preprod
 * - Active Registrar secret in volatile memory
 * - Confirmed encrypted Registrar backup
 * - Imported and validated non-zero Certifier public-key package (32-byte hex)
 * - Proof provider configured
 * - No active deployment in progress
 */
export function canInitiateDeployment(params: {
  readonly isConnected: boolean;
  readonly hasSecret: boolean;
  readonly backupConfirmed: boolean;
  readonly isDeploying: boolean;
  readonly proofProviderAvailable: boolean;
  readonly certifierPublicKey: string | null;
}): boolean {
  const isNonZeroCertifierKey =
    typeof params.certifierPublicKey === 'string' &&
    isHex(params.certifierPublicKey, 32) &&
    params.certifierPublicKey.toLowerCase() !== '00'.repeat(32);

  return (
    params.isConnected &&
    params.hasSecret &&
    params.backupConfirmed &&
    !params.isDeploying &&
    params.proofProviderAvailable &&
    isNonZeroCertifierKey
  );
}

/**
 * Pure state reducer when a validated Certifier public key package is imported by the Registrar.
 * Stores only the public key string in Registrar UI state.
 * Never stores or touches any Certifier secret.
 */
export function onCertifierKeyImported(
  prevState: RegistrarDeploymentUiState,
  certifierPublicKeyHex: string,
): RegistrarDeploymentUiState {
  const validated = certifierPublicKeyHex.trim().toLowerCase();
  if (!isHex(validated, 32)) {
    throw new Error('Certifier public key must be exactly 32 hexadecimal bytes.');
  }
  if (validated === '00'.repeat(32)) {
    throw new Error('Certifier public key cannot be a zero key.');
  }
  return {
    ...prevState,
    certifierPublicKey: validated,
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment confirmation dialog is opened.
 */
export function onDeploymentConfirmOpen(
  prevState: RegistrarDeploymentUiState,
): RegistrarDeploymentUiState {
  if (
    prevState.stage === 'deploying' ||
    prevState.stage === 'requesting-wallet' ||
    prevState.stage === 'finalized-indexing'
  ) {
    return prevState;
  }
  return {
    ...prevState,
    stage: 'confirming',
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment confirmation is dismissed.
 */
export function onDeploymentConfirmCancel(
  prevState: RegistrarDeploymentUiState,
): RegistrarDeploymentUiState {
  if (prevState.stage !== 'confirming') {
    return prevState;
  }
  return {
    ...prevState,
    stage: 'idle',
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment is initiated and waiting for 1AM wallet approval.
 */
export function onDeploymentWalletRequest(
  prevState: RegistrarDeploymentUiState,
): RegistrarDeploymentUiState {
  return {
    ...prevState,
    stage: 'requesting-wallet',
    errorMessage: null,
  };
}

/**
 * Pure state reducer when wallet approves and on-chain submission/proving begins.
 */
export function onDeploymentSubmitting(
  prevState: RegistrarDeploymentUiState,
): RegistrarDeploymentUiState {
  return {
    ...prevState,
    stage: 'deploying',
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment transaction finalizes on-chain,
 * but indexer synchronization is still pending.
 */
export function onDeploymentFinalizedIndexing(
  prevState: RegistrarDeploymentUiState,
  params: {
    readonly contractAddress: string;
    readonly deploymentTxId: string | null;
  },
): RegistrarDeploymentUiState {
  return {
    ...prevState,
    stage: 'finalized-indexing',
    contractAddress: params.contractAddress,
    deploymentTxId: params.deploymentTxId,
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment finalizes, ledger is verified, and receipt is created.
 */
export function onDeploymentCompleted(
  prevState: RegistrarDeploymentUiState,
  receipt: DeploymentReceipt,
): RegistrarDeploymentUiState {
  return {
    ...prevState,
    stage: 'deployed',
    contractAddress: receipt.contractAddress,
    deploymentTxId: receipt.deploymentTxId,
    receipt,
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment is explicitly cancelled in the wallet.
 */
export function onDeploymentCancelled(
  prevState: RegistrarDeploymentUiState,
): RegistrarDeploymentUiState {
  return {
    ...prevState,
    stage: 'cancelled',
    errorMessage: null,
  };
}

/**
 * Pure state reducer when deployment encounters an error.
 */
export function onDeploymentFailed(
  prevState: RegistrarDeploymentUiState,
  errorMessage: string,
): RegistrarDeploymentUiState {
  return {
    ...prevState,
    stage: 'failed',
    errorMessage,
  };
}

/**
 * Pure state reducer when resetting deployment state (e.g. after address change or disconnect).
 */
export function onDeploymentReset(
  prevState: RegistrarDeploymentUiState,
): RegistrarDeploymentUiState {
  return {
    ...INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE,
    backupConfirmed: prevState.backupConfirmed,
    certifierPublicKey: prevState.certifierPublicKey,
  };
}

/**
 * Pure error sanitizer for contract deployment operations.
 * Never leaks raw endpoints, stack traces, tokens, or connector internals.
 */
export function mapDeploymentError(error: unknown): string {
  if (!error) {
    return 'The deployment transaction could not be completed. Check the network connection and try again.';
  }

  const raw = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof (error as any)?.message === 'string'
          ? (error as any).message
          : ''
  ).toLowerCase();

  if (
    raw.includes('cancel') ||
    raw.includes('reject') ||
    raw.includes('denied') ||
    raw.includes('declined') ||
    raw.includes('user aborted')
  ) {
    return 'Deployment transaction was cancelled in 1AM.';
  }

  if (raw.includes('dust') || raw.includes('balance') || raw.includes('insufficient funds')) {
    return 'Insufficient DUST or balance in connected 1AM wallet to cover deployment fees.';
  }

  if (raw.includes('proof') || raw.includes('prover') || raw.includes('proving')) {
    return 'ZK proof generation failed. Ensure your local proof server is reachable and responsive.';
  }

  if (raw.includes('indexer') || raw.includes('lookup')) {
    return 'Contract finalized on-chain, but indexer synchronization is delayed. Use retry inspection.';
  }

  if (raw.includes('timeout') || raw.includes('deadline')) {
    return 'Transaction submission timed out. Check network status and wallet activity.';
  }

  if (raw.includes('network') || raw.includes('preprod') || raw.includes('connection')) {
    return 'Network communication failure during deployment. Check Midnight Preprod connectivity.';
  }

  return 'The deployment transaction could not be completed. Check the network connection and try again.';
}
