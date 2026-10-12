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
  MAX_CIPHERTEXT_BYTES,
  MAX_PLAINTEXT_BYTES,
  AES_GCM_TAG_BYTES,
  validateCertifierKeyPackage,
  validateMemberAdmissionPackage,
  validateCertificationRequestPackage,
  buildCertifiedSnapshotPackage,
  validateCertifiedSnapshotPackage,
  validateInventoryCertificationReceipt,
  buildInventoryCertificationReceipt,
  INVENTORY_CERTIFICATION_RECEIPT_SCHEMA,
  validateEncryptedEnvelope,
  buildCertificationRequestFromInventoryReport,
  encryptToEnvelope,
  unsafeDecryptFromEnvelope,
  decryptAndValidateEnvelope,
  computeMeasurementDigest,
  hexToBytes,
  INVENTORY_REPORT_SCHEMA,
  validateLiveInventoryReport,
  buildCertificationRequestPackage,
  assertNoSensitiveFields,
  AFFECTED_RELEASE_POLICY_SCHEMA,
  AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA,
  advisoryDigest,
  validateAffectedReleasePolicyPackage,
  buildAffectedReleasePolicyPackage,
  validateAffectedReleaseRegistrationReceipt,
  buildAffectedReleaseRegistrationReceipt,
  validateHttpsUrl,
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

// 4. Controlled-test-vector cannot pass operational certification-request validation or construction
test('4. Controlled-test-vector cannot pass operational certification-request validation or construction', async () => {
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

  // buildCertificationRequestFromInventoryReport rejects non-live provenance
  await assert.rejects(
    () =>
      buildCertificationRequestFromInventoryReport(inventoryReport, {
        contractAddress: SAMPLE_CONTRACT,
        memberCredential: SAMPLE_HEX_32,
        now: FIXED_NOW,
      }),
    /commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );

  // Directly structured package with controlled-test-vector fails validateCertificationRequestPackage
  const controlledPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'controlled-test-vector' as any,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.6.1',
    version: { major: 5, minor: 6, patch: 1 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  await assert.rejects(
    () => validateCertificationRequestPackage(controlledPkg),
    /commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );
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
    network: 'preprod' as const,
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
    network: 'preprod' as const,
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
  assert.equal(validated.network, 'preprod');
  assert.equal(validated.snapshotSalt, SAMPLE_HEX_32_B);
  assert.equal(validated.version.patch, 1);

  // Unknown field is rejected (strict boundary, not whitelisted)
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...pkg, extraAttackerField: 'injected' }),
    /authorized top-level fields/,
  );

  // Invalid network rejected
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...pkg, network: 'mainnet' }),
    /authorized top-level fields|Invalid network/,
  );

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

