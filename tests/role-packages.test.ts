import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CERTIFIER_KEY_SCHEMA,
  MEMBER_ADMISSION_SCHEMA,
  CERTIFICATION_REQUEST_SCHEMA,
  CERTIFIED_SNAPSHOT_SCHEMA,
  ENCRYPTED_ENVELOPE_SCHEMA,
  PBKDF2_RECOMMENDED_ITERATIONS,
  MIN_PASSPHRASE_LENGTH,
  validateCertifierKeyPackage,
  validateMemberAdmissionPackage,
  validateCertificationRequestPackage,
  validateCertifiedSnapshotPackage,
  validateEncryptedEnvelope,
  buildCertificationRequestFromInventoryReport,
  encryptToEnvelope,
  unsafeDecryptFromEnvelope,
  decryptAndValidateEnvelope,
  computeMeasurementDigest,
  hexToBytes,
} from '../src/role-packages.ts';

const SAMPLE_HEX_32 = 'a1'.repeat(32);
const SAMPLE_HEX_32_B = 'b2'.repeat(32);
const SAMPLE_CONTRACT = '0200abcd1234ef567890abcdef1234567890abcdef1234567890abcdef123456';
const FIXED_NOW = new Date('2026-10-07T12:00:00.000Z');
const VALID_PASSPHRASE = 'SecurePassphrase2026!'; // 21 chars >= 12

// 1. Public certifier-key package round trip
test('1. Public certifier-key package round trip and validation', () => {
  const pkg = {
    schema: CERTIFIER_KEY_SCHEMA,
    certifierKey: SAMPLE_HEX_32.toUpperCase(),
    createdAt: FIXED_NOW.toISOString(),
  };

  const validated = validateCertifierKeyPackage(pkg);
  assert.equal(validated.schema, CERTIFIER_KEY_SCHEMA);
  assert.equal(validated.certifierKey, SAMPLE_HEX_32.toLowerCase());
  assert.equal(validated.createdAt, FIXED_NOW.toISOString());

  assert.throws(
    () => validateCertifierKeyPackage({ ...pkg, schema: 'commonveil.unknown/v1' }),
    /Invalid schema/,
  );
});

// 2. Member-admission validation
test('2. Member-admission validation', () => {
  const pkg = {
    schema: MEMBER_ADMISSION_SCHEMA,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    createdAt: FIXED_NOW.toISOString(),
  };

  const validated = validateMemberAdmissionPackage(pkg);
  assert.equal(validated.schema, MEMBER_ADMISSION_SCHEMA);
  assert.equal(validated.contractAddress, SAMPLE_CONTRACT);
  assert.equal(validated.memberCredential, SAMPLE_HEX_32);

  assert.throws(
    () => validateMemberAdmissionPackage({ ...pkg, contractAddress: '' }),
    /Contract address must be a non-empty string/,
  );
});

// 3. Live-scan certification request construction from inventory report
test('3. Live-scan certification request construction from self-consistent inventory report', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const inventoryReport = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
    status: 'detected',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    version: {
      raw: '5.2.5-2ubuntu1.1',
      normalized: '5.2.5',
      major: 5,
      minor: 2,
      patch: 5,
    },
    measurementDigest: digest,
  };

  const req = await buildCertificationRequestFromInventoryReport(inventoryReport, {
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    now: FIXED_NOW,
  });

  assert.equal(req.schema, CERTIFICATION_REQUEST_SCHEMA);
  assert.equal(req.provenance, 'live-host-scan');
  assert.equal(req.product, 'pkg:generic/xz-utils');
  assert.equal(req.rawVersion, '5.2.5-2ubuntu1.1');
  assert.deepEqual(req.version, { major: 5, minor: 2, patch: 5 });
  assert.equal(req.measurementDigest, digest);

  const validated = await validateCertificationRequestPackage(req);
  assert.equal(validated.provenance, 'live-host-scan');
});

// 4. Controlled-test-vector request remains labelled as such
test('4. Controlled-test-vector request remains labelled as such and is not converted', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.6.1');
  const inventoryReport = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'controlled-test-vector',
    status: 'detected',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    version: {
      raw: '5.6.1',
      normalized: '5.6.1',
      major: 5,
      minor: 6,
      patch: 1,
    },
    measurementDigest: digest,
  };

  const req = await buildCertificationRequestFromInventoryReport(inventoryReport, {
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    now: FIXED_NOW,
  });

  assert.equal(req.provenance, 'controlled-test-vector');
  const validated = await validateCertificationRequestPackage(req);
  assert.equal(validated.provenance, 'controlled-test-vector');
});

