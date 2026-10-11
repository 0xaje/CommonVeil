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
  MEMBER_ADMISSION_SCHEMA,
  type MemberAdmissionPackage,
  validateMemberAdmissionPackage,
  INVENTORY_REPORT_SCHEMA,
  CERTIFICATION_REQUEST_SCHEMA,
  type CertificationRequestPackage,
  validateCertificationRequestPackage,
  type ValidatedLiveInventoryReport,
  validateLiveInventoryReport,
  buildCertificationRequestPackage,
  assertNoSensitiveFields,
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

/**
 * Safely triggers a browser file download from a Blob or JSON string,
 * appending the anchor temporarily to the DOM, invoking .click(), removing it,
 * and asynchronously revoking the object URL after the browser has begun processing.
 * Does not create persistent storage.
 */
export function triggerBlobDownload(
  blobOrText: Blob | string,
  filename: string,
  mimeType: string = 'application/json',
  revokeDelayMs: number = 60_000,
): () => void {
  const blob = typeof blobOrText === 'string'
    ? new Blob([blobOrText], { type: mimeType })
    : blobOrText;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Safely defer revocation so browser download queue processes the blob
  const timer = setTimeout(() => {
    URL.revokeObjectURL(url);
  }, revokeDelayMs);

  return () => {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  };
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

export type BackupRecoveryStatus = 'none' | 'created-untested' | 'recovery-tested';

/**
 * Checks whether a password starts or ends with whitespace.
 * Returns true if whitespace warning is applicable.
 */
export function hasPasswordWhitespaceWarning(password: string): boolean {
  return /^\s|\s$/.test(password);
}

/**
 * Validates password and confirmation match.
 * Enforces minimum 12 characters and exact match.
 */
export function validatePasswordConfirmation(password: string, confirmation: string): { valid: boolean; error: string | null } {
  if (password.length < 12) {
    return { valid: false, error: 'Passphrase must be at least 12 characters.' };
  }
  if (password !== confirmation) {
    return { valid: false, error: 'Password confirmation does not match.' };
  }
  return { valid: true, error: null };
}

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
  readonly backupRecoveryStatus: BackupRecoveryStatus;
}

export const INITIAL_REGISTRAR_SECRET_UI_STATE: RegistrarSecretUiState = {
  hasSecret: false,
  isLocked: false,
  verificationStatus: 'unverified',
  canCopyOnce: false,
  copyStatus: 'idle',
  backupRecoveryStatus: 'none',
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
  readonly backupRecoveryStatus: BackupRecoveryStatus;
}

export const INITIAL_CERTIFIER_SECRET_UI_STATE: CertifierSecretUiState = {
  hasSecret: false,
  isLocked: false,
  verificationStatus: 'unverified',
  canCopyOnce: false,
  copyStatus: 'idle',
  backupRecoveryStatus: 'none',
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

export const MEMBER_BACKUP_SCHEMA = 'commonveil.member-backup/v1' as const;

export interface MemberBackupPackage {
  readonly schema: typeof MEMBER_BACKUP_SCHEMA;
  readonly role: 'member';
  readonly memberSecret: string; // 32-byte hex (64 chars)
  readonly memberSalt: string;   // 32-byte hex (64 chars)
  readonly createdAt: string;    // ISO timestamp
}

export type MemberVerificationStatus = 'unverified' | 'verified' | 'failed';

export interface MemberSecretUiState {
  readonly hasSecret: boolean;
  readonly isLocked: boolean;
  readonly verificationStatus: MemberVerificationStatus;
  readonly memberCredentialHex: string | null; // shortened derived credential or 64-char hex
  readonly canCopyOnce: boolean;
  readonly copyStatus: 'idle' | 'pending' | 'copied' | 'failed';
  readonly backupRecoveryStatus: BackupRecoveryStatus;
}

export const INITIAL_MEMBER_SECRET_UI_STATE: MemberSecretUiState = {
  hasSecret: false,
  isLocked: false,
  verificationStatus: 'unverified',
  memberCredentialHex: null,
  canCopyOnce: false,
  copyStatus: 'idle',
  backupRecoveryStatus: 'none',
};

/**
 * Validates a candidate 32-byte hexadecimal member secret or salt string.
 * Returns normalized 64-char lowercase hex string.
 * Throws clean error if invalid without returning secret contents.
 */
export function validateMemberSecretOrSaltHex(hex: unknown, label: string = 'Value'): string {
  if (typeof hex !== 'string') {
    throw new Error(`${label} must be a hexadecimal string.`);
  }
  const trimmed = hex.trim();
  if (trimmed.length !== 64) {
    throw new Error(`${label} must be exactly 32 bytes (64 hex characters), received ${trimmed.length} characters.`);
  }
  if (!isHex(trimmed, 32)) {
    throw new Error(`${label} contains invalid non-hexadecimal characters.`);
  }
  return trimmed.toLowerCase();
}

/**
 * Converts a validated 32-byte hex string to Uint8Array.
 */
export function parseMemberSecretOrSaltHex(hex: unknown, label: string = 'Value'): Uint8Array {
  const validated = validateMemberSecretOrSaltHex(hex, label);
  return hexToBytes(validated);
}

/**
 * Generates a fresh 32-byte cryptographically secure random member secret or salt.
 */
export function generateMemberSecretOrSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Validates an unencrypted MemberBackupPackage payload before envelope encryption or after decryption.
 */
export function validateMemberBackupPackage(pkg: unknown): MemberBackupPackage {
  if (!pkg || typeof pkg !== 'object') {
    throw new Error('Member backup package must be an object.');
  }
  const p = pkg as Record<string, unknown>;
  if (p.schema !== MEMBER_BACKUP_SCHEMA) {
    throw new Error(`Invalid backup schema: expected '${MEMBER_BACKUP_SCHEMA}'.`);
  }
  if (p.role !== 'member') {
    throw new Error("Invalid backup role: expected 'member'.");
  }
  const validatedSecret = validateMemberSecretOrSaltHex(p.memberSecret, 'Member secret');
  const validatedSalt = validateMemberSecretOrSaltHex(p.memberSalt, 'Member salt');
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('Backup createdAt must be a valid ISO timestamp.');
  }
  return {
    schema: MEMBER_BACKUP_SCHEMA,
    role: 'member',
    memberSecret: validatedSecret,
    memberSalt: validatedSalt,
    createdAt: p.createdAt as string,
  };
}

