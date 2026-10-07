import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CERTIFIER_KEY_SCHEMA,
  MEMBER_ADMISSION_SCHEMA,
  CERTIFICATION_REQUEST_SCHEMA,
  CERTIFIED_SNAPSHOT_SCHEMA,
  ENCRYPTED_ENVELOPE_SCHEMA,
  validateCertifierKeyPackage,
  validateMemberAdmissionPackage,
  validateCertificationRequestPackage,
  validateCertifiedSnapshotPackage,
  buildCertificationRequestFromInventoryReport,
  encryptToEnvelope,
  decryptFromEnvelope,
  computeMeasurementDigest,
  PBKDF2_RECOMMENDED_ITERATIONS,
} from '../src/role-packages.ts';

const SAMPLE_HEX_32 = 'a1'.repeat(32);
const SAMPLE_HEX_32_B = 'b2'.repeat(32);
const SAMPLE_CONTRACT = '0200abcd1234ef567890abcdef1234567890abcdef1234567890abcdef123456';
const FIXED_NOW = new Date('2026-10-07T12:00:00.000Z');

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

  // Unknown schema rejection
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

  // Missing contractAddress
  assert.throws(
    () => validateMemberAdmissionPackage({ ...pkg, contractAddress: '' }),
    /Contract address must be a non-empty string/,
  );
});

// 3. Live-scan certification request construction
test('3. Live-scan certification request construction from inventory report', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const inventoryReport = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
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

// 5. Invalid provenance rejection
test('5. Invalid provenance rejection', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.6.1');
  const badReport = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'mocked-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    version: { raw: '5.6.1', normalized: '5.6.1', major: 5, minor: 6, patch: 1 },
    measurementDigest: digest,
  };

  await assert.rejects(
    () => buildCertificationRequestFromInventoryReport(badReport, {
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: SAMPLE_HEX_32,
    }),
    /Unsupported inventory provenance/,
  );
});

// 6. Invalid hex and incorrect byte-length rejection
test('6. Invalid hex and incorrect byte-length rejection', () => {
  // Too short
  assert.throws(
    () => validateCertifierKeyPackage({
      schema: CERTIFIER_KEY_SCHEMA,
      certifierKey: '1234abcd',
      createdAt: FIXED_NOW.toISOString(),
    }),
    /32-byte hex string/,
  );

  // Non-hex chars
  assert.throws(
    () => validateMemberAdmissionPackage({
      schema: MEMBER_ADMISSION_SCHEMA,
      contractAddress: SAMPLE_CONTRACT,
      memberCredential: 'zz'.repeat(32),
      createdAt: FIXED_NOW.toISOString(),
    }),
    /32-byte hex string/,
  );

  // Odd length
  assert.throws(
    () => validateCertifierKeyPackage({
      schema: CERTIFIER_KEY_SCHEMA,
      certifierKey: 'abc',
      createdAt: FIXED_NOW.toISOString(),
    }),
    /32-byte hex string/,
  );
});

// 7. Measurement-digest mismatch rejection
test('7. Measurement-digest mismatch rejection', async () => {
  const fakeDigest = '00'.repeat(32);
  const mismatchedReport = {
    schema: 'commonveil.inventory/v1' as const,
    provenance: 'live-host-scan',
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

// 8. Certified snapshot validation
test('8. Certified snapshot validation', () => {
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

  // Missing txId
  assert.throws(
    () => validateCertifiedSnapshotPackage({ ...pkg, txId: '' }),
    /txId must be a valid hex transaction identifier/,
  );
});

// 9. Encryption/decryption round trip
test('9. Encryption/decryption round trip with AES-256-GCM and PBKDF2', async () => {
  const secretPayload = {
    privateRole: 'member',
    memberSecret: 'de'.repeat(32),
    memberSalt: 'ad'.repeat(32),
  };
  const passphrase = 'SuperSecureUserPassphrase2026!';

  const envelope = await encryptToEnvelope(secretPayload, passphrase, {
    iterations: 100_000,
    now: FIXED_NOW,
  });

  assert.equal(envelope.schema, ENCRYPTED_ENVELOPE_SCHEMA);
  assert.equal(envelope.cipher, 'AES-256-GCM');
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256');
  assert.equal(envelope.iterations, 100_000);
  assert.equal(typeof envelope.salt, 'string');
  assert.equal(typeof envelope.iv, 'string');
  assert.equal(typeof envelope.ciphertext, 'string');

  const decrypted = await decryptFromEnvelope<typeof secretPayload>(envelope, passphrase);
  assert.deepEqual(decrypted, secretPayload);
});

// 10. Wrong-passphrase rejection
test('10. Wrong-passphrase rejection', async () => {
  const secretPayload = { note: 'classified inventory' };
  const envelope = await encryptToEnvelope(secretPayload, 'correct-passphrase', { iterations: 100_000 });

  await assert.rejects(
    () => decryptFromEnvelope(envelope, 'wrong-passphrase'),
    /Failed to decrypt envelope: incorrect passphrase or tampered ciphertext/,
  );
});

// 11. Tampered-ciphertext rejection
test('11. Tampered-ciphertext rejection', async () => {
  const secretPayload = { note: 'classified inventory' };
  const envelope = await encryptToEnvelope(secretPayload, 'passphrase', { iterations: 100_000 });

  // Tamper with the last character of ciphertext
  const tamperedCiphertext = envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.endsWith('00') ? 'ff' : '00');
  const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };

  await assert.rejects(
    () => decryptFromEnvelope(tamperedEnvelope, 'passphrase'),
    /Failed to decrypt envelope: incorrect passphrase or tampered ciphertext/,
  );
});

// 12. Fresh encryption produces different salt, IV and ciphertext
test('12. Fresh encryption produces different salt, IV and ciphertext', async () => {
  const payload = { test: 'consistent-data' };
  const passphrase = 'repeatable-passphrase';

  const env1 = await encryptToEnvelope(payload, passphrase, { iterations: 100_000 });
  const env2 = await encryptToEnvelope(payload, passphrase, { iterations: 100_000 });

  assert.notEqual(env1.salt, env2.salt, 'Salt must be randomly generated for each encryption');
  assert.notEqual(env1.iv, env2.iv, 'IV must be randomly generated for each encryption');
  assert.notEqual(env1.ciphertext, env2.ciphertext, 'Ciphertext must differ due to distinct salt and IV');
});

// 13. No decrypted secret appears in serialized encrypted output
test('13. No decrypted secret appears in serialized encrypted output', async () => {
  const sensitiveString = 'highly-sensitive-member-private-token-xyz-12345';
  const payload = { sensitiveString };
  const envelope = await encryptToEnvelope(payload, 'test-passphrase', { iterations: 100_000 });

  const serialized = JSON.stringify(envelope);
  assert.equal(
    serialized.includes(sensitiveString),
    false,
    'Plaintext secret must never appear in encrypted envelope serialization',
  );
  assert.equal(
    serialized.includes('test-passphrase'),
    false,
    'Passphrase must never appear in encrypted envelope serialization',
  );
});
