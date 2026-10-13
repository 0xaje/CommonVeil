/**
 * CV-007 Role package schemas, validation, and hardened encrypted envelope.
 *
 * Enforces cryptographic role boundaries:
 * - Public: Certifier public key package.
 * - Restricted: Member admission request (one-way credential commitment, correlation sensitive).
 * - Private: Certification request, Certified snapshot package.
 * - Encrypted envelope: AES-256-GCM + PBKDF2-SHA-256 for private packages & secret backups.
 *
 * PROVENANCE INTEGRITY NOTE:
 * commonveil.certification-request/v1 accepts genuine live-host-scan provenance only.
 * A controlled test vector must never be presented as a live scan and cannot enter
 * the operational Certifier workflow.
 * Validation verifies internal measurement consistency (derivation of tuple and digest).
 * Validation DOES NOT cryptographically authenticate scanner origin.
 * Authenticated scanner provenance requires a future signature or hardware/device-attestation mechanism.
 */

export const CERTIFIER_KEY_SCHEMA = 'commonveil.certifier-key/v1' as const;
export const MEMBER_ADMISSION_SCHEMA = 'commonveil.member-admission/v1' as const;
export const CERTIFICATION_REQUEST_SCHEMA = 'commonveil.certification-request/v1' as const;
export const CERTIFIED_SNAPSHOT_SCHEMA = 'commonveil.certified-snapshot/v1' as const;
export const ENCRYPTED_ENVELOPE_SCHEMA = 'commonveil.encrypted-envelope/v1' as const;
export const INVENTORY_CERTIFICATION_RECEIPT_SCHEMA = 'commonveil.inventory-certification-receipt/v1' as const;
export const AFFECTED_RELEASE_POLICY_SCHEMA = 'commonveil.affected-release-policy/v1' as const;
export const AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA = 'commonveil.affected-release-registration-receipt/v1' as const;

export const INVENTORY_REPORT_SCHEMA = 'commonveil.inventory/v1' as const;

export type SupportedProvenance = 'live-host-scan' | 'controlled-test-vector';

export interface VersionTuple {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface CertifierKeyPackage {
  readonly schema: typeof CERTIFIER_KEY_SCHEMA;
  readonly certifierKey: string; // 32 bytes hex (64 chars)
  readonly createdAt: string;    // ISO timestamp
}

export interface MemberAdmissionPackage {
  readonly schema: typeof MEMBER_ADMISSION_SCHEMA;
  readonly contractAddress: string;
  readonly memberCredential: string; // 32 bytes hex (64 chars)
  readonly createdAt: string;
}

export interface CertificationRequestPackage {
  readonly schema: typeof CERTIFICATION_REQUEST_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly memberCredential: string; // 32 bytes hex (64 chars)
  readonly provenance: 'live-host-scan';
  readonly product: string;
  readonly rawVersion: string;
  readonly version: VersionTuple;
  readonly measurementDigest: string; // 32 bytes hex (64 chars)
  readonly observedAt: string;
  readonly createdAt: string;
}

export interface CertifiedSnapshotPackage {
  readonly schema: typeof CERTIFIED_SNAPSHOT_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly memberCredential: string; // 32 bytes hex (64 chars)
  readonly product: string;
  readonly version: VersionTuple;
  readonly snapshotSalt: string;     // 32 bytes hex (64 chars)
  readonly commitment: string;       // 32 bytes hex (64 chars)
  readonly txId: string;             // finalized transaction identifier hex
  readonly createdAt: string;
}

export interface InventoryCertificationReceipt {
  readonly schema: typeof INVENTORY_CERTIFICATION_RECEIPT_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly certifierKey: string;      // 32 bytes hex (64 chars) — on-chain public key
  readonly memberCredential: string;  // 32 bytes hex (64 chars)
  readonly commitment: string;        // 32 bytes hex (64 chars)
  readonly certificationTxId: string | null; // genuine tx id if captured; null on indexer lag
  readonly certifiedAt: string;       // ISO timestamp
  readonly status: 'finalized';
}

export interface AffectedReleasePolicyPackage {
  readonly schema: typeof AFFECTED_RELEASE_POLICY_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly advisoryId: string;
  readonly product: string;
  readonly version: VersionTuple;
  readonly sourcePublisher: string;
  readonly sourceReference: string; // valid https URL
  readonly sourcePublicationDate: string; // ISO timestamp
  readonly createdAt: string; // ISO timestamp
}

export interface AffectedReleaseRegistrationReceipt {
  readonly schema: typeof AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA;
  readonly network: 'preprod';
  readonly contractAddress: string;
  readonly advisoryId: string;
  readonly product: string;
  readonly version: VersionTuple;
  readonly sourcePublisher: string;
  readonly sourceReference: string;
  readonly registrationTxId: string | null;
  readonly registeredAt: string;
  readonly policyActive: boolean;
  readonly status: 'finalized';
}

export interface EncryptedEnvelope {
  readonly schema: typeof ENCRYPTED_ENVELOPE_SCHEMA;
  readonly cipher: 'AES-256-GCM';
  readonly kdf: 'PBKDF2-SHA-256';
  readonly iterations: 600_000;
  readonly salt: string;       // exactly 16 bytes hex (32 chars)
  readonly iv: string;         // exactly 12 bytes hex (24 chars)
  readonly ciphertext: string; // hex, max 1 MiB
  readonly createdAt: string;
}

export interface InventoryReportLike {
  readonly schema: typeof INVENTORY_REPORT_SCHEMA;
  readonly provenance: string;
  readonly observedAt: string;
  readonly product: string;
  readonly status?: string;
  readonly version?: {
    readonly raw: string;
    readonly normalized: string;
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
  };
  readonly measurementDigest?: string;
}

/**
 * CommonVeil v1 fixed PBKDF2 iteration count.
 * Exactly 600,000 iterations for PBKDF2-SHA-256 (per OWASP guidelines).
 * No other iteration count is accepted.
 */
export const PBKDF2_RECOMMENDED_ITERATIONS = 600_000;

export const MIN_PASSPHRASE_LENGTH = 12;
export const AES_GCM_TAG_BYTES = 16;
export const MAX_CIPHERTEXT_BYTES = 1024 * 1024; // 1 MiB
export const MAX_PLAINTEXT_BYTES = MAX_CIPHERTEXT_BYTES - AES_GCM_TAG_BYTES;

const UINT32_MAX = 4_294_967_295;

export function isHex(value: unknown, expectedByteLength?: number): value is string {
  if (typeof value !== 'string') return false;
  if (!/^[0-9a-fA-F]*$/.test(value)) return false;
  if (value.length % 2 !== 0) return false;
  if (expectedByteLength !== undefined && value.length !== expectedByteLength * 2) {
    return false;
  }
  return true;
}

export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && value === d.toISOString();
}