/**
 * Creates an unencrypted MemberBackupPackage from active 32-byte secret and salt.
 */
export function buildMemberBackupPackage(
  secretBytes: Uint8Array,
  saltBytes: Uint8Array,
  options?: { now?: Date },
): MemberBackupPackage {
  if (!(secretBytes instanceof Uint8Array) || secretBytes.length !== 32) {
    throw new Error('Member secret bytes must be a 32-byte Uint8Array.');
  }
  if (!(saltBytes instanceof Uint8Array) || saltBytes.length !== 32) {
    throw new Error('Member salt bytes must be a 32-byte Uint8Array.');
  }
  const now = options?.now ?? new Date();
  return {
    schema: MEMBER_BACKUP_SCHEMA,
    role: 'member',
    memberSecret: bytesToHex(secretBytes),
    memberSalt: bytesToHex(saltBytes),
    createdAt: now.toISOString(),
  };
}

/**
 * Builds a MemberAdmissionPackage from attached contract address and derived credential bytes.
 * Validates strictly that no secret or salt is included.
 */
export function buildMemberAdmissionPackage(
  contractAddress: string,
  memberCredentialBytes: Uint8Array,
  options?: { now?: Date },
): MemberAdmissionPackage {
  if (typeof contractAddress !== 'string' || !contractAddress.trim()) {
    throw new Error('Contract address must be a non-empty string.');
  }
  if (!(memberCredentialBytes instanceof Uint8Array) || memberCredentialBytes.length !== 32) {
    throw new Error('Member credential must be a 32-byte Uint8Array.');
  }
  const hex = bytesToHex(memberCredentialBytes);
  const now = options?.now ?? new Date();
  const pkg: MemberAdmissionPackage = {
    schema: 'commonveil.member-admission/v1',
    contractAddress: contractAddress.trim(),
    memberCredential: hex,
    createdAt: now.toISOString(),
  };
  return validateMemberAdmissionPackage(pkg);
}

/**
 * Pure state reducer when member secret and salt are generated or imported directly.
 */
export function onMemberSecretGeneratedOrImported(
  prevState: MemberSecretUiState,
  memberCredentialHex: string,
): MemberSecretUiState {
  return {
    ...prevState,
    hasSecret: true,
    isLocked: false,
    verificationStatus: 'unverified',
    memberCredentialHex,
    canCopyOnce: true,
    copyStatus: 'idle',
    backupRecoveryStatus: 'none',
  };
}

/**
 * Pure state reducer when member secret and salt are restored from an encrypted backup.
 * Restored backups NEVER enable plaintext copying.
 */
export function onMemberSecretRestoredFromBackup(
  prevState: MemberSecretUiState,
  memberCredentialHex: string,
): MemberSecretUiState {
  return {
    ...prevState,
    hasSecret: true,
    isLocked: false,
    verificationStatus: 'unverified',
    memberCredentialHex,
    canCopyOnce: false,
    copyStatus: 'idle',
    backupRecoveryStatus: 'recovery-tested',
  };
}

/**
 * Pure state reducer when member session is locked, disconnected, or role changes.
 */