// 5. Inventory report consistency: normalized vs tuple mismatch, not-detected, empty rawVersion
test('5. Inventory report consistency: reject mismatch, not-detected, or empty rawVersion', async () => {
  const digest561 = await computeMeasurementDigest('pkg:generic/xz-utils', '5.6.1');

  // Normalized 5.6.1 with tuple 5.6.0 rejected
  const mismatchedTuple = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
    status: 'detected',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    version: {
      raw: '5.6.1',
      normalized: '5.6.1',
      major: 5,
      minor: 6,
      patch: 0, // derived tuple is 5.6.0, mismatch!
    },
    measurementDigest: digest561,
  };
  await assert.rejects(
    () => buildCertificationRequestFromInventoryReport(mismatchedTuple, {
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: SAMPLE_HEX_32,
    }),
    /normalized version mismatch/,
  );

  // Status not-detected rejected
  const notDetected = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
    status: 'not-detected',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
  };
  await assert.rejects(
    () => buildCertificationRequestFromInventoryReport(notDetected as any, {
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: SAMPLE_HEX_32,
    }),
    /status must be 'detected'/,
  );

  // Empty rawVersion rejected
  const emptyRaw = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
    status: 'detected',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    version: {
      raw: '',
      normalized: '5.6.1',
      major: 5,
      minor: 6,
      patch: 1,
    },
    measurementDigest: digest561,
  };
  await assert.rejects(
    () => buildCertificationRequestFromInventoryReport(emptyRaw, {
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: SAMPLE_HEX_32,
    }),
    /rawVersion must be a non-empty string/,
  );
});

// 6. Version integer safety: negative, fractions, MAX_SAFE_INTEGER + 1, above uint32
test('6. Version integer safety validation', () => {
  const base = {
    schema: CERTIFIED_SNAPSHOT_SCHEMA,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    product: 'pkg:generic/xz-utils',
    snapshotSalt: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    createdAt: FIXED_NOW.toISOString(),
  };

  // Negative value
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...base, version: { major: -1, minor: 0, patch: 0 } }),
    /valid VersionTuple with safe uint32 integers/,
  );

  // Fraction
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...base, version: { major: 1, minor: 2.5, patch: 0 } }),
    /valid VersionTuple with safe uint32 integers/,
  );

  // Number.MAX_SAFE_INTEGER + 1
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...base, version: { major: Number.MAX_SAFE_INTEGER + 1, minor: 0, patch: 0 } }),
    /valid VersionTuple with safe uint32 integers/,
  );

  // Above uint32 max (4,294,967,296)
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...base, version: { major: 4_294_967_296, minor: 0, patch: 0 } }),
    /valid VersionTuple with safe uint32 integers/,
  );
});

// 7. Invalid hex and incorrect byte-length rejection
test('7. Invalid hex and incorrect byte-length rejection', () => {
  assert.throws(
    () => validateCertifierKeyPackage({
      schema: CERTIFIER_KEY_SCHEMA,
      certifierKey: '1234abcd',
      createdAt: FIXED_NOW.toISOString(),
    }),
    /32-byte hex string/,
  );

  assert.throws(
    () => validateMemberAdmissionPackage({
      schema: MEMBER_ADMISSION_SCHEMA,
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: 'zz'.repeat(32),
      createdAt: FIXED_NOW.toISOString(),
    }),
    /32-byte hex string/,
  );
});

// 8. Hex decoding: direct test rejecting malformed hex like '0g'
test('8. hexToBytes rejects non-hex characters and odd lengths', () => {
  assert.throws(() => hexToBytes('0g'), /invalid non-hex characters/);
  assert.throws(() => hexToBytes('123'), /even length/);
  assert.deepEqual(hexToBytes('0a0b'), new Uint8Array([10, 11]));
});

// 9. Measurement-digest mismatch rejection
test('9. Measurement-digest mismatch rejection', async () => {
  const fakeDigest = '00'.repeat(32);
  const mismatchedReport = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
    status: 'detected',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    version: { raw: '5.6.1', normalized: '5.6.1', major: 5, minor: 6, patch: 1 },
    measurementDigest: fakeDigest,
  };

  await assert.rejects(
    () => buildCertificationRequestFromInventoryReport(mismatchedReport, {
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: SAMPLE_HEX_32,
    }),
    /measurementDigest mismatch/,
  );
});