// 14. Safe decryption API: validates schema and strictly rejects extra fields
test('14. Safe decryption API decryptAndValidateEnvelope', async () => {
  // Valid snapshot (all 10 required fields, no extras)
  const validSnapshot = {
    schema: CERTIFIED_SNAPSHOT_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 1 },
    snapshotSalt: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    createdAt: FIXED_NOW.toISOString(),
  };

  const envelope = await encryptToEnvelope(validSnapshot, VALID_PASSPHRASE);
  const validated = await decryptAndValidateEnvelope(
    envelope,
    VALID_PASSPHRASE,
    validateCertifiedSnapshotPackage,
  );

  assert.equal(validated.schema, CERTIFIED_SNAPSHOT_SCHEMA);
  assert.equal(validated.network, 'preprod');
  assert.equal(validated.memberCredential, SAMPLE_HEX_32);

  // Snapshot with an extra attacker-injected field must be REJECTED
  // (strict boundary enforcement — not silently whitelisted)
  const snapshotWithExtra = { ...validSnapshot, extraAttackerSecret: 'injected-leak' };
  const extraEnv = await encryptToEnvelope(snapshotWithExtra, VALID_PASSPHRASE);
  await assert.rejects(
    () => decryptAndValidateEnvelope(extraEnv, VALID_PASSPHRASE, validateCertifiedSnapshotPackage),
    /authorized top-level fields/,
  );

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

// 20. AES-GCM payload boundary: fits at max permitted boundary, ciphertext fits MAX_CIPHERTEXT_BYTES, envelope validates
test('20. Payload at exactly MAX_PLAINTEXT_BYTES encrypts, does not exceed MAX_CIPHERTEXT_BYTES, and envelope validates', async () => {
  // Construct a JSON string whose UTF-8 encoded length is exactly MAX_PLAINTEXT_BYTES
  // JSON format: "{\"p\":\"...\"}"
  const prefix = '{"p":"';
  const suffix = '"}';
  const neededFill = MAX_PLAINTEXT_BYTES - prefix.length - suffix.length;
  const fill = 'a'.repeat(neededFill);
  const exactPayload = { p: fill };

  const serialized = JSON.stringify(exactPayload);
  const encoded = new TextEncoder().encode(serialized);
  assert.equal(encoded.length, MAX_PLAINTEXT_BYTES, 'Encoded plaintext must match MAX_PLAINTEXT_BYTES exactly');

  const envelope = await encryptToEnvelope(exactPayload, VALID_PASSPHRASE);
  const ciphertextBytes = hexToBytes(envelope.ciphertext);

  // Ciphertext byte length must be MAX_PLAINTEXT_BYTES + AES_GCM_TAG_BYTES = MAX_CIPHERTEXT_BYTES
  assert.equal(ciphertextBytes.length, MAX_CIPHERTEXT_BYTES);
  assert.equal(ciphertextBytes.length <= MAX_CIPHERTEXT_BYTES, true);

  // Produced envelope must validate
  const validated = validateEncryptedEnvelope(envelope);
  assert.equal(validated.schema, ENCRYPTED_ENVELOPE_SCHEMA);

  // Decrypt and verify payload
  const decrypted = await unsafeDecryptFromEnvelope<typeof exactPayload>(envelope, VALID_PASSPHRASE);
  assert.equal(decrypted.p.length, neededFill);
});

// 21. AES-GCM payload boundary: payload one byte over MAX_PLAINTEXT_BYTES is rejected before encryption
test('21. Payload one encoded byte over MAX_PLAINTEXT_BYTES is rejected before encryption', async () => {
  const prefix = '{"p":"';
  const suffix = '"}';
  const neededFill = MAX_PLAINTEXT_BYTES - prefix.length - suffix.length + 1; // 1 byte over limit
  const fill = 'a'.repeat(neededFill);
  const oversizedPayload = { p: fill };

  const serialized = JSON.stringify(oversizedPayload);
  const encoded = new TextEncoder().encode(serialized);
  assert.equal(encoded.length, MAX_PLAINTEXT_BYTES + 1);

  await assert.rejects(
    () => encryptToEnvelope(oversizedPayload, VALID_PASSPHRASE),
    /exceeds maximum permitted plaintext limit/,
  );
});

// 22. Multibyte Unicode case: byte length—not character count—is enforced
test('22. Multibyte Unicode: enforces UTF-8 byte length rather than JavaScript string length', async () => {
  // The Euro symbol '€' is 1 JS character (length 1), but 3 UTF-8 bytes: [0xE2, 0x82, 0xAC]
  const prefix = '{"p":"';
  const suffix = '"}';
  const baseLen = prefix.length + suffix.length;

  // Let's create a string where char count < MAX_PLAINTEXT_BYTES, but UTF-8 byte count exceeds MAX_PLAINTEXT_BYTES
  // Using 400,000 '€' characters:
  // char length = 400,000 (< 1,048,560)
  // UTF-8 byte length = 400,000 * 3 = 1,200,000 (> 1,048,560)
  const euroCount = 400_000;
  const unicodePayload = { p: '€'.repeat(euroCount) };
  assert.equal(JSON.stringify(unicodePayload).length < MAX_PLAINTEXT_BYTES, true, 'String character length is within bounds');

  const encodedBytes = new TextEncoder().encode(JSON.stringify(unicodePayload)).length;
  assert.equal(encodedBytes > MAX_PLAINTEXT_BYTES, true, 'Encoded UTF-8 byte length exceeds plaintext limit');

  await assert.rejects(
    () => encryptToEnvelope(unicodePayload, VALID_PASSPHRASE),
    /exceeds maximum permitted plaintext limit/,
  );
});

// 23. Genuine live inventory report from scan validates strictly
test('23. Genuine live inventory report from scan validates strictly', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const genuineReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    host: {
      fingerprint: '95897a16db4752e1b81ef93f60ea2e58f9119e77688e771c59e439b527219e11',
      platform: 'linux',
      release: '5.15.153.1-microsoft-standard-WSL2',
    },
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    source: 'dpkg-query',
    version: {
      raw: '5.2.5-2ubuntu1.1',
      normalized: '5.2.5',
      major: 5,
      minor: 2,
      patch: 5,
    },
    policyAssessment: {
      advisory: 'CVE-2024-3094',
      exactRegisteredSet: ['5.6.0', '5.6.1'],
      result: 'outside-exact-set',
    },
    measurementDigest: digest,
    attempts: [],
  };

  const validated = await validateLiveInventoryReport(genuineReport);
  assert.equal(validated.schema, 'commonveil.inventory/v1');
  assert.equal(validated.provenance, 'live-host-scan');
  assert.equal(validated.status, 'detected');
  assert.equal(validated.product, 'pkg:generic/xz-utils');
  assert.equal(validated.rawVersion, '5.2.5-2ubuntu1.1');
  assert.equal(validated.normalizedVersion, '5.2.5');
  assert.deepEqual(validated.version, { major: 5, minor: 2, patch: 5 });
  assert.equal(validated.measurementDigest, digest);
  assert.equal(validated.observedAt, FIXED_NOW.toISOString());
  // Ensures host fingerprint and internal extra fields were stripped from the validated report
  assert.equal('host' in validated, false);
  assert.equal('policyAssessment' in validated, false);
});