/**
 * Validates version integers:
 * - Must be safe integer
 * - 0 <= value <= 4,294,967,295 (uint32 range)
 */
export function isValidVersionInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= UINT32_MAX;
}

export function isValidVersionTuple(version: unknown): version is VersionTuple {
  if (!version || typeof version !== 'object') return false;
  const v = version as Partial<VersionTuple>;
  return (
    isValidVersionInteger(v.major) &&
    isValidVersionInteger(v.minor) &&
    isValidVersionInteger(v.patch)
  );
}

/**
 * Validates a contract address string.
 * SDK note: @midnight-ntwrk/midnight-js-protocol and ledger-v8 define ContractAddress as `string`.
 * We conservatively enforce a non-empty alphanumeric string and defer on-chain resolution to attachment.
 */
export function validateContractAddress(address: unknown): string {
  if (typeof address !== 'string' || address.trim().length === 0) {
    throw new Error('Contract address must be a non-empty string');
  }
  return address.trim();
}

export function validateCertifierKeyPackage(pkg: unknown): CertifierKeyPackage {
  if (!pkg || typeof pkg !== 'object') throw new Error('Package must be an object');
  const p = pkg as Record<string, unknown>;
  if (p.schema !== CERTIFIER_KEY_SCHEMA) {
    throw new Error(`Invalid schema: expected '${CERTIFIER_KEY_SCHEMA}', received '${String(p.schema)}'`);
  }
  if (!isHex(p.certifierKey, 32)) {
    throw new Error('certifierKey must be a 32-byte hex string (64 characters)');
  }
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }
  return {
    schema: CERTIFIER_KEY_SCHEMA,
    certifierKey: (p.certifierKey as string).toLowerCase(),
    createdAt: p.createdAt,
  };
}

export function validateMemberAdmissionPackage(pkg: unknown): MemberAdmissionPackage {
  if (!pkg || typeof pkg !== 'object') throw new Error('Package must be an object');
  const p = pkg as Record<string, unknown>;
  if (p.schema !== MEMBER_ADMISSION_SCHEMA) {
    throw new Error(`Invalid schema: expected '${MEMBER_ADMISSION_SCHEMA}', received '${String(p.schema)}'`);
  }
  const contractAddress = validateContractAddress(p.contractAddress);
  if (!isHex(p.memberCredential, 32)) {
    throw new Error('memberCredential must be a 32-byte hex string (64 characters)');
  }
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }
  return {
    schema: MEMBER_ADMISSION_SCHEMA,
    contractAddress,
    memberCredential: (p.memberCredential as string).toLowerCase(),
    createdAt: p.createdAt,
  };
}

export async function computeMeasurementDigest(product: string, normalizedVersion: string): Promise<string> {
  const measurement = `${product}@${normalizedVersion}`;
  const encoded = new TextEncoder().encode(measurement);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Canonical product identifier to 32-byte ProductId derivation.
 *
 * Algorithm:
 * 1. Validate that `label` is a non-empty string, contains no leading/trailing whitespace,
 *    and does not exceed 256 bytes in UTF-8 representation.
 * 2. Prepend domain separator "commonveil:product:v1:".
 * 3. Deterministically compute SHA-256 digest yielding exactly 32 bytes.
 *
 * Collision-resistant and deterministic across all environments without truncation.
 * Matches existing deployed contract expectations and LegacyDemo convention.
 */
export async function productDigest(label: string): Promise<Uint8Array> {
  if (typeof label !== 'string') {
    throw new Error('Product identifier must be a string');
  }
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    throw new Error('Product identifier must not be empty or whitespace-only');
  }
  if (label !== trimmed) {
    throw new Error('Product identifier must not contain leading or trailing whitespace');
  }
  const encodedLabel = new TextEncoder().encode(label);
  if (encodedLabel.byteLength > 256) {
    throw new Error(`Product identifier exceeds maximum length of 256 bytes (got ${encodedLabel.byteLength} bytes)`);
  }
  const domain = new TextEncoder().encode('commonveil:product:v1:');
  const buffer = new Uint8Array(domain.length + encodedLabel.length);
  buffer.set(domain, 0);
  buffer.set(encodedLabel, domain.length);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
}

/**
 * Canonical advisory identifier to 32-byte AdvisoryId derivation.
 *
 * Algorithm:
 * 1. Validate that `label` is a non-empty string, contains no leading/trailing whitespace,
 *    and does not exceed 128 bytes in UTF-8 representation.
 * 2. Prepend domain separator "commonveil:advisory:v1:".
 * 3. Deterministically compute SHA-256 digest yielding exactly 32 bytes.
 *
 * Collision-resistant and deterministic across all environments.
 * Matches existing deployed contract expectations and LegacyDemo convention.
 */
export async function advisoryDigest(label: string): Promise<Uint8Array> {
  if (typeof label !== 'string') {
    throw new Error('Advisory identifier must be a string');
  }
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    throw new Error('Advisory identifier must not be empty or whitespace-only');
  }
  if (label !== trimmed) {
    throw new Error('Advisory identifier must not contain leading or trailing whitespace');
  }
  const encodedLabel = new TextEncoder().encode(label);
  if (encodedLabel.byteLength > 128) {
    throw new Error(`Advisory identifier exceeds maximum length of 128 bytes (got ${encodedLabel.byteLength} bytes)`);
  }
  const domain = new TextEncoder().encode('commonveil:advisory:v1:');
  const buffer = new Uint8Array(domain.length + encodedLabel.length);
  buffer.set(domain, 0);
  buffer.set(encodedLabel, domain.length);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
}

