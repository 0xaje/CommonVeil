/**
 * CV-007 Role package schemas, validation, and encrypted envelope.
 *
 * Enforces cryptographic role boundaries:
 * - Public: Certifier public key package.
 * - Restricted: Member admission request (one-way credential commitment, correlation sensitive).
 * - Private: Certification request, Certified snapshot package.
 * - Encrypted envelope: AES-256-GCM + PBKDF2-SHA-256 for private packages & secret backups.
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
  readonly iterations: number;
  readonly salt: string;       // hex (minimum 16 bytes)
  readonly iv: string;         // hex (12 bytes for AES-GCM)
  readonly ciphertext: string; // hex
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
 * 600,000 iterations for PBKDF2 with SHA-256 is recommended by OWASP Password Storage
 * Cheat Sheet (2023/2024 guidance) for password-based key derivation.
 */
export const PBKDF2_RECOMMENDED_ITERATIONS = 600_000;

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

export function isValidVersionTuple(version: unknown): version is VersionTuple {
  if (!version || typeof version !== 'object') return false;
  const v = version as Partial<VersionTuple>;
  return (
    Number.isInteger(v.major) && (v.major as number) >= 0 &&
    Number.isInteger(v.minor) && (v.minor as number) >= 0 &&
    Number.isInteger(v.patch) && (v.patch as number) >= 0
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
  if (inventoryReport.provenance !== 'live-host-scan' && inventoryReport.provenance !== 'controlled-test-vector') {
    throw new Error(`Unsupported inventory provenance: '${String(inventoryReport.provenance)}'`);
  }
  if (!inventoryReport.product || typeof inventoryReport.product !== 'string') {
    throw new Error('Inventory report must define product');
  }
  if (!inventoryReport.version || !isValidVersionTuple(inventoryReport.version)) {
    throw new Error('Inventory report has missing or invalid version tuple');
  }
  if (!inventoryReport.measurementDigest || !isHex(inventoryReport.measurementDigest, 32)) {
    throw new Error('Inventory report measurementDigest must be 32-byte hex');
  }
  if (!isValidIsoTimestamp(inventoryReport.observedAt)) {
    throw new Error('Inventory report observedAt must be a valid ISO timestamp');
  }

  // Verify measurement digest integrity
  const expectedDigest = await computeMeasurementDigest(
    inventoryReport.product,
    inventoryReport.version.normalized,
  );
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
    contractAddress,
    memberCredential: options.memberCredential.toLowerCase(),
    provenance: inventoryReport.provenance,
    product: inventoryReport.product,
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

export async function validateCertificationRequestPackage(pkg: unknown): Promise<CertificationRequestPackage> {
  if (!pkg || typeof pkg !== 'object') throw new Error('Package must be an object');
  const p = pkg as Record<string, unknown>;
  if (p.schema !== CERTIFICATION_REQUEST_SCHEMA) {
    throw new Error(`Invalid schema: expected '${CERTIFICATION_REQUEST_SCHEMA}', received '${String(p.schema)}'`);
  }
  const contractAddress = validateContractAddress(p.contractAddress);
  if (!isHex(p.memberCredential, 32)) {
    throw new Error('memberCredential must be 32-byte hex (64 chars)');
  }
  if (p.provenance !== 'live-host-scan' && p.provenance !== 'controlled-test-vector') {
    throw new Error(`Unsupported provenance: '${String(p.provenance)}'`);
  }
  if (typeof p.product !== 'string' || p.product.trim().length === 0) {
    throw new Error('product must be a non-empty string');
  }
  if (typeof p.rawVersion !== 'string' || p.rawVersion.trim().length === 0) {
    throw new Error('rawVersion must be a non-empty string');
  }
  if (!isValidVersionTuple(p.version)) {
    throw new Error('version must be a valid VersionTuple');
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

  const normalized = `${p.version.major}.${p.version.minor}.${p.version.patch}`;
  const expectedDigest = await computeMeasurementDigest(p.product, normalized);
  if ((p.measurementDigest as string).toLowerCase() !== expectedDigest.toLowerCase()) {
    throw new Error(`measurementDigest does not match normalized product/version measurement`);
  }

  return {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    contractAddress,
    memberCredential: (p.memberCredential as string).toLowerCase(),
    provenance: p.provenance,
    product: p.product,
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
    throw new Error('product must be a non-empty string');
  }
  if (!isValidVersionTuple(p.version)) {
    throw new Error('version must be a valid VersionTuple');
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
    product: p.product,
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
  if (typeof e.iterations !== 'number' || !Number.isInteger(e.iterations) || e.iterations < 100_000) {
    throw new Error('iterations must be an integer >= 100,000');
  }
  if (!isHex(e.salt) || (e.salt as string).length < 32) {
    throw new Error('salt must be a hex string of at least 16 bytes (32 chars)');
  }
  if (!isHex(e.iv, 12)) {
    throw new Error('iv must be 12-byte hex (24 chars) for AES-256-GCM');
  }
  if (!isHex(e.ciphertext) || (e.ciphertext as string).length === 0) {
    throw new Error('ciphertext must be a non-empty hex string');
  }
  if (!isValidIsoTimestamp(e.createdAt)) {
    throw new Error('createdAt must be a valid ISO-8601 UTC timestamp');
  }

  return {
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: e.iterations,
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
  if (hex.length % 2 !== 0) throw new Error('Hex string must have an even length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('Invalid byte in hex string');
    bytes[i] = byte;
  }
  return bytes;
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
    iterations?: number;
    now?: Date;
  },
): Promise<EncryptedEnvelope> {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new Error('Passphrase must be a non-empty string');
  }
  const iterations = options?.iterations ?? PBKDF2_RECOMMENDED_ITERATIONS;
  if (iterations < 100_000) {
    throw new Error('iterations must be at least 100,000');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassphrase(passphrase, salt, iterations);

  const serialized = JSON.stringify(payload);
  const encodedPayload = new TextEncoder().encode(serialized);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedPayload,
  );

  const now = options?.now ?? new Date();

  return {
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(ciphertextBuffer)),
    createdAt: now.toISOString(),
  };
}

export async function decryptFromEnvelope<T = unknown>(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<T> {
  const validEnvelope = validateEncryptedEnvelope(envelope);
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new Error('Passphrase must be a non-empty string');
  }

  const saltBytes = hexToBytes(validEnvelope.salt);
  const ivBytes = hexToBytes(validEnvelope.iv);
  const ciphertextBytes = hexToBytes(validEnvelope.ciphertext);

  const key = await deriveKeyFromPassphrase(passphrase, saltBytes, validEnvelope.iterations);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as Uint8Array<ArrayBuffer> },
      key,
      ciphertextBytes as Uint8Array<ArrayBuffer>,
    );
  } catch (_error) {
    throw new Error('Failed to decrypt envelope: incorrect passphrase or tampered ciphertext');
  }

  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  try {
    return JSON.parse(decryptedText) as T;
  } catch (_error) {
    throw new Error('Decrypted payload is not valid JSON');
  }
}