// 24. Live inventory report with altered measurementDigest is rejected
test('24. Live inventory report with altered measurementDigest is rejected', async () => {
  const tamperedDigest = 'ff'.repeat(32);
  const report = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: {
      raw: '5.2.5-2ubuntu1.1',
      normalized: '5.2.5',
      major: 5,
      minor: 2,
      patch: 5,
    },
    measurementDigest: tamperedDigest,
  };

  await assert.rejects(
    () => validateLiveInventoryReport(report),
    /Inventory report measurementDigest mismatch/,
  );
});

// 25. Non-live provenance strictly rejected in live validator
test('25. Non-live provenance (controlled-test-vector, fake, or custom) strictly rejected in live validator', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.6.1');
  const base = {
    schema: 'commonveil.inventory/v1',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: {
      raw: '5.6.1',
      normalized: '5.6.1',
      major: 5,
      minor: 6,
      patch: 1,
    },
    measurementDigest: digest,
  };

  // controlled-test-vector must be rejected by live inventory validator
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, provenance: 'controlled-test-vector' }),
    /Invalid inventory provenance: expected 'live-host-scan'/,
  );

  // arbitrary or fabricated provenance rejected
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, provenance: 'fabricated-test-data' }),
    /Invalid inventory provenance: expected 'live-host-scan'/,
  );
});

// 26. Inventory report status not 'detected' is rejected
test('26. Inventory report status not detected is rejected', async () => {
  const notDetectedReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'not-detected',
  };

  await assert.rejects(
    () => validateLiveInventoryReport(notDetectedReport),
    /Inventory report status must be 'detected'/,
  );
});

// 27. Malformed versions are rejected
test('27. Malformed versions (missing raw, negative, fraction, unsafe integer, normalized mismatch) are rejected', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const base = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    measurementDigest: digest,
  };

  // Missing rawVersion
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, version: { raw: '', normalized: '5.2.5', major: 5, minor: 2, patch: 5 } }),
    /rawVersion must be a non-empty string/,
  );

  // Negative integer
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, version: { raw: '5.2.5', normalized: '5.2.5', major: -5, minor: 2, patch: 5 } }),
    /version tuple integers must be safe non-negative integers/,
  );

  // Floating point fraction
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, version: { raw: '5.2.5', normalized: '5.2.5', major: 5, minor: 2.5, patch: 5 } }),
    /version tuple integers must be safe non-negative integers/,
  );

  // Exceeding UINT32_MAX
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, version: { raw: '5.2.5', normalized: '5.2.5', major: 4_294_967_296, minor: 2, patch: 5 } }),
    /version tuple integers must be safe non-negative integers/,
  );

  // Normalized mismatch: normalized '5.2.5' vs tuple 5.2.4
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, version: { raw: '5.2.5', normalized: '5.2.5', major: 5, minor: 2, patch: 4 } }),
    /normalized version mismatch/,
  );
});

// 28. Forbidden sensitive fields in live inventory report are rejected
test('28. Forbidden sensitive fields in live inventory report are rejected (root, nested, or values)', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const base = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: { raw: '5.2.5', normalized: '5.2.5', major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
  };

  // Rejects memberSecret
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, memberSecret: 'ee'.repeat(32) }),
    /forbidden sensitive property 'memberSecret'/,
  );

  // Rejects salt
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, salt: 'ee'.repeat(32) }),
    /forbidden sensitive property 'salt'/,
  );

  // Rejects nested privateKey
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, host: { privateKey: 'injected-key' } }),
    /forbidden sensitive property 'host.privateKey'/,
  );

  // Rejects passphrase or password
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, backupPassword: 'Password12345!' }),
    /forbidden sensitive property 'backupPassword'/,
  );

  // Rejects wallet seed
  await assert.rejects(
    () => validateLiveInventoryReport({ ...base, walletSeed: 'twelve words mnemonic seed phrase' }),
    /forbidden sensitive property 'walletSeed'/,
  );
});