export async function buildCertificationRequestFromInventoryReport(
  inventoryReport: InventoryReportLike,
  options: {
    contractAddress: string;
    memberCredential: string;
    now?: Date;
  },
): Promise<CertificationRequestPackage> {
  if (!inventoryReport || typeof inventoryReport !== 'object') {
    throw new Error('Inventory report must be an object');
  }
  if (inventoryReport.schema !== INVENTORY_REPORT_SCHEMA) {
    throw new Error(`Invalid inventory schema: expected '${INVENTORY_REPORT_SCHEMA}'`);
  }
  if (inventoryReport.status !== 'detected') {
    throw new Error(`Inventory report status must be 'detected', received '${String(inventoryReport.status)}'`);
  }
  if (inventoryReport.provenance !== 'live-host-scan') {
    throw new Error(
      `Invalid inventory provenance: commonveil.certification-request/v1 accepts genuine live-host-scan provenance only, received '${String(inventoryReport.provenance)}'`
    );
  }
  if (typeof inventoryReport.product !== 'string' || inventoryReport.product.trim().length === 0) {
    throw new Error('Inventory report product must be a non-empty trimmed string');
  }
  const product = inventoryReport.product.trim();
  if (!inventoryReport.version) {
    throw new Error('Inventory report missing version object');
  }
  if (typeof inventoryReport.version.raw !== 'string' || inventoryReport.version.raw.trim().length === 0) {
    throw new Error('Inventory report rawVersion must be a non-empty string');
  }
  if (!isValidVersionTuple(inventoryReport.version)) {
    throw new Error('Inventory report has missing or invalid version tuple integers');
  }

  // Derive expected normalized string from the tuple: `${major}.${minor}.${patch}`
  const derivedTupleString = `${inventoryReport.version.major}.${inventoryReport.version.minor}.${inventoryReport.version.patch}`;
  if (inventoryReport.version.normalized !== derivedTupleString) {
    throw new Error(
      `Inventory report normalized version mismatch: normalized '${inventoryReport.version.normalized}' != derived tuple '${derivedTupleString}'`
    );
  }

  if (!inventoryReport.measurementDigest || !isHex(inventoryReport.measurementDigest, 32)) {
    throw new Error('Inventory report measurementDigest must be 32-byte hex');
  }
  if (!isValidIsoTimestamp(inventoryReport.observedAt)) {
    throw new Error('Inventory report observedAt must be a valid ISO timestamp');
  }

  // Verify measurement digest integrity using the derived tuple string
  const expectedDigest = await computeMeasurementDigest(product, derivedTupleString);
  if (inventoryReport.measurementDigest.toLowerCase() !== expectedDigest.toLowerCase()) {
    throw new Error(
      `Inventory measurementDigest mismatch: expected '${expectedDigest}', got '${inventoryReport.measurementDigest}'`
    );
  }

  const contractAddress = validateContractAddress(options.contractAddress);
  if (!isHex(options.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex');
  }

  const now = options.now ?? new Date();

  return {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod',
    contractAddress,
    memberCredential: options.memberCredential.toLowerCase(),
    provenance: 'live-host-scan',
    product,
    rawVersion: inventoryReport.version.raw,
    version: {
      major: inventoryReport.version.major,
      minor: inventoryReport.version.minor,
      patch: inventoryReport.version.patch,
    },
    measurementDigest: inventoryReport.measurementDigest.toLowerCase(),
    observedAt: inventoryReport.observedAt,
    createdAt: now.toISOString(),
  };
}

export interface ValidatedLiveInventoryReport {
  readonly schema: typeof INVENTORY_REPORT_SCHEMA;
  readonly provenance: 'live-host-scan';
  readonly status: 'detected';
  readonly product: string;
  readonly rawVersion: string;
  readonly version: VersionTuple;
  readonly normalizedVersion: string;
  readonly measurementDigest: string;
  readonly observedAt: string;
}

export const FORBIDDEN_SENSITIVE_PATTERNS = [
  'secret',
  'salt',
  'passphrase',
  'password',
  'seed',
  'privatekey',
  'private_key',
  'privkey',
  'backup',
  'walletseed',
  'wallet_seed',
] as const;

export function assertNoSensitiveFields(
  obj: unknown,
  path: string = '',
  entityName: string = 'Inventory report',
): void {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    for (const pattern of FORBIDDEN_SENSITIVE_PATTERNS) {
      if (lowerKey.includes(pattern)) {
        throw new Error(`${entityName} contains forbidden sensitive property '${path ? `${path}.${key}` : key}'.`);
      }
    }
    if (typeof value === 'string') {
      const lowerVal = value.toLowerCase();
      for (const phrase of ['wallet seed', 'private key', 'backup password', 'secret salt', 'passphrase']) {
        if (lowerVal.includes(phrase)) {
          throw new Error(`${entityName} contains forbidden sensitive data in '${path ? `${path}.${key}` : key}'.`);
        }
      }
    }
    if (value && typeof value === 'object') {
      assertNoSensitiveFields(value, path ? `${path}.${key}` : key, entityName);
    }
  }
}

export async function validateLiveInventoryReport(report: unknown): Promise<ValidatedLiveInventoryReport> {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Inventory report must be a JSON object.');
  }

  assertNoSensitiveFields(report, '', 'Inventory report');

  const r = report as Record<string, unknown>;

  if (r.schema !== INVENTORY_REPORT_SCHEMA) {
    throw new Error(`Invalid inventory schema: expected '${INVENTORY_REPORT_SCHEMA}', received '${String(r.schema)}'.`);
  }

  if (r.provenance !== 'live-host-scan') {
    throw new Error(`Invalid inventory provenance: expected 'live-host-scan', received '${String(r.provenance)}'.`);
  }

  if (r.status !== 'detected') {
    throw new Error(`Inventory report status must be 'detected', received '${String(r.status)}'.`);
  }

  if (typeof r.product !== 'string' || r.product.trim().length === 0) {
    throw new Error('Inventory report product must be a non-empty string.');
  }
  const product = r.product.trim();

  if (!r.version || typeof r.version !== 'object' || Array.isArray(r.version)) {
    throw new Error('Inventory report missing version object.');
  }
  const v = r.version as Record<string, unknown>;
  if (typeof v.raw !== 'string' || v.raw.trim().length === 0) {
    throw new Error('Inventory report rawVersion must be a non-empty string.');
  }
  if (typeof v.normalized !== 'string' || v.normalized.trim().length === 0) {
    throw new Error('Inventory report normalized version must be a non-empty string.');
  }
  if (!isValidVersionTuple(v)) {
    throw new Error('Inventory report version tuple integers must be safe non-negative integers.');
  }

  const derivedTupleString = `${v.major}.${v.minor}.${v.patch}`;
  if (v.normalized !== derivedTupleString) {
    throw new Error(
      `Inventory report normalized version mismatch: normalized '${v.normalized}' != derived tuple '${derivedTupleString}'.`
    );
  }

  if (!r.measurementDigest || !isHex(r.measurementDigest, 32)) {
    throw new Error('Inventory report measurementDigest must be a 32-byte hex string (64 characters).');
  }

  const expectedDigest = await computeMeasurementDigest(product, derivedTupleString);
  if ((r.measurementDigest as string).toLowerCase() !== expectedDigest.toLowerCase()) {
    throw new Error(
      `Inventory report measurementDigest mismatch: expected '${expectedDigest}', got '${String(r.measurementDigest)}'.`
    );
  }

  if (!isValidIsoTimestamp(r.observedAt)) {
    throw new Error('Inventory report observedAt must be a valid ISO-8601 UTC timestamp.');
  }

  return {
    schema: INVENTORY_REPORT_SCHEMA,
    provenance: 'live-host-scan',
    status: 'detected',
    product,
    rawVersion: v.raw,
    version: {
      major: v.major,
      minor: v.minor,
      patch: v.patch,
    },
    normalizedVersion: derivedTupleString,
    measurementDigest: (r.measurementDigest as string).toLowerCase(),
    observedAt: r.observedAt,
  };
}

