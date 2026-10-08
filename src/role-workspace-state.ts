/**
 * CV-007 Role Workspace pure routing and state logic.
 *
 * Provides pure helpers for URL parsing, role validation, safe error mapping,
 * and workspace state management without browser or React dependencies.
 */

import { ContractSessionError, type ContractSessionErrorCode } from './contract-session';

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
    description: 'Commits verified pre-policy software inventory measurements.',
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

export type InspectionState = 'none' | 'inspecting' | 'inspected' | 'attaching' | 'attached';

export interface WorkspaceContractState {
  readonly addressInput: string;
  readonly inspectionState: InspectionState;
  readonly inspectedState: import('./contract-session').CommonVeilPublicState | null;
  readonly attachedAddress: string | null;
  readonly errorMessage: string | null;
}

export const INITIAL_WORKSPACE_CONTRACT_STATE: WorkspaceContractState = {
  addressInput: '',
  inspectionState: 'none',
  inspectedState: null,
  attachedAddress: null,
  errorMessage: null,
};

/**
 * Pure state reducer/updater for contract address changes.
 * Invalidates any prior inspected or attached state.
 */
export function handleAddressInputChange(
  prevState: WorkspaceContractState,
  newAddress: string,
): WorkspaceContractState {
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
  };
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