// 29. Invalid observedAt timestamp is rejected
test('29. Invalid observedAt timestamp is rejected', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const base = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: 'not-a-timestamp',
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: { raw: '5.2.5', normalized: '5.2.5', major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
  };

  await assert.rejects(
    () => validateLiveInventoryReport(base),
    /observedAt must be a valid ISO-8601 UTC timestamp/,
  );
});

// 30. Certification request package construction contains exactly the 11 required fields including network: preprod
test('30. Certification request package construction contains exactly the 11 required fields including network: preprod', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validatedReport = await validateLiveInventoryReport({
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: { raw: '5.2.5-2ubuntu1.1', normalized: '5.2.5', major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
  });

  const certReq = buildCertificationRequestPackage({
    inventoryReport: validatedReport,
    contractAddress: SAMPLE_CONTRACT,
    memberCredentialHex: SAMPLE_HEX_32,
    now: FIXED_NOW,
  });

  const expectedKeys = [
    'contractAddress',
    'createdAt',
    'measurementDigest',
    'memberCredential',
    'network',
    'observedAt',
    'product',
    'provenance',
    'rawVersion',
    'schema',
    'version',
  ].sort();

  assert.equal(expectedKeys.length, 11);
  assert.equal(Object.keys(certReq).length, 11);
  assert.deepEqual(Object.keys(certReq).sort(), expectedKeys);
  assert.equal(certReq.schema, CERTIFICATION_REQUEST_SCHEMA);
  assert.equal(certReq.network, 'preprod');
  assert.equal(certReq.contractAddress, SAMPLE_CONTRACT);
  assert.equal(certReq.memberCredential, SAMPLE_HEX_32);
  assert.equal(certReq.provenance, 'live-host-scan');
  assert.equal(certReq.product, 'pkg:generic/xz-utils');
  assert.equal(certReq.rawVersion, '5.2.5-2ubuntu1.1');
  assert.deepEqual(certReq.version, { major: 5, minor: 2, patch: 5 });
  assert.equal(certReq.measurementDigest, digest);
  assert.equal(certReq.observedAt, FIXED_NOW.toISOString());
  assert.equal(certReq.createdAt, FIXED_NOW.toISOString());
});

// 31. Host fingerprint, platform, release, username, and machine data strictly excluded from certification request package
test('31. Host fingerprint, platform, release, username, and machine data strictly excluded from certification request package', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const genuineReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    host: {
      fingerprint: '95897a16db4752e1b81ef93f60ea2e58f9119e77688e771c59e439b527219e11',
      platform: 'linux',
      release: '5.15.153.1-microsoft-standard-WSL2',
      hostname: 'my-workstation-node',
      username: 'corp-user',
    },
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    source: 'dpkg-query',
    version: {
      raw: '5.2.5-2ubuntu1.1',
      normalized: '5.2.5',
      major: 5,
      minor: 2,
      patch: 5,
    },
    measurementDigest: digest,
  };

  const validatedReport = await validateLiveInventoryReport(genuineReport);
  const certReq = buildCertificationRequestPackage({
    inventoryReport: validatedReport,
    contractAddress: SAMPLE_CONTRACT,
    memberCredentialHex: SAMPLE_HEX_32,
    now: FIXED_NOW,
  });

  const serialized = JSON.stringify(certReq);
  assert.equal(serialized.includes('fingerprint'), false);
  assert.equal(serialized.includes('my-workstation-node'), false);
  assert.equal(serialized.includes('corp-user'), false);
  assert.equal(serialized.includes('WSL2'), false);
  assert.equal('host' in certReq, false);
});

// 32. Certification request package validation verifies network preprod and rejects wrong network or mismatched digest
test('32. Certification request package validation verifies network preprod and rejects wrong network or mismatched digest', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'live-host-scan' as const,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  const validated = await validateCertificationRequestPackage(validPkg);
  assert.equal(validated.network, 'preprod');

  // Wrong network rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, network: 'mainnet' as any }),
    /Invalid network: expected 'preprod'/,
  );

  // Mismatched measurementDigest rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, measurementDigest: '00'.repeat(32) }),
    /measurementDigest does not match normalized product\/version measurement/,
  );
});

