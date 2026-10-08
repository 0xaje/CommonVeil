/**
 * CV-007 Role Workspace pure routing, state, and sanitization logic.
 *
 * Provides pure helpers for URL parsing, role validation, safe error mapping,
 * safe wallet error mapping, address invalidation, registrar secret validation,
 * registrar backup payload schemas, and async request race protection.
 */

import { ContractSessionError, type ContractSessionErrorCode } from './contract-session';
import { isHex, hexToBytes, bytesToHex, isValidIsoTimestamp } from './role-packages';

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

export interface RegistrarSecretState {
  readonly secretBytes: Uint8Array | null;
  readonly isLocked: boolean;
  readonly verificationStatus: RegistrarVerificationStatus;
}

export const INITIAL_REGISTRAR_SECRET_STATE: RegistrarSecretState = {
  secretBytes: null,
  isLocked: false,
  verificationStatus: 'unverified',
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

/**
 * Zeroizes a Uint8Array in memory.
 */
export function zeroizeBytes(bytes?: Uint8Array | null): void {
  if (bytes && bytes instanceof Uint8Array) {
    bytes.fill(0);
  }
}