export function onMemberSecretClearedOrLocked(
  prevState: MemberSecretUiState,
  isLocked: boolean = false,
): MemberSecretUiState {
  return {
    hasSecret: false,
    isLocked,
    verificationStatus: 'unverified',
    memberCredentialHex: null,
    canCopyOnce: false,
    copyStatus: 'idle',
    backupRecoveryStatus: 'none',
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
export function onSecretGeneratedOrImported<T extends RegistrarSecretUiState | CertifierSecretUiState>(
  prevState: T,
): T {
  return {
    ...prevState,
    hasSecret: true,
    isLocked: false,
    verificationStatus: 'unverified',
    canCopyOnce: true,
    copyStatus: 'idle',
    backupRecoveryStatus: 'none',
  };
}

/**
 * Pure state reducer when a secret is restored from an encrypted backup.
 * Restored backups NEVER enable plaintext copying or revealing.
 */
export function onSecretRestoredFromBackup<T extends RegistrarSecretUiState | CertifierSecretUiState>(
  prevState: T,
): T {
  return {
    ...prevState,
    hasSecret: true,
    isLocked: false,
    verificationStatus: 'unverified',
    canCopyOnce: false, // Invariant: Restored backups cannot be copied in plaintext
    copyStatus: 'idle',
    backupRecoveryStatus: 'recovery-tested',
  };
}

/**
 * Pure state reducer when a backup is exported and downloaded.
 * Marks the backup as created but not yet recovery-tested.
 */
export function onBackupExported<T extends { readonly backupRecoveryStatus: BackupRecoveryStatus }>(
  prevState: T,
): T {
  return {
    ...prevState,
    backupRecoveryStatus: 'created-untested',
  };
}

/**
 * Pure state reducer when a downloaded backup file passes the independent recovery test.
 * Marks the backup as fully recovery-tested.
 */
export function onBackupRecoveryTested<T extends { readonly backupRecoveryStatus: BackupRecoveryStatus }>(
  prevState: T,
): T {
  return {
    ...prevState,
    backupRecoveryStatus: 'recovery-tested',
  };
}

/**
 * Pure state reducer when a copy attempt is synchronously initiated.
 * Immediately reserves the attempt, transitions copyStatus to 'pending',
 * and prevents any concurrent copy execution.
 */
export function onCopyAttemptInitiated<T extends RegistrarSecretUiState | CertifierSecretUiState>(
  prevState: T,
): T {
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
export function onCopyAttemptResult<T extends RegistrarSecretUiState | CertifierSecretUiState>(
  prevState: T,
  success: boolean,
): T {
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
export function onSecretClearedOrLocked<T extends RegistrarSecretUiState | CertifierSecretUiState>(
  prevState: T,
  isLocked: boolean = false,
): T {
  return {
    ...prevState,
    hasSecret: false,
    isLocked,
    verificationStatus: 'unverified',
    canCopyOnce: false,
    copyStatus: 'idle',
    backupRecoveryStatus: 'none',
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

/**
 * Builds a CertifierKeyPackage from a 32-byte public key.
 */
export function buildCertifierKeyPackage(
  certifierKeyBytes: Uint8Array,
  options?: { now?: Date },
): CertifierKeyPackage {
  if (!(certifierKeyBytes instanceof Uint8Array) || certifierKeyBytes.length !== 32) {
    throw new Error('Certifier key bytes must be a 32-byte Uint8Array.');
  }
  const hex = bytesToHex(certifierKeyBytes);
  if (hex === '0'.repeat(64)) {
    throw new Error('Certifier key cannot be an all-zero key.');
  }
  const now = options?.now ?? new Date();
  const raw = {
    schema: CERTIFIER_KEY_SCHEMA,
    certifierKey: hex,
    createdAt: now.toISOString(),
  };
  return validateCertifierKeyPackage(raw);
}

/**
 * Pure sanitizer for member operation errors.
 * Never leaks raw Web Crypto, FileReader, JSON parse, stack traces, URLs, or exception messages.
 */
export function mapMemberOperationError(error: unknown): string {
  if (!error) {
    return 'The member operation could not be completed. Check the input and try again.';
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
    return 'Secret and salt values must be exactly 32 bytes (64 hexadecimal characters).';
  }
  if (raw.includes('non-hex') || raw.includes('hexadecimal')) {
    return 'Values contain invalid non-hexadecimal characters.';
  }
  if (raw.includes('distinct') || raw.includes('independent') || raw.includes('not identical')) {
    return 'Member secret and member salt must be distinct and independent values.';
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
  if (raw.includes('attach')) {
    return 'Attach to a verified CommonVeil contract before exporting an admission package.';
  }

  return 'The member operation could not be completed. Check the input and try again.';
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
  readonly backupRecoveryStatus: BackupRecoveryStatus;
  readonly isDeploying: boolean;
  readonly proofProviderAvailable: boolean;
  readonly certifierPublicKey: string | null;
}): boolean {
  const isNonZeroCertifierKey =
    typeof params.certifierPublicKey === 'string' &&
    isHex(params.certifierPublicKey, 32) &&
    params.certifierPublicKey.toLowerCase() !== '00'.repeat(32);

  const isRecoveryTested = params.backupRecoveryStatus === 'recovery-tested';

  return (
    params.isConnected &&
    params.hasSecret &&
    params.backupConfirmed &&
    isRecoveryTested &&
    !params.isDeploying &&
    params.proofProviderAvailable &&
    isNonZeroCertifierKey
  );
}

/**
 * Pure helper checking if Member admission package export can be initiated.
 * Requires active identity in session memory, attached contract address,
 * and recovery-tested backup.
 */
export function canExportMemberAdmissionPackage(params: {
  readonly hasSecret: boolean;
  readonly attachedContractAddress: string | null;
  readonly backupRecoveryStatus: BackupRecoveryStatus;
}): boolean {
  return (
    params.hasSecret &&
    typeof params.attachedContractAddress === 'string' &&
    params.attachedContractAddress.trim().length > 0 &&
    params.backupRecoveryStatus === 'recovery-tested'
  );
}

/**
 * Pure helper checking if Certifier public key package export can be initiated.
 * Requires active certifier secret and recovery-tested backup.
 */
export function canExportCertifierKeyPackage(params: {
  readonly hasSecret: boolean;
  readonly backupRecoveryStatus: BackupRecoveryStatus;
}): boolean {
  return params.hasSecret && params.backupRecoveryStatus === 'recovery-tested';
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

/**
 * Fixed safe messages for post-deployment verification and retry inspection.
 * Never leaks stack traces, endpoints, raw decoder errors, tokens, or connector internals.
 */
export const DEPLOYMENT_VERIFICATION_ERROR_MESSAGES = {
  INCOMPATIBLE_CONTRACT: 'The contract at this address does not expose a compatible CommonVeil ledger.',
  REGISTRAR_KEY_MISMATCH: 'Deployed contract registrar public key does not match the active registrar secret.',
  GENERIC_VERIFICATION_FAILURE: 'Contract deployment verification failed. Check the network status and try again.',
} as const;

/**
 * Sanitizes errors encountered during the post-deployment verification inspection.
 * Maps ContractSessionError codes to fixed safe messages.
 * Never passes raw error messages, URLs, or internal exceptions to UI state.
 */
export function mapDeploymentInspectionError(error: unknown): string {
  if (error instanceof ContractSessionError) {
    if (error.code === 'INCOMPATIBLE_CONTRACT') {
      const msg = error.message.toLowerCase();
      if (msg.includes('registrar') || msg.includes('secret') || msg.includes('key')) {
        return DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH;
      }
      return DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT;
    }
    return CONTRACT_SESSION_ERROR_MESSAGES[error.code] ?? DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE;
  }

  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code as ContractSessionErrorCode;
    if (code === 'INCOMPATIBLE_CONTRACT') {
      return DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT;
    }
    if (code in CONTRACT_SESSION_ERROR_MESSAGES) {
      return CONTRACT_SESSION_ERROR_MESSAGES[code];
    }
  }

  const raw = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  ).toLowerCase();

  if (raw.includes('registrar') && (raw.includes('mismatch') || raw.includes('key') || raw.includes('secret'))) {
    return DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH;
  }

  if (raw.includes('incompatible') || raw.includes('ledger') || raw.includes('decode')) {
    return DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT;
  }

  return DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE;
}

// ============================================================================
// Member Admission Receipt & Registrar Admission Workflow Pure Helpers
// ============================================================================

export const MEMBER_ADMISSION_RECEIPT_SCHEMA = 'commonveil.member-admission-receipt/v1' as const;

export interface MemberAdmissionReceipt {
  readonly schema: typeof MEMBER_ADMISSION_RECEIPT_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly admittedMemberCredential: string; // 32-byte hex (64 chars)
  readonly admissionTxId: string | null;     // genuine transaction id if captured, otherwise null
  readonly admittedAt: string;                // ISO timestamp
  readonly status: 'finalized';
}

export function validateMemberAdmissionReceipt(receipt: unknown): MemberAdmissionReceipt {
  if (!receipt || typeof receipt !== 'object') {
    throw new Error('Admission receipt must be an object.');
  }
  const r = receipt as Record<string, unknown>;
  if (r.schema !== MEMBER_ADMISSION_RECEIPT_SCHEMA) {
    throw new Error(`Invalid receipt schema: expected '${MEMBER_ADMISSION_RECEIPT_SCHEMA}'.`);
  }
  if (r.network !== 'preprod') {
    throw new Error("Invalid receipt network: expected 'preprod'.");
  }
  if (typeof r.contractAddress !== 'string' || !r.contractAddress.trim()) {
    throw new Error('Receipt contractAddress must be a non-empty string.');
  }
  if (!isHex(r.admittedMemberCredential, 32)) {
    throw new Error('admittedMemberCredential must be a 32-byte hex string (64 characters).');
  }
  if (r.admissionTxId !== null) {
    if (typeof r.admissionTxId !== 'string' || !r.admissionTxId.trim() || !isHex(r.admissionTxId.trim())) {
      throw new Error('admissionTxId must be a valid hex string or null.');
    }
  }
  if (!isValidIsoTimestamp(r.admittedAt)) {
    throw new Error('Receipt admittedAt must be a valid ISO timestamp.');
  }
  if (r.status !== 'finalized') {
    throw new Error("Receipt status must be 'finalized'.");
  }

  return {
    schema: MEMBER_ADMISSION_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: r.contractAddress.trim(),
    admittedMemberCredential: (r.admittedMemberCredential as string).toLowerCase(),
    admissionTxId: r.admissionTxId ? (r.admissionTxId as string).trim().toLowerCase() : null,
    admittedAt: r.admittedAt as string,
    status: 'finalized',
  };
}

export function buildMemberAdmissionReceipt(params: {
  contractAddress: string;
  memberCredential: string;
  admissionTxId?: string | null;
  now?: Date;
}): MemberAdmissionReceipt {
  const now = params.now ?? new Date();
  const rawReceipt = {
    schema: MEMBER_ADMISSION_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: params.contractAddress.trim(),
    admittedMemberCredential: params.memberCredential.trim().toLowerCase(),
    admissionTxId: params.admissionTxId ? params.admissionTxId.trim().toLowerCase() : null,
    admittedAt: now.toISOString(),
    status: 'finalized',
  };
  return validateMemberAdmissionReceipt(rawReceipt);
}

export type RegistrarAdmissionStage =
  | 'idle'
  | 'confirming'
  | 'requesting-wallet'
  | 'submitting'
  | 'finalized-indexing'
  | 'admitted'
  | 'failed'
  | 'cancelled';

export interface RegistrarAdmissionUiState {
  readonly stage: RegistrarAdmissionStage;
  readonly importedPackage: MemberAdmissionPackage | null;
  readonly admissionTxId: string | null;     // genuine transaction id preserved across indexer lag & retry
  readonly receipt: MemberAdmissionReceipt | null;
  readonly errorMessage: string | null;
}

export const INITIAL_REGISTRAR_ADMISSION_UI_STATE: RegistrarAdmissionUiState = {
  stage: 'idle',
  importedPackage: null,
  admissionTxId: null,
  receipt: null,
  errorMessage: null,
};

/**
 * Pure helper checking if member admission workflow or transaction submission can be initiated.
 * Requires all of:
 * - Connected 1AM wallet on Midnight Preprod
 * - Attached verified CommonVeil contract
 * - Active Registrar secret in volatile memory
 * - registrarUi.verificationStatus === 'verified'
 * - No admission transaction currently in progress
 */
export function canInitiateAdmission(params: {
  readonly isConnected: boolean;
  readonly attachedContractAddress: string | null;
  readonly hasSecret: boolean;
  readonly verificationStatus: RegistrarVerificationStatus;
  readonly isAdmitting: boolean;
}): boolean {
  return (
    params.isConnected &&
    typeof params.attachedContractAddress === 'string' &&
    params.attachedContractAddress.trim().length > 0 &&
    params.hasSecret &&
    params.verificationStatus === 'verified' &&
    !params.isAdmitting
  );
}

/**
 * Pure state reducer when a candidate admission package is imported and validated.
 * Requires:
 * - attachedContractAddress is present and matches the package contract address
 * - registrarVerificationStatus === 'verified'
 */
export function onAdmissionPackageImported(
  prevState: RegistrarAdmissionUiState,
  pkg: MemberAdmissionPackage,
  attachedContractAddress: string | null,
  registrarVerificationStatus?: RegistrarVerificationStatus,
): RegistrarAdmissionUiState {
  if (!attachedContractAddress) {
    return {
      ...prevState,
      importedPackage: null,
      admissionTxId: null,
      errorMessage: 'Attach to a verified CommonVeil contract before importing member admission packages.',
      stage: 'failed',
    };
  }
  if (registrarVerificationStatus && registrarVerificationStatus !== 'verified') {
    return {
      ...prevState,
      importedPackage: null,
      admissionTxId: null,
      errorMessage: 'Active Registrar secret must be verified against attached contract before importing admission packages.',
      stage: 'failed',
    };
  }
  if (pkg.contractAddress.trim() !== attachedContractAddress.trim()) {
    return {
      ...prevState,
      importedPackage: null,
      admissionTxId: null,
      errorMessage: 'Admission package contract address does not match the attached contract.',
      stage: 'failed',
    };
  }
  return {
    stage: 'confirming',
    importedPackage: pkg,
    admissionTxId: null,
    receipt: null,
    errorMessage: null,
  };
}

export function onAdmissionConfirmDismissed(
  prevState: RegistrarAdmissionUiState,
): RegistrarAdmissionUiState {
  return {
    ...prevState,
    stage: 'idle',
    errorMessage: null,
  };
}

export function onAdmissionWalletRequest(
  prevState: RegistrarAdmissionUiState,
): RegistrarAdmissionUiState {
  if (prevState.stage === 'requesting-wallet' || prevState.stage === 'submitting') {
    return prevState;
  }
  return {
    ...prevState,
    stage: 'requesting-wallet',
    errorMessage: null,
  };
}

export function onAdmissionSubmitting(
  prevState: RegistrarAdmissionUiState,
): RegistrarAdmissionUiState {
  return {
    ...prevState,
    stage: 'submitting',
    errorMessage: null,
  };
}

/**
 * Enters finalized-indexing while retaining any captured genuine transaction ID.
 * Never replaces an already-captured genuine txId with null.
 */
export function onAdmissionFinalizedIndexing(
  prevState: RegistrarAdmissionUiState,
  txId?: string | null,
): RegistrarAdmissionUiState {
  const resolvedTxId =
    typeof txId === 'string' && txId.trim() !== ''
      ? txId
      : prevState.admissionTxId;

  return {
    ...prevState,
    stage: 'finalized-indexing',
    admissionTxId: resolvedTxId,
    errorMessage: null,
  };
}

export function onAdmissionCompleted(
  prevState: RegistrarAdmissionUiState,
  receipt: MemberAdmissionReceipt,
): RegistrarAdmissionUiState {
  return {
    stage: 'admitted',
    importedPackage: prevState.importedPackage,
    admissionTxId: receipt.admissionTxId ?? prevState.admissionTxId,
    receipt,
    errorMessage: null,
  };
}

export function onAdmissionFailed(
  prevState: RegistrarAdmissionUiState,
  errorMessage: string,
  isCancelled: boolean = false,
): RegistrarAdmissionUiState {
  return {
    ...prevState,
    stage: isCancelled ? 'cancelled' : 'failed',
    errorMessage,
  };
}

export function onAdmissionReset(
  _prevState?: RegistrarAdmissionUiState,
): RegistrarAdmissionUiState {
  return INITIAL_REGISTRAR_ADMISSION_UI_STATE;
}

/**
 * Fixed safe error messages for post-finalization member admission inspection.
 */
export const ADMISSION_VERIFICATION_ERROR_MESSAGES = {
  INCOMPATIBLE_CONTRACT: 'The contract at this address does not expose a compatible CommonVeil ledger.',
  REGISTRAR_KEY_MISMATCH: 'Contract registrar public key does not match the active registrar secret.',
  GENERIC_VERIFICATION_FAILURE: 'Member admission verification failed. Check the network status and try again.',
} as const;

/**
 * Sanitizes errors encountered during post-admission verification inspection.
 * Maps ContractSessionError codes to fixed safe messages.
 * Never passes raw error messages, URLs, or internal exceptions to UI state.
 */
export function mapAdmissionInspectionError(error: unknown): string {
  if (error instanceof ContractSessionError) {
    if (error.code === 'INCOMPATIBLE_CONTRACT') {
      const msg = error.message.toLowerCase();
      if (msg.includes('registrar') || msg.includes('secret') || msg.includes('key')) {
        return ADMISSION_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH;
      }
      return ADMISSION_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT;
    }
    return CONTRACT_SESSION_ERROR_MESSAGES[error.code] ?? ADMISSION_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE;
  }

  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code as ContractSessionErrorCode;
    if (code === 'INCOMPATIBLE_CONTRACT') {
      return ADMISSION_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT;
    }
    if (code in CONTRACT_SESSION_ERROR_MESSAGES) {
      return CONTRACT_SESSION_ERROR_MESSAGES[code];
    }
  }

  const raw = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  ).toLowerCase();

  if (raw.includes('registrar') && (raw.includes('mismatch') || raw.includes('key') || raw.includes('secret'))) {
    return ADMISSION_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH;
  }

  if (raw.includes('incompatible') || raw.includes('ledger')) {
    return ADMISSION_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT;
  }

  return ADMISSION_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE;
}

/**
 * Pure sanitizer for registrar admission errors.
 * Never leaks raw endpoints, GraphQL errors, stack traces, tokens, or connector internals.
 */
export function mapAdmissionError(error: unknown): string {
  if (!error) {
    return 'Member admission transaction could not be completed. Check wallet and try again.';
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
    return 'Member admission transaction was cancelled in 1AM.';
  }

  if (raw.includes('duplicate') || raw.includes('already admitted') || raw.includes('already a member')) {
    return 'This member credential has already been admitted to this contract.';
  }

  if (raw.includes('dust') || raw.includes('balance') || raw.includes('insufficient funds')) {
    return 'Insufficient DUST or balance in connected 1AM wallet to cover transaction fees.';
  }

  if (raw.includes('proof') || raw.includes('prover') || raw.includes('proving')) {
    return 'ZK proof generation failed. Ensure your local proof server is reachable and responsive.';
  }

  if (raw.includes('mismatch') && raw.includes('contract')) {
    return 'Admission package contract address does not match the attached contract.';
  }

  if (raw.includes('indexer') || raw.includes('lookup')) {
    return 'Admission transaction finalized on-chain, but indexer synchronization is delayed. Use retry confirmation.';
  }

  if (raw.includes('timeout') || raw.includes('deadline')) {
    return 'Transaction submission timed out. Check network status and wallet activity.';
  }

  if (raw.includes('network') || raw.includes('preprod') || raw.includes('connection')) {
    return 'Network communication failure during member admission. Check Midnight Preprod connectivity.';
  }

  return 'The member admission transaction could not be completed. Check the network connection and try again.';
}

// ============================================================================
// Member Live Inventory Import & Certification Request Export Pure Helpers
// ============================================================================

export interface MemberInventoryUiState {
  readonly selectedFileName: string | null;
  readonly selectedFileSize: number | null;
  readonly importedReport: ValidatedLiveInventoryReport | null;
  readonly certificationRequest: CertificationRequestPackage | null;
  readonly errorMessage: string | null;
  readonly noticeMessage: string | null;
}

export const INITIAL_MEMBER_INVENTORY_UI_STATE: MemberInventoryUiState = {
  selectedFileName: null,
  selectedFileSize: null,
  importedReport: null,
  certificationRequest: null,
  errorMessage: null,
  noticeMessage: null,
};

/**
 * Pure helper checking if Member live-inventory certification request export can be initiated.
 * Requires all of:
 * - Connected 1AM wallet on Midnight Preprod
 * - Attached compatible CommonVeil contract
 * - Active Member secret and salt in volatile memory
 * - Locally derived Member credential
 * - Member backup status is recovery-tested
 * - Validated live inventory report imported
 */
export function canExportCertificationRequest(params: {
  readonly isConnected: boolean;
  readonly attachedContractAddress: string | null;
  readonly hasSecret: boolean;
  readonly hasSalt?: boolean;
  readonly memberCredentialHex: string | null;
  readonly backupRecoveryStatus: BackupRecoveryStatus;
  readonly importedInventory: ValidatedLiveInventoryReport | null;
}): boolean {
  return (
    params.isConnected &&
    typeof params.attachedContractAddress === 'string' &&
    params.attachedContractAddress.trim().length > 0 &&
    params.hasSecret &&
    params.hasSalt !== false &&
    typeof params.memberCredentialHex === 'string' &&
    isHex(params.memberCredentialHex, 32) &&
    params.backupRecoveryStatus === 'recovery-tested' &&
    params.importedInventory !== null
  );
}

export interface CertificationRequestPrerequisites {
  readonly isWalletConnected: boolean;
  readonly isContractAttached: boolean;
  readonly isMemberIdentityActive: boolean;
  readonly isBackupRecoveryTested: boolean;
  readonly isLiveInventoryImported: boolean;
  readonly canExport: boolean;
  readonly missingPrerequisites: readonly string[];
}

export function checkCertificationRequestPrerequisites(params: {
  readonly isConnected: boolean;
  readonly attachedContractAddress: string | null;
  readonly hasSecret: boolean;
  readonly hasSalt?: boolean;
  readonly memberCredentialHex: string | null;
  readonly backupRecoveryStatus: BackupRecoveryStatus;
  readonly importedInventory: ValidatedLiveInventoryReport | null;
}): CertificationRequestPrerequisites {
  const isWalletConnected = params.isConnected;
  const isContractAttached =
    typeof params.attachedContractAddress === 'string' &&
    params.attachedContractAddress.trim().length > 0;
  const isMemberIdentityActive =
    params.hasSecret &&
    params.hasSalt !== false &&
    typeof params.memberCredentialHex === 'string' &&
    isHex(params.memberCredentialHex, 32);
  const isBackupRecoveryTested = params.backupRecoveryStatus === 'recovery-tested';
  const isLiveInventoryImported = params.importedInventory !== null;

  const missing: string[] = [];
  if (!isWalletConnected) missing.push('Connected 1AM wallet on Preprod');
  if (!isContractAttached) missing.push('Attached compatible CommonVeil contract');
  if (!isMemberIdentityActive) missing.push('Active Member secret and salt in session memory');
  if (!isBackupRecoveryTested) missing.push('Recovery-tested Member encrypted backup');
  if (!isLiveInventoryImported) missing.push('Validated genuine live inventory report');

  return {
    isWalletConnected,
    isContractAttached,
    isMemberIdentityActive,
    isBackupRecoveryTested,
    isLiveInventoryImported,
    canExport: missing.length === 0,
    missingPrerequisites: missing,
  };
}

/**
 * Pure state reducer when member inventory is reset due to:
 * - contract change
 * - wallet disconnect
 * - session lock
 * - member identity replacement
 * - role change/unmount
 */
export function onMemberInventoryReset(
  _prevState?: MemberInventoryUiState,
): MemberInventoryUiState {
  return INITIAL_MEMBER_INVENTORY_UI_STATE;
}

/**
 * Pure state reducer when a valid live inventory report is imported.
 */
export function onMemberInventoryImported(
  prevState: MemberInventoryUiState,
  params: {
    readonly fileName: string;
    readonly fileSize: number;
    readonly report: ValidatedLiveInventoryReport;
    readonly certificationRequest: CertificationRequestPackage;
  },
): MemberInventoryUiState {
  return {
    ...prevState,
    selectedFileName: params.fileName,
    selectedFileSize: params.fileSize,
    importedReport: params.report,
    certificationRequest: params.certificationRequest,
    errorMessage: null,
    noticeMessage: 'Live inventory report successfully validated and bound to attached contract and member credential.',
  };
}

/**
 * Pure state reducer when member inventory import or validation fails.
 * Invalidates imported report and certification request.
 */
export function onMemberInventoryError(
  prevState: MemberInventoryUiState,
  errorMessage: string,
): MemberInventoryUiState {
  return {
    ...prevState,
    importedReport: null,
    certificationRequest: null,
    errorMessage,
    noticeMessage: null,
  };
}

/**
 * Pure sanitizer for inventory report and certification request errors.
 * Never leaks raw file paths, internal exception details, stack traces, or cryptographic material.
 */
export function mapInventoryReportError(error: unknown): string {
  if (!error) {
    return 'The inventory report could not be validated. Check the file and try again.';
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
    raw.includes('secret') ||
    raw.includes('salt') ||
    raw.includes('passphrase') ||
    raw.includes('password') ||
    raw.includes('seed') ||
    raw.includes('privatekey') ||
    raw.includes('private_key') ||
    raw.includes('forbidden sensitive') ||
    raw.includes('sensitive property') ||
    raw.includes('sensitive data')
  ) {
    return 'The selected inventory report contains forbidden sensitive or private data and was rejected.';
  }

  if (raw.includes('syntaxerror') || raw.includes('unexpected token') || (raw.includes('json') && !raw.includes('.json'))) {
    return 'The selected file is not valid JSON.';
  }

  if (raw.includes('read') || raw.includes('file')) {
    return 'Could not read the selected inventory file.';
  }

  if (raw.includes('invalid inventory schema') || raw.includes('commonveil.inventory/v1')) {
    return "Invalid inventory report schema: expected 'commonveil.inventory/v1'.";
  }

  if (raw.includes('provenance') || raw.includes('live-host-scan')) {
    return "Invalid inventory provenance: only genuine 'live-host-scan' reports from 'npm run scan' are accepted.";
  }

  if (raw.includes('status') || raw.includes('detected')) {
    return "Inventory report status must be 'detected'. Scans where no affected package was detected cannot generate a certification request.";
  }

  if (raw.includes('product')) {
    return 'Inventory report must specify a valid non-empty product identifier.';
  }

  if (raw.includes('rawversion') || raw.includes('missing version') || raw.includes('tuple integers')) {
    return 'Inventory report version information is invalid or missing.';
  }

  if (raw.includes('normalized version mismatch')) {
    return 'Inventory report normalized version does not match the major.minor.patch version tuple.';
  }

  if (raw.includes('measurementdigest') || raw.includes('digest mismatch')) {
    return 'Inventory report measurement digest is invalid or does not match product and version.';
  }

  if (raw.includes('observedat')) {
    return 'Inventory report observation timestamp is invalid or missing.';
  }

  if (raw.includes('contract') || raw.includes('attach')) {
    return 'Attach to a compatible CommonVeil contract before exporting a certification request.';
  }

  if (raw.includes('credential') || raw.includes('identity')) {
    return 'Active Member identity in session memory is required.';
  }

  if (raw.includes('backup') || raw.includes('recovery')) {
    return 'Member encrypted backup must be recovery-tested before exporting a certification request.';
  }

  return 'The inventory report could not be validated. Check the file and try again.';
}