// 33. validateCertificationRequestPackage rejects unknown extra top-level fields, host fingerprint, username, machine name
test('33. validateCertificationRequestPackage rejects unknown extra top-level fields, host fingerprint, username, machine name', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'live-host-scan' as const,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  // Unknown arbitrary top-level field rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, extraField: 'unauthorized-data' } as any),
    /Certification request contains unauthorized top-level fields: extraField/,
  );

  // Host metadata rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, host: { fingerprint: 'abc' } } as any),
    /Certification request contains unauthorized top-level fields: host/,
  );

  // Direct fingerprint field rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, fingerprint: 'abc' } as any),
    /Certification request contains unauthorized top-level fields: fingerprint/,
  );

  // Username rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, username: 'operator-1' } as any),
    /Certification request contains unauthorized top-level fields: username/,
  );

  // Machine name rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, machineName: 'node-cluster-a' } as any),
    /Certification request contains unauthorized top-level fields: machineName/,
  );
});

// 34. validateCertificationRequestPackage rejects secret, salt, passphrase, private key, wallet seed
test('34. validateCertificationRequestPackage rejects secret, salt, passphrase, private key, wallet seed', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'live-host-scan' as const,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  // Secret property rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, memberSecret: 'secret123' } as any),
    /Certification request contains forbidden sensitive property 'memberSecret'/,
  );

  // Salt property rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, salt: 'salt123' } as any),
    /Certification request contains forbidden sensitive property 'salt'/,
  );

  // Passphrase property rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, passphrase: 'password123' } as any),
    /Certification request contains forbidden sensitive property 'passphrase'/,
  );

  // Private key property rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, privateKey: 'key123' } as any),
    /Certification request contains forbidden sensitive property 'privateKey'/,
  );

  // Wallet seed property rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, walletSeed: 'seed phrase' } as any),
    /Certification request contains forbidden sensitive property 'walletSeed'/,
  );

  // Sensitive phrase inside string value rejected
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, product: 'pkg:generic/xz-utils wallet seed' }),
    /Certification request contains forbidden sensitive data in 'product'/,
  );
});

// 35. validateCertificationRequestPackage rejects missing/incorrect network, malformed contract address/credential/digest
test('35. validateCertificationRequestPackage rejects missing/incorrect network, malformed contract address/credential/digest', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'live-host-scan' as const,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  // Missing or wrong network
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, network: undefined as any }),
    /Invalid network: expected 'preprod'/,
  );
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, network: 'testnet' as any }),
    /Invalid network: expected 'preprod'/,
  );

  // Malformed contract address
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, contractAddress: '' }),
    /Contract address must be a non-empty string/,
  );
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, contractAddress: '   ' }),
    /Contract address must be a non-empty string/,
  );

  // Malformed memberCredential
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, memberCredential: 'not-hex-at-all' }),
    /memberCredential must be 32-byte hex \(64 chars\)/,
  );
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, memberCredential: 'aa'.repeat(31) }),
    /memberCredential must be 32-byte hex \(64 chars\)/,
  );

  // Malformed measurementDigest
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, measurementDigest: 'short-digest' }),
    /measurementDigest must be 32-byte hex \(64 chars\)/,
  );
});

// 36. validateCertificationRequestPackage rejects invalid or non-canonical timestamps
test('36. validateCertificationRequestPackage rejects invalid or non-canonical timestamps', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'live-host-scan' as const,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  // Invalid date strings
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, observedAt: 'invalid-date' }),
    /observedAt must be a valid ISO-8601 UTC timestamp/,
  );
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, createdAt: 'not-a-timestamp' }),
    /createdAt must be a valid ISO-8601 UTC timestamp/,
  );

  // Non-canonical format: missing Z
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, observedAt: '2026-10-11T03:00:00' }),
    /observedAt must be a valid ISO-8601 UTC timestamp/,
  );

  // Non-canonical format: non-UTC timezone offset (+02:00)
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, createdAt: '2026-10-11T05:00:00.000+02:00' }),
    /createdAt must be a valid ISO-8601 UTC timestamp/,
  );
});

// 37. validateCertificationRequestPackage strictly rejects non-live provenance even with valid digest
test('37. validateCertificationRequestPackage strictly rejects non-live provenance even with valid digest', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validPkg = {
    schema: CERTIFICATION_REQUEST_SCHEMA,
    network: 'preprod' as const,
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    provenance: 'live-host-scan' as const,
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
  };

  // Genuine live-host-scan passes
  const validated = await validateCertificationRequestPackage(validPkg);
  assert.equal(validated.provenance, 'live-host-scan');

  // controlled-test-vector fails even though digest is 100% mathematically valid
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, provenance: 'controlled-test-vector' as any }),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );

  // demo fails
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, provenance: 'demo' as any }),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );

  // simulated fails
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, provenance: 'simulated' as any }),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );

  // mock fails
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, provenance: 'mock' as any }),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );

  // synthetic fails
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, provenance: 'synthetic' as any }),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );

  // undefined fails
  await assert.rejects(
    () => validateCertificationRequestPackage({ ...validPkg, provenance: undefined as any }),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );
});