// 10. Certified snapshot validation
test('10. Certified snapshot validation', () => {
  const pkg = {
    schema: CERTIFIED_SNAPSHOT_SCHEMA,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 1 },
    snapshotSalt: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    createdAt: FIXED_NOW.toISOString(),
  };

  const validated = validateCertifiedSnapshotPackage(pkg);
  assert.equal(validated.schema, CERTIFIED_SNAPSHOT_SCHEMA);
  assert.equal(validated.snapshotSalt, SAMPLE_HEX_32_B);
  assert.equal(validated.version.patch, 1);

  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...pkg, txId: '' }),
    /txId must be a valid hex transaction identifier/,
  );
});

// 11. Fixed 600,000 iterations requirement
test('11. Fixed 600,000 iterations requirement: rejects 599,999, 600,001 and non-integers', () => {
  const baseEnvelope = {
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    salt: '11'.repeat(16),
    iv: '22'.repeat(12),
    ciphertext: '33'.repeat(32),
    createdAt: FIXED_NOW.toISOString(),
  };

  assert.throws(
    () => validateEncryptedEnvelope({ ...baseEnvelope, iterations: 599_999 }),
    /iterations must be exactly 600000/,
  );
  assert.throws(
    () => validateEncryptedEnvelope({ ...baseEnvelope, iterations: 600_001 }),
    /iterations must be exactly 600000/,
  );
  assert.throws(
    () => validateEncryptedEnvelope({ ...baseEnvelope, iterations: 600_000.5 }),
    /iterations must be exactly 600000/,
  );

  const valid = validateEncryptedEnvelope({ ...baseEnvelope, iterations: 600_000 });
  assert.equal(valid.iterations, 600_000);
});

// 12. Authenticated metadata tampering rejection
test('12. Authenticated metadata tampering causes decryption failure', async () => {
  const payload = { roleSecret: 'sensitive-token' };
  const envelope = await encryptToEnvelope(payload, VALID_PASSPHRASE, { now: FIXED_NOW });

  // Tamper with createdAt
  const tamperedCreatedAt = { ...envelope, createdAt: new Date('2026-10-07T12:00:01.000Z').toISOString() };
  await assert.rejects(
    () => unsafeDecryptFromEnvelope(tamperedCreatedAt, VALID_PASSPHRASE),
    /tampered ciphertext\/metadata/,
  );

  // Tamper with salt
  const tamperedSalt = { ...envelope, salt: 'aa' + envelope.salt.slice(2) };
  await assert.rejects(
    () => unsafeDecryptFromEnvelope(tamperedSalt, VALID_PASSPHRASE),
    /tampered ciphertext\/metadata/,
  );

  // Tamper with iv
  const tamperedIv = { ...envelope, iv: 'bb' + envelope.iv.slice(2) };
  await assert.rejects(
    () => unsafeDecryptFromEnvelope(tamperedIv, VALID_PASSPHRASE),
    /tampered ciphertext\/metadata/,
  );
});

// 13. Passphrase policy: empty, 11-char, valid 12-char
test('13. Passphrase policy enforces minimum 12 Unicode characters', async () => {
  const payload = { item: 'value' };

  await assert.rejects(
    () => encryptToEnvelope(payload, ''),
    /at least 12 Unicode characters/,
  );
  await assert.rejects(
    () => encryptToEnvelope(payload, 'Short11Char'),
    /at least 12 Unicode characters/,
  );

  // Exactly 12 Unicode characters works
  const twelveChars = '123456789012';
  const env = await encryptToEnvelope(payload, twelveChars);
  const decrypted = await unsafeDecryptFromEnvelope(env, twelveChars);
  assert.deepEqual(decrypted, payload);
});