export function buildCertificationRequestPackage(params: {
  inventoryReport: ValidatedLiveInventoryReport;
  contractAddress: string;
  memberCredentialHex: string;
  now?: Date;
}): CertificationRequestPackage {
  if (params.inventoryReport.provenance !== 'live-host-scan') {
    throw new Error(
      `Invalid inventory provenance: commonveil.certification-request/v1 accepts genuine live-host-scan provenance only, received '${String(params.inventoryReport.provenance)}'.`
    );
  }
  const contractAddress = validateContractAddress(params.contractAddress);
  if (!isHex(params.memberCredentialHex, 32)) {
    throw new Error('memberCredential must be a 32-byte hex string (64 characters).');
  }
  const now = params.now ?? new Date();

  return {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod',
    contractAddress,
    memberCredential: params.memberCredentialHex.trim().toLowerCase(),
    provenance: 'live-host-scan',
    product: params.inventoryReport.product,
    rawVersion: params.inventoryReport.rawVersion,
    version: {
      major: params.inventoryReport.version.major,
      minor: params.inventoryReport.version.minor,
      patch: params.inventoryReport.version.patch,
    },
    measurementDigest: params.inventoryReport.measurementDigest.toLowerCase(),
    observedAt: params.inventoryReport.observedAt,
    createdAt: now.toISOString(),
  };
}

export const CERTIFICATION_REQUEST_REQUIRED_FIELDS = [
  'schema',
  'network',
  'contractAddress',
  'memberCredential',
  'provenance',
  'product',
  'rawVersion',
  'version',
  'measurementDigest',
  'observedAt',
  'createdAt',
] as const;

export async function validateCertificationRequestPackage(pkg: unknown): Promise<CertificationRequestPackage> {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    throw new Error('Package must be an object');
  }

  // Strictly assert no sensitive properties or leaked credentials/secrets anywhere in the package
  assertNoSensitiveFields(pkg, '', 'Certification request');

  const p = pkg as Record<string, unknown>;

  // Strict 11 top-level field boundary: reject every unknown additional field
  const allowedSet = new Set<string>(CERTIFICATION_REQUEST_REQUIRED_FIELDS);
  const extraKeys = Object.keys(p).filter((k) => !allowedSet.has(k));
  if (extraKeys.length > 0) {
    throw new Error(`Certification request contains unauthorized top-level fields: ${extraKeys.join(', ')}`);
  }

  if (p.schema !== CERTIFICATION_REQUEST_SCHEMA) {
    throw new Error(`Invalid schema: expected '${CERTIFICATION_REQUEST_SCHEMA}', received '${String(p.schema)}'`);
  }
  if (p.network !== 'preprod') {
    throw new Error("Invalid network: expected 'preprod'");
  }
  const contractAddress = validateContractAddress(p.contractAddress);
  if (!isHex(p.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex (64 chars)');
  }
  if (p.provenance !== 'live-host-scan') {
    throw new Error(
      `Invalid provenance: commonveil.certification-request/v1 accepts genuine live-host-scan provenance only, received '${String(p.provenance)}'`
    );
  }
  if (typeof p.product !== 'string' || p.product.trim().length === 0) {
    throw new Error('product must be a non-empty trimmed string');
  }
  if (typeof p.rawVersion !== 'string' || p.rawVersion.trim().length === 0) {
    throw new Error('rawVersion must be a non-empty string');
  }
  if (!isValidVersionTuple(p.version)) {
    throw new Error('version must be a valid VersionTuple with safe uint32 integers');
  }
  if (!isHex(p.measurementDigest, 32)) {
    throw new Error('measurementDigest must be 32-byte hex (64 chars)');
  }
  if (!isValidIsoTimestamp(p.observedAt)) {
    throw new Error('observedAt must be a valid ISO-8601 UTC timestamp');
  }
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }

  const derivedTupleString = `${p.version.major}.${p.version.minor}.${p.version.patch}`;
  const expectedDigest = await computeMeasurementDigest(p.product.trim(), derivedTupleString);
  if ((p.measurementDigest as string).toLowerCase() !== expectedDigest.toLowerCase()) {
    throw new Error(`measurementDigest does not match normalized product/version measurement`);
  }

  return {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod',
    contractAddress,
    memberCredential: (p.memberCredential as string).toLowerCase(),
    provenance: 'live-host-scan',
    product: p.product.trim(),
    rawVersion: p.rawVersion,
    version: {
      major: p.version.major,
      minor: p.version.minor,
      patch: p.version.patch,
    },
    measurementDigest: (p.measurementDigest as string).toLowerCase(),
    observedAt: p.observedAt,
    createdAt: p.createdAt,
  };
}

export const CERTIFIED_SNAPSHOT_REQUIRED_FIELDS = [
  'schema',
  'network',
  'contractAddress',
  'memberCredential',
  'product',
  'version',
  'snapshotSalt',
  'commitment',
  'txId',
  'createdAt',
] as const;