// 38. Changing live-host-scan to controlled-test-vector after construction fails validation
test('38. Changing live-host-scan to controlled-test-vector after construction fails validation', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validatedReport = await validateLiveInventoryReport({
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: { raw: '5.2.5-2ubuntu1.1', normalized: '5.2.5', major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
  });

  const certReq = buildCertificationRequestPackage({
    inventoryReport: validatedReport,
    contractAddress: SAMPLE_CONTRACT,
    memberCredentialHex: SAMPLE_HEX_32,
    now: FIXED_NOW,
  });

  // Valid constructed package passes
  const validResult = await validateCertificationRequestPackage(certReq);
  assert.equal(validResult.provenance, 'live-host-scan');

  // Altering provenance to controlled-test-vector post-construction fails validation
  const tampered = { ...certReq, provenance: 'controlled-test-vector' as any };
  await assert.rejects(
    () => validateCertificationRequestPackage(tampered),
    /Invalid provenance: commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );
});

// 39. buildCertificationRequestPackage strictly rejects reports with non-live provenance
test('39. buildCertificationRequestPackage strictly rejects reports with non-live provenance', () => {
  assert.throws(
    () =>
      buildCertificationRequestPackage({
        inventoryReport: {
          schema: 'commonveil.inventory/v1',
          provenance: 'controlled-test-vector' as any,
          status: 'detected',
          product: 'pkg:generic/xz-utils',
          rawVersion: '5.6.1',
          version: { major: 5, minor: 6, patch: 1 },
          normalizedVersion: '5.6.1',
          measurementDigest: '00'.repeat(32),
          observedAt: FIXED_NOW.toISOString(),
        },
        contractAddress: SAMPLE_CONTRACT,
        memberCredentialHex: SAMPLE_HEX_32,
        now: FIXED_NOW,
      }),
    /commonveil\.certification-request\/v1 accepts genuine live-host-scan provenance only/,
  );
});

// 40. Inventory certification receipt construction and validation
test('40. Inventory certification receipt construction, validation, and field strictness', () => {
  const receipt = buildInventoryCertificationReceipt({
    contractAddress: SAMPLE_CONTRACT,
    certifierKey: SAMPLE_HEX_32,
    memberCredential: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    certificationTxId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    now: FIXED_NOW,
  });

  assert.equal(receipt.schema, INVENTORY_CERTIFICATION_RECEIPT_SCHEMA);
  assert.equal(receipt.network, 'preprod');
  assert.equal(receipt.contractAddress, SAMPLE_CONTRACT);
  assert.equal(receipt.certifierKey, SAMPLE_HEX_32);
  assert.equal(receipt.memberCredential, SAMPLE_HEX_32_B);
  assert.equal(receipt.commitment, 'cc'.repeat(32));
  assert.equal(receipt.status, 'finalized');
  assert.equal(receipt.certifiedAt, FIXED_NOW.toISOString());

  const validated = validateInventoryCertificationReceipt(receipt);
  assert.deepEqual(validated, receipt);

  // Strict boundary: extra field is rejected
  assert.throws(
    () => validateInventoryCertificationReceipt({ ...receipt, injectedAttackerProp: 'leak' }),
    /unauthorized top-level fields/,
  );

  // Status must be finalized
  assert.throws(
    () => validateInventoryCertificationReceipt({ ...receipt, status: 'pending' as any }),
    /status must be 'finalized'/,
  );
});

// 41. Certified snapshot construction, encryption envelope round-trip, and strict validation
test('41. Certified snapshot construction, encryption envelope round-trip, and strict validation', async () => {
  const snapshot = buildCertifiedSnapshotPackage({
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 1 },
    snapshotSalt: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    now: FIXED_NOW,
  });

  assert.equal(snapshot.schema, CERTIFIED_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.network, 'preprod');
  assert.equal(snapshot.version.major, 5);
  assert.equal(snapshot.version.minor, 6);
  assert.equal(snapshot.version.patch, 1);
  assert.equal(Object.keys(snapshot).length, 10);

  // Encrypt to envelope with 600,000 iterations
  const envelope = await encryptToEnvelope(snapshot, VALID_PASSPHRASE, { now: FIXED_NOW });
  assert.equal(envelope.iterations, 600_000);

  // Decrypt and validate with strict validator
  const restored = await decryptAndValidateEnvelope(
    envelope,
    VALID_PASSPHRASE,
    validateCertifiedSnapshotPackage,
  );
  assert.deepEqual(restored, snapshot);

  // Tampering with ciphertext fails decryption
  const tampered = { ...envelope, ciphertext: '00'.repeat(envelope.ciphertext.length / 2) };
  await assert.rejects(
    () => decryptAndValidateEnvelope(tampered, VALID_PASSPHRASE, validateCertifiedSnapshotPackage),
    /tampered ciphertext\/metadata/,
  );
});