// 14. Safe decryption API: validates schema and filters out extra fields
test('14. Safe decryption API decryptAndValidateEnvelope', async () => {
  const validSnapshot: any = {
    schema: CERTIFIED_SNAPSHOT_SCHEMA,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 1 },
    snapshotSalt: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    createdAt: FIXED_NOW.toISOString(),
    extraAttackerSecret: 'injected-leak', // Extra unwhitelisted field
  };

  const envelope = await encryptToEnvelope(validSnapshot, VALID_PASSPHRASE);

  const validated = await decryptAndValidateEnvelope(
    envelope,
    VALID_PASSPHRASE,
    validateCertifiedSnapshotPackage,
  );

  assert.equal(validated.schema, CERTIFIED_SNAPSHOT_SCHEMA);
  assert.equal(validated.memberCredential, SAMPLE_HEX_32);
  assert.equal('extraAttackerSecret' in validated, false, 'Validator whitelist must exclude extra fields');

  // Wrong schema in decrypted data is rejected by validator
  const wrongSchemaPayload = { ...validSnapshot, schema: 'commonveil.wrong/v1' };
  const wrongEnv = await encryptToEnvelope(wrongSchemaPayload, VALID_PASSPHRASE);
  await assert.rejects(
    () => decryptAndValidateEnvelope(wrongEnv, VALID_PASSPHRASE, validateCertifiedSnapshotPackage),
    /Invalid schema/,
  );
});

// 15. JSON serialization safety: undefined and cyclic payload rejection
test('15. JSON serialization safety: undefined and cyclic payloads rejected', async () => {
  await assert.rejects(
    () => encryptToEnvelope(undefined, VALID_PASSPHRASE),
    /Payload cannot be undefined/,
  );

  const cyclic: any = {};
  cyclic.self = cyclic;
  await assert.rejects(
    () => encryptToEnvelope(cyclic, VALID_PASSPHRASE),
    /Payload serialization failed/,
  );
});

// 16. Resource bounds: salt, IV, ciphertext limits
test('16. Resource bounds: salt, iv, and ciphertext limits enforced', () => {
  const base = {
    schema: ENCRYPTED_ENVELOPE_SCHEMA,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: 600_000,
    salt: '11'.repeat(16),
    iv: '22'.repeat(12),
    ciphertext: '33'.repeat(32),
    createdAt: FIXED_NOW.toISOString(),
  };

  // Salt not 16 bytes
  assert.throws(
    () => validateEncryptedEnvelope({ ...base, salt: '11'.repeat(15) }),
    /salt must be exactly 16 bytes hex/,
  );

  // IV not 12 bytes
  assert.throws(
    () => validateEncryptedEnvelope({ ...base, iv: '22'.repeat(16) }),
    /iv must be exactly 12 bytes hex/,
  );

  // Ciphertext oversized (> 1 MiB)
  const oversizedCiphertext = 'a'.repeat(2 * 1024 * 1024 + 2); // > 1 MiB
  assert.throws(
    () => validateEncryptedEnvelope({ ...base, ciphertext: oversizedCiphertext }),
    /exceeds maximum allowed size/,
  );
});

// 17. Wrong passphrase and tampered ciphertext rejection
test('17. Wrong-passphrase and tampered-ciphertext rejection', async () => {
  const payload = { note: 'classified inventory' };
  const envelope = await encryptToEnvelope(payload, VALID_PASSPHRASE);

  await assert.rejects(
    () => unsafeDecryptFromEnvelope(envelope, 'IncorrectPassphrase123!'),
    /Failed to decrypt envelope: incorrect passphrase or tampered ciphertext\/metadata/,
  );

  const tamperedCiphertext = envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.endsWith('00') ? 'ff' : '00');
  const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };

  await assert.rejects(
    () => unsafeDecryptFromEnvelope(tamperedEnvelope, VALID_PASSPHRASE),
    /Failed to decrypt envelope: incorrect passphrase or tampered ciphertext\/metadata/,
  );
});

// 18. Fresh encryption produces different salt, IV and ciphertext
test('18. Fresh encryption produces different salt, IV and ciphertext', async () => {
  const payload = { test: 'consistent-data' };
  const env1 = await encryptToEnvelope(payload, VALID_PASSPHRASE);
  const env2 = await encryptToEnvelope(payload, VALID_PASSPHRASE);

  assert.notEqual(env1.salt, env2.salt);
  assert.notEqual(env1.iv, env2.iv);
  assert.notEqual(env1.ciphertext, env2.ciphertext);
});

// 19. No decrypted secret appears in serialized encrypted output
test('19. No decrypted secret appears in serialized encrypted output', async () => {
  const sensitiveString = 'highly-sensitive-member-private-token-xyz-12345';
  const payload = { sensitiveString };
  const envelope = await encryptToEnvelope(payload, VALID_PASSPHRASE);

  const serialized = JSON.stringify(envelope);
  assert.equal(serialized.includes(sensitiveString), false);
  assert.equal(serialized.includes(VALID_PASSPHRASE), false);
});