export function validateCertifiedSnapshotPackage(pkg: unknown): CertifiedSnapshotPackage {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Package must be an object');
  const p = pkg as Record<string, unknown>;

  // Strict field boundary: reject every unknown additional field
  const allowedSet = new Set<string>(CERTIFIED_SNAPSHOT_REQUIRED_FIELDS);
  const extraKeys = Object.keys(p).filter((k) => !allowedSet.has(k));
  if (extraKeys.length > 0) {
    throw new Error(`Certified snapshot contains unauthorized top-level fields: ${extraKeys.join(', ')}`);
  }

  if (p.schema !== CERTIFIED_SNAPSHOT_SCHEMA) {
    throw new Error(`Invalid schema: expected '${CERTIFIED_SNAPSHOT_SCHEMA}', received '${String(p.schema)}'`);
  }
  if (p.network !== 'preprod') {
    throw new Error("Invalid network: expected 'preprod'");
  }
  const contractAddress = validateContractAddress(p.contractAddress);
  if (!isHex(p.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex (64 chars)');
  }
  if (typeof p.product !== 'string' || p.product.trim().length === 0) {
    throw new Error('product must be a non-empty trimmed string');
  }
  if (!isValidVersionTuple(p.version)) {
    throw new Error('version must be a valid VersionTuple with safe uint32 integers');
  }
  if (!isHex(p.snapshotSalt, 32)) {
    throw new Error('snapshotSalt must be 32-byte hex (64 chars)');
  }
  if (!isHex(p.commitment, 32)) {
    throw new Error('commitment must be 32-byte hex (64 chars)');
  }
  if (typeof p.txId !== 'string' || !isHex(p.txId) || p.txId.length < 16) {
    throw new Error('txId must be a valid hex transaction identifier');
  }
  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }

  return {
    schema: CERTIFIED_SNAPSHOT_SCHEMA,
    network: 'preprod',
    contractAddress,
    memberCredential: (p.memberCredential as string).toLowerCase(),
    product: p.product.trim(),
    version: {
      major: p.version.major,
      minor: p.version.minor,
      patch: p.version.patch,
    },
    snapshotSalt: (p.snapshotSalt as string).toLowerCase(),
    commitment: (p.commitment as string).toLowerCase(),
    txId: (p.txId as string).toLowerCase(),
    createdAt: p.createdAt,
  };
}

export function buildCertifiedSnapshotPackage(params: {
  contractAddress: string;
  memberCredential: string; // 32-byte hex
  product: string;
  version: VersionTuple;
  snapshotSalt: string;     // 32-byte hex — volatile memory only, never stored in plaintext
  commitment: string;       // 32-byte hex
  txId: string;
  now?: Date;
}): CertifiedSnapshotPackage {
  const contractAddress = validateContractAddress(params.contractAddress);
  if (!isHex(params.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex (64 chars)');
  }
  if (typeof params.product !== 'string' || params.product.trim().length === 0) {
    throw new Error('product must be a non-empty trimmed string');
  }
  if (!isValidVersionTuple(params.version)) {
    throw new Error('version must be a valid VersionTuple with safe uint32 integers');
  }
  if (!isHex(params.snapshotSalt, 32)) {
    throw new Error('snapshotSalt must be 32-byte hex (64 chars)');
  }
  if (!isHex(params.commitment, 32)) {
    throw new Error('commitment must be 32-byte hex (64 chars)');
  }
  if (typeof params.txId !== 'string' || !isHex(params.txId) || params.txId.length < 16) {
    throw new Error('txId must be a valid hex transaction identifier');
  }
  const now = params.now ?? new Date();
  return {
    schema: CERTIFIED_SNAPSHOT_SCHEMA,
    network: 'preprod',
    contractAddress,
    memberCredential: params.memberCredential.toLowerCase(),
    product: params.product.trim(),
    version: {
      major: params.version.major,
      minor: params.version.minor,
      patch: params.version.patch,
    },
    snapshotSalt: params.snapshotSalt.toLowerCase(),
    commitment: params.commitment.toLowerCase(),
    txId: params.txId.toLowerCase(),
    createdAt: now.toISOString(),
  };
}

export const INVENTORY_CERTIFICATION_RECEIPT_REQUIRED_FIELDS = [
  'schema',
  'network',
  'contractAddress',
  'certifierKey',
  'memberCredential',
  'commitment',
  'certificationTxId',
  'certifiedAt',
  'status',
] as const;

export function validateInventoryCertificationReceipt(receipt: unknown): InventoryCertificationReceipt {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error('Certification receipt must be an object');
  }
  const r = receipt as Record<string, unknown>;

  // Strict field boundary: reject every unknown additional field
  const allowedSet = new Set<string>(INVENTORY_CERTIFICATION_RECEIPT_REQUIRED_FIELDS);
  const extraKeys = Object.keys(r).filter((k) => !allowedSet.has(k));
  if (extraKeys.length > 0) {
    throw new Error(`Certification receipt contains unauthorized top-level fields: ${extraKeys.join(', ')}`);
  }

  if (r.schema !== INVENTORY_CERTIFICATION_RECEIPT_SCHEMA) {
    throw new Error(`Invalid schema: expected '${INVENTORY_CERTIFICATION_RECEIPT_SCHEMA}', received '${String(r.schema)}'`);
  }
  if (r.network !== 'preprod') {
    throw new Error("Invalid network: expected 'preprod'");
  }
  if (typeof r.contractAddress !== 'string' || !r.contractAddress.trim()) {
    throw new Error('contractAddress must be a non-empty string');
  }
  if (!isHex(r.certifierKey, 32)) {
    throw new Error('certifierKey must be 32-byte hex (64 chars)');
  }
  if (!isHex(r.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex (64 chars)');
  }
  if (!isHex(r.commitment, 32)) {
    throw new Error('commitment must be 32-byte hex (64 chars)');
  }
  // certificationTxId may be null if indexer lag prevented capture
  if (r.certificationTxId !== null) {
    if (typeof r.certificationTxId !== 'string' || !isHex(r.certificationTxId) || r.certificationTxId.length < 16) {
      throw new Error('certificationTxId must be a valid hex string or null');
    }
  }
  if (!isValidIsoTimestamp(r.certifiedAt)) {
    throw new Error('certifiedAt must be a valid ISO-8601 UTC timestamp');
  }
  if (r.status !== 'finalized') {
    throw new Error("status must be 'finalized'");
  }
  return {
    schema: INVENTORY_CERTIFICATION_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: (r.contractAddress as string).trim(),
    certifierKey: (r.certifierKey as string).toLowerCase(),
    memberCredential: (r.memberCredential as string).toLowerCase(),
    commitment: (r.commitment as string).toLowerCase(),
    certificationTxId: r.certificationTxId ? (r.certificationTxId as string).toLowerCase() : null,
    certifiedAt: r.certifiedAt as string,
    status: 'finalized',
  };
}

export function buildInventoryCertificationReceipt(params: {
  contractAddress: string;
  certifierKey: string;      // 32-byte hex on-chain key
  memberCredential: string;  // 32-byte hex
  commitment: string;        // 32-byte hex
  certificationTxId?: string | null;
  now?: Date;
}): InventoryCertificationReceipt {
  if (!isHex(params.certifierKey, 32)) throw new Error('certifierKey must be 32-byte hex (64 chars)');
  if (!isHex(params.memberCredential, 32)) throw new Error('memberCredential must be 32-byte hex (64 chars)');
  if (!isHex(params.commitment, 32)) throw new Error('commitment must be 32-byte hex (64 chars)');
  const now = params.now ?? new Date();
  return validateInventoryCertificationReceipt({
    schema: INVENTORY_CERTIFICATION_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: params.contractAddress.trim(),
    certifierKey: params.certifierKey.toLowerCase(),
    memberCredential: params.memberCredential.toLowerCase(),
    commitment: params.commitment.toLowerCase(),
    certificationTxId: params.certificationTxId ? params.certificationTxId.toLowerCase() : null,
    certifiedAt: now.toISOString(),
    status: 'finalized',
  });
}

export const AFFECTED_RELEASE_POLICY_REQUIRED_FIELDS = [
  'schema',
  'network',
  'contractAddress',
  'advisoryId',
  'product',
  'version',
  'sourcePublisher',
  'sourceReference',
  'sourcePublicationDate',
  'createdAt',
] as const;

export function validateHttpsUrl(url: unknown): string {
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('sourceReference must be a non-empty string');
  }
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('sourceReference must be a valid URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`sourceReference must be an HTTPS URL (received '${parsed.protocol}')`);
  }
  return trimmed;
}