// 42. Exclusion of private and sensitive material from receipt and snapshot
test('42. Exclusion of private secrets from receipt and snapshot packages', () => {
  const receipt = buildInventoryCertificationReceipt({
    contractAddress: SAMPLE_CONTRACT,
    certifierKey: SAMPLE_HEX_32,
    memberCredential: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    certificationTxId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
  });
  assertNoSensitiveFields(receipt);
  assert.equal('certifierSecret' in receipt, false);
  assert.equal('memberSecret' in receipt, false);

  const snapshot = buildCertifiedSnapshotPackage({
    contractAddress: SAMPLE_CONTRACT,
    memberCredential: SAMPLE_HEX_32,
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 1 },
    snapshotSalt: SAMPLE_HEX_32_B,
    commitment: 'cc'.repeat(32),
    txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
  });
  assert.equal('certifierSecret' in snapshot, false);
  assert.equal('memberSecret' in snapshot, false);
  assert.equal('privateKey' in snapshot, false);
});

// 43. CV-010: Valid affected-release policy package round trip & whitelist validation
test('43. CV-010: Valid affected-release policy package round trip & whitelist validation', () => {
  const pkg = buildAffectedReleasePolicyPackage({
    contractAddress: SAMPLE_CONTRACT,
    advisoryId: 'CVE-2024-3094',
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 0 },
    sourcePublisher: 'Red Hat / CISA',
    sourceReference: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094',
    sourcePublicationDate: '2024-03-29T00:00:00.000Z',
    now: FIXED_NOW,
  });

  assert.equal(pkg.schema, AFFECTED_RELEASE_POLICY_SCHEMA);
  assert.equal(pkg.network, 'preprod');
  assert.equal(pkg.contractAddress, SAMPLE_CONTRACT);
  assert.equal(pkg.advisoryId, 'CVE-2024-3094');
  assert.equal(pkg.product, 'pkg:generic/xz-utils');
  assert.deepEqual(pkg.version, { major: 5, minor: 6, patch: 0 });
  assert.equal(pkg.sourcePublisher, 'Red Hat / CISA');
  assert.equal(pkg.sourceReference, 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094');
  assert.equal(pkg.sourcePublicationDate, '2024-03-29T00:00:00.000Z');
  assert.equal(pkg.createdAt, FIXED_NOW.toISOString());

  // Strict whitelist: extra field rejection
  assert.throws(
    () => validateAffectedReleasePolicyPackage({ ...pkg, extraField: 'unauthorized' }),
    /unauthorized top-level fields/,
  );

  // Sensitive field rejection
  assert.throws(
    () => validateAffectedReleasePolicyPackage({ ...pkg, adminSecret: 'leak' }),
    /unauthorized top-level fields|forbidden field/i,
  );
});

// 44. CV-010: HTTPS sourceReference enforcement
test('44. CV-010: HTTPS sourceReference validation enforces valid HTTPS URLs', () => {
  assert.equal(
    validateHttpsUrl('https://example.com/advisory'),
    'https://example.com/advisory',
  );

  // Insecure HTTP rejected
  assert.throws(
    () => validateHttpsUrl('http://insecure.com/advisory'),
    /HTTPS URL/,
  );

  // Non-URL rejected
  assert.throws(
    () => validateHttpsUrl('not-a-url'),
    /valid URL/,
  );

  // In policy package: http rejected
  const baseParams = {
    contractAddress: SAMPLE_CONTRACT,
    advisoryId: 'GHSA-xxxx',
    product: 'pkg:generic/test-lib',
    version: { major: 1, minor: 0, patch: 0 },
    sourcePublisher: 'GitHub Advisory Database',
    sourceReference: 'http://insecure.example.com',
    sourcePublicationDate: '2024-01-01T00:00:00.000Z',
    now: FIXED_NOW,
  };
  assert.throws(
    () => buildAffectedReleasePolicyPackage(baseParams),
    /HTTPS URL/,
  );
});

