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
 * Validation preserves claimed provenance ('live-host-scan' vs 'controlled-test-vector')
 * and verifies internal measurement consistency (derivation of tuple and digest).
 * Validation DOES NOT cryptographically authenticate scanner origin.
 * Authenticated scanner provenance requires a future signature or hardware/device-attestation mechanism.
 * A controlled test vector must never be presented as a live scan.
 */

export const CERTIFIER_KEY_SCHEMA = 'commonveil.certifier-key/v1' as const;
export const MEMBER_ADMISSION_SCHEMA = 'commonveil.member-admission/v1' as const;
export const CERTIFICATION_REQUEST_SCHEMA = 'commonveil.certification-request/v1' as const;
export const CERTIFIED_SNAPSHOT_SCHEMA = 'commonveil.certified-snapshot/v1' as const;
export const ENCRYPTED_ENVELOPE_SCHEMA = 'commonveil.encrypted-envelope/v1' as const;

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
  readonly provenance: SupportedProvenance;
  readonly product: string;
  readonly rawVersion: string;
  readonly version: VersionTuple;
  readonly measurementDigest: string; // 32 bytes hex (64 chars)
  readonly observedAt: string;
  readonly createdAt: string;
}

export interface CertifiedSnapshotPackage {
  readonly schema: typeof CERTIFIED_SNAPSHOT_SCHEMA;
  readonly contractAddress: string;
  readonly memberCredential: string; // 32 bytes hex (64 chars)
  readonly product: string;
  readonly version: VersionTuple;
  readonly snapshotSalt: string;     // 32 bytes hex (64 chars)
  readonly commitment: string;       // 32 bytes hex (64 chars)
  readonly txId: string;             // finalized transaction identifier hex
  readonly createdAt: string;
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
  if (inventoryReport.provenance !== 'live-host-scan' && inventoryReport.provenance !== 'controlled-test-vector') {
    throw new Error(`Unsupported inventory provenance: '${String(inventoryReport.provenance)}'`);
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
    provenance: inventoryReport.provenance,
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

export function assertNoSensitiveFields(obj: unknown, path: string = ''): void {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    for (const pattern of FORBIDDEN_SENSITIVE_PATTERNS) {
      if (lowerKey.includes(pattern)) {
        throw new Error(`Inventory report contains forbidden sensitive property '${path ? `${path}.${key}` : key}'.`);
      }
    }
    if (typeof value === 'string') {
      const lowerVal = value.toLowerCase();
      for (const phrase of ['wallet seed', 'private key', 'backup password', 'secret salt']) {
        if (lowerVal.includes(phrase)) {
          throw new Error(`Inventory report contains forbidden sensitive data in '${path ? `${path}.${key}` : key}'.`);
        }
      }
    }
    if (value && typeof value === 'object') {
      assertNoSensitiveFields(value, path ? `${path}.${key}` : key);
    }
  }
}

export async function validateLiveInventoryReport(report: unknown): Promise<ValidatedLiveInventoryReport> {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Inventory report must be a JSON object.');
  }

  assertNoSensitiveFields(report);

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

export async function validateCertificationRequestPackage(pkg: unknown): Promise<CertificationRequestPackage> {
  if (!pkg || typeof pkg !== 'object') throw new Error('Package must be an object');
  const p = pkg as Record<string, unknown>;
  if (p.schema !== CERTIFICATION_REQUEST_SCHEMA) {
    throw new Error(`Invalid schema: expected '${CERTIFICATION_REQUEST_SCHEMA}', received '${String(p.schema)}'`);
  }
  if (p.network !== undefined && p.network !== 'preprod') {
    throw new Error("Invalid network: expected 'preprod'");
  }
  const contractAddress = validateContractAddress(p.contractAddress);
  if (!isHex(p.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex (64 chars)');
  }
  if (p.provenance !== 'live-host-scan' && p.provenance !== 'controlled-test-vector') {
    throw new Error(`Unsupported provenance: '${String(p.provenance)}'`);
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
    provenance: p.provenance,
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

export function validateCertifiedSnapshotPackage(pkg: unknown): CertifiedSnapshotPackage {
  if (!pkg || typeof pkg !== 'object') throw new Error('Package must be an object');
  const p = pkg as Record<string, unknown>;
  if (p.schema !== CERTIFIED_SNAPSHOT_SCHEMA) {
    throw new Error(`Invalid schema: expected '${CERTIFIED_SNAPSHOT_SCHEMA}', received '${String(p.schema)}'`);
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