/**
 * Validates an affected-release policy package according to strict whitelist rules.
 *
 * Enforces honesty boundaries:
 * - Accepts only genuine advisory identifiers and affected versions.
 * - For CVE-2024-3094, only genuinely affected releases (5.6.0, 5.6.1) are accepted;
 *   xz-utils 5.2.5 or safe releases cannot be labeled affected.
 * - Strictly rejects mock/demo/synthetic/controlled test provenance markers.
 */
export function validateAffectedReleasePolicyPackage(pkg: unknown): AffectedReleasePolicyPackage {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    throw new Error('Policy package must be an object');
  }
  const p = pkg as Record<string, unknown>;

  const allowedSet = new Set<string>(AFFECTED_RELEASE_POLICY_REQUIRED_FIELDS);
  const extraKeys = Object.keys(p).filter((k) => !allowedSet.has(k));
  if (extraKeys.length > 0) {
    throw new Error(`Affected-release policy contains unauthorized top-level fields: ${extraKeys.join(', ')}`);
  }

  // Reject sensitive or forbidden keys anywhere in the object
  const forbiddenPatterns = [
    'secret',
    'salt',
    'password',
    'passphrase',
    'privatekey',
    'seed',
    'mnemonic',
    'inventory',
    'credential',
    'nullifier',
    'mock',
    'demo',
    'simulated',
    'synthetic',
    'controlled-test-vector',
  ];
  for (const key of Object.keys(p)) {
    const lowerKey = key.toLowerCase();
    for (const pattern of forbiddenPatterns) {
      if (lowerKey.includes(pattern)) {
        throw new Error(`Affected-release policy contains forbidden field: ${key}`);
      }
    }
  }

  if (p.schema !== AFFECTED_RELEASE_POLICY_SCHEMA) {
    throw new Error(`Invalid schema: expected '${AFFECTED_RELEASE_POLICY_SCHEMA}', received '${String(p.schema)}'`);
  }
  if (p.network !== 'preprod') {
    throw new Error("Invalid network: expected 'preprod'");
  }
  const contractAddress = validateContractAddress(p.contractAddress);

  if (typeof p.advisoryId !== 'string' || p.advisoryId.trim().length === 0) {
    throw new Error('advisoryId must be a non-empty string');
  }
  const advisoryId = p.advisoryId.trim();
  if (p.advisoryId !== advisoryId) {
    throw new Error('advisoryId must not contain leading or trailing whitespace');
  }

  if (typeof p.product !== 'string' || p.product.trim().length === 0) {
    throw new Error('product must be a non-empty trimmed string');
  }
  const product = p.product.trim();
  if (p.product !== product) {
    throw new Error('product must not contain leading or trailing whitespace');
  }

  if (!isValidVersionTuple(p.version)) {
    throw new Error('version must be a valid VersionTuple with safe uint32 integers');
  }

  // Honesty boundary for CVE-2024-3094:
  // Authoritative evidence documents only 5.6.0 and 5.6.1 as compromised.
  // 5.2.5 (or any 5.2.x / 5.4.x) is never affected.
  if (advisoryId.toUpperCase() === 'CVE-2024-3094' && product === 'pkg:generic/xz-utils') {
    const isGenuinelyAffected =
      p.version.major === 5 &&
      p.version.minor === 6 &&
      (p.version.patch === 0 || p.version.patch === 1);
    if (!isGenuinelyAffected) {
      throw new Error(
        `For CVE-2024-3094 on pkg:generic/xz-utils, only releases 5.6.0 and 5.6.1 are affected. Version ${p.version.major}.${p.version.minor}.${p.version.patch} cannot be registered as affected.`
      );
    }
  }

  if (typeof p.sourcePublisher !== 'string' || p.sourcePublisher.trim().length === 0) {
    throw new Error('sourcePublisher must be a non-empty string');
  }
  const sourcePublisher = p.sourcePublisher.trim();

  const sourceReference = validateHttpsUrl(p.sourceReference);

  if (!isValidIsoTimestamp(p.sourcePublicationDate)) {
    throw new Error('sourcePublicationDate must be a valid ISO-8601 UTC timestamp');
  }

  if (!isValidIsoTimestamp(p.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }

  return {
    schema: AFFECTED_RELEASE_POLICY_SCHEMA,
    network: 'preprod',
    contractAddress,
    advisoryId,
    product,
    version: {
      major: p.version.major,
      minor: p.version.minor,
      patch: p.version.patch,
    },
    sourcePublisher,
    sourceReference,
    sourcePublicationDate: p.sourcePublicationDate,
    createdAt: p.createdAt,
  };
}