// 45. CV-010: Honesty boundary for CVE-2024-3094 on pkg:generic/xz-utils
test('45. CV-010: Honesty boundary for CVE-2024-3094 rejects 5.2.5 and accepts 5.6.0 & 5.6.1', () => {
  const baseParams = {
    contractAddress: SAMPLE_CONTRACT,
    advisoryId: 'CVE-2024-3094',
    product: 'pkg:generic/xz-utils',
    sourcePublisher: 'Red Hat / CISA',
    sourceReference: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094',
    sourcePublicationDate: '2024-03-29T00:00:00.000Z',
    now: FIXED_NOW,
  };

  // 5.6.0 is compromised -> accepted
  const pkg560 = buildAffectedReleasePolicyPackage({
    ...baseParams,
    version: { major: 5, minor: 6, patch: 0 },
  });
  assert.equal(pkg560.version.patch, 0);

  // 5.6.1 is compromised -> accepted
  const pkg561 = buildAffectedReleasePolicyPackage({
    ...baseParams,
    version: { major: 5, minor: 6, patch: 1 },
  });
  assert.equal(pkg561.version.patch, 1);

  // 5.2.5 is safe -> MUST be rejected with clear honesty error
  assert.throws(
    () =>
      buildAffectedReleasePolicyPackage({
        ...baseParams,
        version: { major: 5, minor: 2, patch: 5 },
      }),
    /only releases 5\.6\.0 and 5\.6\.1 are affected.*cannot be registered as affected/,
  );

  // 5.4.5 is safe -> MUST be rejected
  assert.throws(
    () =>
      buildAffectedReleasePolicyPackage({
        ...baseParams,
        version: { major: 5, minor: 4, patch: 5 },
      }),
    /only releases 5\.6\.0 and 5\.6\.1 are affected/,
  );
});

// 46. CV-010: advisoryDigest matches SHA-256("commonveil:advisory:v1:" + label)
test('46. CV-010: advisoryDigest derives canonical 32-byte digest and enforces whitespace bounds', async () => {
  const digest = await advisoryDigest('CVE-2024-3094');
  assert.equal(digest instanceof Uint8Array, true);
  assert.equal(digest.length, 32);

  // Deterministic
  const digest2 = await advisoryDigest('CVE-2024-3094');
  assert.deepEqual(digest, digest2);

  // Whitespace rejection
  await assert.rejects(
    () => advisoryDigest('  CVE-2024-3094  '),
    /whitespace/,
  );

  // Length bound (>128 chars rejected)
  await assert.rejects(
    () => advisoryDigest('A'.repeat(129)),
    /length/,
  );
});

// 47. CV-010: Affected-release registration receipt round trip & validation
test('47. CV-010: Affected-release registration receipt round trip & strict whitelist', () => {
  const receipt = buildAffectedReleaseRegistrationReceipt({
    contractAddress: SAMPLE_CONTRACT,
    advisoryId: 'CVE-2024-3094',
    product: 'pkg:generic/xz-utils',
    version: { major: 5, minor: 6, patch: 0 },
    sourcePublisher: 'Red Hat / CISA',
    sourceReference: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094',
    registrationTxId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b',
    policyActive: true,
    now: FIXED_NOW,
  });

  assert.equal(receipt.schema, AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA);
  assert.equal(receipt.network, 'preprod');
  assert.equal(receipt.contractAddress, SAMPLE_CONTRACT);
  assert.equal(receipt.advisoryId, 'CVE-2024-3094');
  assert.equal(receipt.product, 'pkg:generic/xz-utils');
  assert.deepEqual(receipt.version, { major: 5, minor: 6, patch: 0 });
  assert.equal(receipt.sourcePublisher, 'Red Hat / CISA');
  assert.equal(receipt.sourceReference, 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094');
  assert.equal(receipt.registrationTxId, '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b');
  assert.equal(receipt.registeredAt, FIXED_NOW.toISOString());
  assert.equal(receipt.policyActive, true);
  assert.equal(receipt.status, 'finalized');

  const validated = validateAffectedReleaseRegistrationReceipt(receipt);
  assert.deepEqual(validated, receipt);

  // Unauthorized field rejection
  assert.throws(
    () => validateAffectedReleaseRegistrationReceipt({ ...receipt, injectedField: 'bad' }),
    /unauthorized top-level fields/,
  );

  // Invalid schema rejection
  assert.throws(
    () => validateAffectedReleaseRegistrationReceipt({ ...receipt, schema: 'invalid' }),
    /Invalid schema/,
  );
});