export function buildAffectedReleasePolicyPackage(params: {
  contractAddress: string;
  advisoryId: string;
  product: string;
  version: VersionTuple;
  sourcePublisher: string;
  sourceReference: string;
  sourcePublicationDate: string;
  now?: Date;
}): AffectedReleasePolicyPackage {
  const now = params.now ?? new Date();
  return validateAffectedReleasePolicyPackage({
    schema: AFFECTED_RELEASE_POLICY_SCHEMA,
    network: 'preprod',
    contractAddress: params.contractAddress,
    advisoryId: params.advisoryId,
    product: params.product,
    version: params.version,
    sourcePublisher: params.sourcePublisher,
    sourceReference: params.sourceReference,
    sourcePublicationDate: params.sourcePublicationDate,
    createdAt: now.toISOString(),
  });
}

export const AFFECTED_RELEASE_REGISTRATION_RECEIPT_REQUIRED_FIELDS = [
  'schema',
  'network',
  'contractAddress',
  'advisoryId',
  'product',
  'version',
  'sourcePublisher',
  'sourceReference',
  'registrationTxId',
  'registeredAt',
  'policyActive',
  'status',
] as const;

export function validateAffectedReleaseRegistrationReceipt(
  receipt: unknown,
): AffectedReleaseRegistrationReceipt {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error('Registration receipt must be an object');
  }
  const r = receipt as Record<string, unknown>;

  const allowedSet = new Set<string>(AFFECTED_RELEASE_REGISTRATION_RECEIPT_REQUIRED_FIELDS);
  const extraKeys = Object.keys(r).filter((k) => !allowedSet.has(k));
  if (extraKeys.length > 0) {
    throw new Error(`Registration receipt contains unauthorized top-level fields: ${extraKeys.join(', ')}`);
  }

  if (r.schema !== AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA) {
    throw new Error(`Invalid schema: expected '${AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA}', received '${String(r.schema)}'`);
  }
  if (r.network !== 'preprod') {
    throw new Error("Invalid network: expected 'preprod'");
  }
  const contractAddress = validateContractAddress(r.contractAddress);

  if (typeof r.advisoryId !== 'string' || r.advisoryId.trim().length === 0) {
    throw new Error('advisoryId must be a non-empty string');
  }
  if (typeof r.product !== 'string' || r.product.trim().length === 0) {
    throw new Error('product must be a non-empty string');
  }
  if (!isValidVersionTuple(r.version)) {
    throw new Error('version must be a valid VersionTuple');
  }
  if (typeof r.sourcePublisher !== 'string' || r.sourcePublisher.trim().length === 0) {
    throw new Error('sourcePublisher must be a non-empty string');
  }
  const sourceReference = validateHttpsUrl(r.sourceReference);

  if (r.registrationTxId !== null) {
    if (typeof r.registrationTxId !== 'string' || !/^[0-9a-f]{64,66}$/.test(r.registrationTxId)) {
      throw new Error('registrationTxId must be a 64-character or 66-character lowercase hexadecimal string or null');
    }
  }

  if (!isValidIsoTimestamp(r.registeredAt)) {
    throw new Error('registeredAt must be a valid ISO-8601 UTC timestamp');
  }

  if (typeof r.policyActive !== 'boolean') {
    throw new Error('policyActive must be a boolean');
  }

  if (r.status !== 'finalized') {
    throw new Error("status must be 'finalized'");
  }

  return {
    schema: AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress,
    advisoryId: (r.advisoryId as string).trim(),
    product: (r.product as string).trim(),
    version: {
      major: r.version.major,
      minor: r.version.minor,
      patch: r.version.patch,
    },
    sourcePublisher: (r.sourcePublisher as string).trim(),
    sourceReference,
    registrationTxId: r.registrationTxId ? (r.registrationTxId as string).toLowerCase() : null,
    registeredAt: r.registeredAt as string,
    policyActive: r.policyActive,
    status: 'finalized',
  };
}

export function buildAffectedReleaseRegistrationReceipt(params: {
  contractAddress: string;
  advisoryId: string;
  product: string;
  version: VersionTuple;
  sourcePublisher: string;
  sourceReference: string;
  registrationTxId?: string | null;
  policyActive: boolean;
  now?: Date;
}): AffectedReleaseRegistrationReceipt {
  const now = params.now ?? new Date();
  return validateAffectedReleaseRegistrationReceipt({
    schema: AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: params.contractAddress,
    advisoryId: params.advisoryId,
    product: params.product,
    version: params.version,
    sourcePublisher: params.sourcePublisher,
    sourceReference: params.sourceReference,
    registrationTxId: params.registrationTxId ?? null,
    registeredAt: now.toISOString(),
    policyActive: params.policyActive,
    status: 'finalized',
  });
}

export function validateEncryptedEnvelope(envelope: unknown): EncryptedEnvelope {
  if (!envelope || typeof envelope !== 'object') throw new Error('Envelope must be an object');
  const e = envelope as Record<string, unknown>;
  if (e.schema !== ENCRYPTED_ENVELOPE_SCHEMA) {
    throw new Error(`Invalid schema: expected '${ENCRYPTED_ENVELOPE_SCHEMA}', received '${String(e.schema)}'`);
  }
  if (e.cipher !== 'AES-256-GCM') {
    throw new Error(`Unsupported cipher: expected 'AES-256-GCM', received '${String(e.cipher)}'`);
  }
  if (e.kdf !== 'PBKDF2-SHA-256') {
    throw new Error(`Unsupported kdf: expected 'PBKDF2-SHA-256', received '${String(e.kdf)}'`);
  }
  // Require exactly PBKDF2_RECOMMENDED_ITERATIONS (600,000)
  if (typeof e.iterations !== 'number' || !Number.isInteger(e.iterations) || e.iterations !== PBKDF2_RECOMMENDED_ITERATIONS) {
    throw new Error(`iterations must be exactly ${PBKDF2_RECOMMENDED_ITERATIONS}`);
  }
  // Salt must be exactly 16 bytes (32 hex chars)
  if (!isHex(e.salt, 16)) {
    throw new Error('salt must be exactly 16 bytes hex (32 characters)');
  }
  // IV must be exactly 12 bytes (24 hex chars)
  if (!isHex(e.iv, 12)) {
    throw new Error('iv must be exactly 12 bytes hex (24 characters) for AES-256-GCM');
  }
  if (typeof e.ciphertext !== 'string' || !isHex(e.ciphertext) || e.ciphertext.length === 0) {
    throw new Error('ciphertext must be a non-empty hex string');
  }
  if (e.ciphertext.length / 2 > MAX_CIPHERTEXT_BYTES) {
    throw new Error(`ciphertext exceeds maximum allowed size of ${MAX_CIPHERTEXT_BYTES} bytes (1 MiB)`);
  }
  if (!isValidIsoTimestamp(e.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }

  return {
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_RECOMMENDED_ITERATIONS,
    salt: (e.salt as string).toLowerCase(),
    iv: (e.iv as string).toLowerCase(),
    ciphertext: (e.ciphertext as string).toLowerCase(),
    createdAt: e.createdAt,
  };
}

// Cryptographic helpers using Web Crypto API

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') throw new Error('Hex value must be a string');
  if (hex.length % 2 !== 0) throw new Error('Hex string must have an even length');
  if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error('Hex string contains invalid non-hex characters');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('Invalid byte in hex string');
    bytes[i] = byte;
  }
  return bytes;
}

function validatePassphrase(passphrase: unknown): string {
  if (typeof passphrase !== 'string') {
    throw new Error('Passphrase must be a string');
  }
  const chars = Array.from(passphrase);
  if (chars.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} Unicode characters`);
  }
  return passphrase;
}

/**
 * Builds canonical authenticated additional data (AAD) for AES-GCM envelope encryption.
 */
export function buildEnvelopeAdditionalData(envelopeFields: {
  schema: string;
  cipher: string;
  kdf: string;
  iterations: number;
  salt: string;
  iv: string;
  createdAt: string;
}): Uint8Array<ArrayBuffer> {
  const canonicalString = JSON.stringify({
    schema: envelopeFields.schema,
    cipher: envelopeFields.cipher,
    kdf: envelopeFields.kdf,
    iterations: envelopeFields.iterations,
    salt: envelopeFields.salt.toLowerCase(),
    iv: envelopeFields.iv.toLowerCase(),
    createdAt: envelopeFields.createdAt,
  });
  return new TextEncoder().encode(canonicalString) as Uint8Array<ArrayBuffer>;
}

async function deriveKeyFromPassphrase(
  passphrase: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as Uint8Array<ArrayBuffer>,
      iterations,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptToEnvelope(
  payload: unknown,
  passphrase: string,
  options?: {
    now?: Date;
  },
): Promise<EncryptedEnvelope> {
  if (payload === undefined) {
    throw new Error('Payload cannot be undefined');
  }
  validatePassphrase(passphrase);

  let serialized: string;
  try {
    const result = JSON.stringify(payload);
    if (typeof result !== 'string') {
      throw new Error('JSON.stringify did not return a valid string');
    }
    serialized = result;
  } catch (error) {
    throw new Error(`Payload serialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const encodedPayload = new TextEncoder().encode(serialized);
  if (encodedPayload.length > MAX_PLAINTEXT_BYTES) {
    throw new Error(
      `Serialized payload (${encodedPayload.length} bytes) exceeds maximum permitted plaintext limit of ${MAX_PLAINTEXT_BYTES} bytes`
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const saltHex = bytesToHex(salt);
  const ivHex = bytesToHex(iv);
  const now = options?.now ?? new Date();
  const createdAt = now.toISOString();

  const additionalData = buildEnvelopeAdditionalData({
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_RECOMMENDED_ITERATIONS,
    salt: saltHex,
    iv: ivHex,
    createdAt,
  });

  const key = await deriveKeyFromPassphrase(passphrase, salt, PBKDF2_RECOMMENDED_ITERATIONS);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData,
    },
    key,
    encodedPayload,
  );

  return {
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_RECOMMENDED_ITERATIONS,
    salt: saltHex,
    iv: ivHex,
    ciphertext: bytesToHex(new Uint8Array(ciphertextBuffer)),
    createdAt,
  };
}

/**
 * Low-level unsafe decryption helper.
 * Internal or low-level use only: returns untrusted parsed JSON without schema whitelisting.
 */
export async function unsafeDecryptFromEnvelope<T = unknown>(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<T> {
  const validEnvelope = validateEncryptedEnvelope(envelope);
  validatePassphrase(passphrase);

  const saltBytes = hexToBytes(validEnvelope.salt);
  const ivBytes = hexToBytes(validEnvelope.iv);
  const ciphertextBytes = hexToBytes(validEnvelope.ciphertext);

  const additionalData = buildEnvelopeAdditionalData({
    schema: validEnvelope.schema,
    cipher: validEnvelope.cipher,
    kdf: validEnvelope.kdf,
    iterations: validEnvelope.iterations,
    salt: validEnvelope.salt,
    iv: validEnvelope.iv,
    createdAt: validEnvelope.createdAt,
  });

  const key = await deriveKeyFromPassphrase(passphrase, saltBytes, validEnvelope.iterations);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as Uint8Array<ArrayBuffer>,
        additionalData,
      },
      key,
      ciphertextBytes as Uint8Array<ArrayBuffer>,
    );
  } catch (_error) {
    throw new Error('Failed to decrypt envelope: incorrect passphrase or tampered ciphertext/metadata');
  }

  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  try {
    return JSON.parse(decryptedText) as T;
  } catch (_error) {
    throw new Error('Decrypted payload is not valid JSON');
  }
}

/**
 * Safe public decryption API.
 * Validates the envelope, authenticates metadata + payload, parses JSON, passes through
 * the caller-supplied package validator, and returns only the validator's validated/whitelisted object.
 */
export async function decryptAndValidateEnvelope<T>(
  envelope: EncryptedEnvelope,
  passphrase: string,
  validator: (payload: unknown) => T | Promise<T>,
): Promise<T> {
  const parsed = await unsafeDecryptFromEnvelope(envelope, passphrase);
  return await validator(parsed);
}
