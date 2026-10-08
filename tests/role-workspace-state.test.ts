import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRoleQuery,
  ROLE_DESCRIPTORS,
  mapWorkspaceError,
  mapWalletError,
  handleAddressInputChange,
  isResponseCurrent,
  shortenAddress,
  formatDust,
  INITIAL_WORKSPACE_CONTRACT_STATE,
  type WorkspaceContractState,
  validateRegistrarSecretHex,
  parseRegistrarSecretHex,
  generateRegistrarSecret,
  buildRegistrarBackupPackage,
  validateRegistrarBackupPackage,
  zeroizeBytes,
  REGISTRAR_BACKUP_SCHEMA,
  type RegistrarSecretUiState,
  INITIAL_REGISTRAR_SECRET_UI_STATE,
  onSecretGeneratedOrImported,
  onSecretRestoredFromBackup,
  onCopyAttemptResult,
  onSecretClearedOrLocked,
  mapRegistrarOperationError,
} from '../src/role-workspace-state.ts';
import {
  bytesToHex,
  encryptToEnvelope,
  decryptAndValidateEnvelope,
  type EncryptedEnvelope,
} from '../src/role-packages.ts';
import {
  verifyRegistrarSecret,
  ContractSessionError,
  type ContractSessionErrorCode,
  type CommonVeilPublicState,
} from '../src/contract-session.ts';
import { pureCircuits } from '../contracts/managed/commonveil/contract/index.js';

// 1. registrar URL parsing
test('1. Registrar URL parsing', () => {
  assert.equal(parseRoleQuery('/?role=registrar'), 'registrar');
  assert.equal(parseRoleQuery('?role=registrar'), 'registrar');
  assert.equal(parseRoleQuery('https://example.com/?role=registrar'), 'registrar');
  assert.equal(parseRoleQuery('?foo=bar&role=registrar&baz=1'), 'registrar');
  assert.equal(parseRoleQuery('?role=REGISTRAR'), 'registrar');
});

// 2. certifier URL parsing
test('2. Certifier URL parsing', () => {
  assert.equal(parseRoleQuery('/?role=certifier'), 'certifier');
  assert.equal(parseRoleQuery('?role=certifier'), 'certifier');
  assert.equal(parseRoleQuery('https://example.com/?role=certifier'), 'certifier');
  assert.equal(parseRoleQuery('?role=Certifier'), 'certifier');
});

// 3. member URL parsing
test('3. Member URL parsing', () => {
  assert.equal(parseRoleQuery('/?role=member'), 'member');
  assert.equal(parseRoleQuery('?role=member'), 'member');
  assert.equal(parseRoleQuery('https://example.com/app/?role=member'), 'member');
  assert.equal(parseRoleQuery('?role=MEMBER'), 'member');
});

// 4. unknown role rejection
test('4. Unknown role rejection (?role=admin, ?role=test, ?role=demo)', () => {
  assert.equal(parseRoleQuery('/?role=admin'), null);
  assert.equal(parseRoleQuery('/?role=test'), null);
  assert.equal(parseRoleQuery('/?role=demo'), null);
  assert.equal(parseRoleQuery('/?role=root'), null);
  assert.equal(parseRoleQuery('/?role=operator'), null);
});

// 5. empty role rejection
test('5. Empty or missing role rejection', () => {
  assert.equal(parseRoleQuery(''), null);
  assert.equal(parseRoleQuery('/'), null);
  assert.equal(parseRoleQuery('/?'), null);
  assert.equal(parseRoleQuery('/?role='), null);
  assert.equal(parseRoleQuery('/?other=123'), null);
});

// 6. role display labels and descriptions
test('6. Role display labels and descriptions', () => {
  assert.equal(ROLE_DESCRIPTORS.registrar.label, 'Registrar');
  assert.equal(ROLE_DESCRIPTORS.certifier.label, 'Certifier');
  assert.equal(ROLE_DESCRIPTORS.member.label, 'Member');

  assert.ok(ROLE_DESCRIPTORS.registrar.description.includes('governance'));
  assert.ok(ROLE_DESCRIPTORS.certifier.description.includes('pre-policy'));
  assert.ok(ROLE_DESCRIPTORS.certifier.description.includes('Reviews submitted inventory evidence'));
  assert.ok(ROLE_DESCRIPTORS.member.description.includes('exposure'));
});

// 7. safe error mapping for each ContractSessionError code
test('7. Safe error mapping for each ContractSessionErrorCode', () => {
  const codes: ContractSessionErrorCode[] = [
    'INVALID_CONTRACT_ADDRESS',
    'CONTRACT_NOT_FOUND',
    'INCOMPATIBLE_CONTRACT',
    'INDEXER_QUERY_FAILED',
    'INVALID_SECRET_LENGTH',
  ];

  for (const code of codes) {
    const error = new ContractSessionError(code, 'Sensitive internal stack or message', {
      cause: new Error('Sensitive indexer URL: https://secret.rpc/token=12345'),
    });
    const mapped = mapWorkspaceError(error);
    assert.ok(typeof mapped === 'string' && mapped.length > 0);
    assert.ok(!mapped.includes('Sensitive'));
    assert.ok(!mapped.includes('secret.rpc'));
    assert.ok(!mapped.includes('12345'));
  }
});

// 8. unknown error returns a generic safe message
test('8. Unknown error returns a generic safe message', () => {
  const rawGenericError = new Error('Database connection refused at 10.0.0.1:5432');
  const mapped1 = mapWorkspaceError(rawGenericError);
  assert.equal(
    mapped1,
    'The contract operation could not be completed. Check the address and try again.',
  );

  const mapped2 = mapWorkspaceError('string error');
  assert.equal(
    mapped2,
    'The contract operation could not be completed. Check the address and try again.',
  );

  const mapped3 = mapWorkspaceError(null);
  assert.equal(
    mapped3,
    'The contract operation could not be completed. Check the address and try again.',
  );
});

// 9. no mapped error contains internal cause text or URLs
test('9. No mapped error contains internal cause text or URLs', () => {
  const sensitiveError = new ContractSessionError(
    'INDEXER_QUERY_FAILED',
    'Public default message',
    {
      cause: {
        url: 'https://indexer.preprod.midnight.network/v1/graphql?token=SECRET_JWT',
        internalDetail: 'Socket hang up at line 42',
      },
    },
  );

  const userFacing = mapWorkspaceError(sensitiveError);
  assert.equal(userFacing, 'The Midnight indexer could not complete the contract lookup.');
  assert.ok(!userFacing.includes('SECRET_JWT'));
  assert.ok(!userFacing.includes('Socket hang up'));
  assert.ok(!userFacing.includes('graphql'));
});

// 10. changing the address invalidates prior inspected/attached state and copy status
test('10. Changing address input invalidates prior inspected/attached state and copy status', () => {
  const samplePublicState = {
    contractAddress: '0'.repeat(64),
    registrarKey: '1'.repeat(64),
    certifierKey: '2'.repeat(64),
    policyActive: true,
    members: 2n,
    inventoryCommitments: 1n,
    affectedReleases: 1n,
    usedNullifiers: 1n,
    accepted: 1n,
  };

  const attachedState: WorkspaceContractState = {
    addressInput: '0'.repeat(64),
    inspectionState: 'attached',
    inspectedState: samplePublicState,
    attachedAddress: '0'.repeat(64),
    errorMessage: null,
    copyStatus: 'copied',
    activeRequestId: 1,
  };

  const updatedState = handleAddressInputChange(attachedState, '0'.repeat(63) + '1');

  assert.equal(updatedState.addressInput, '0'.repeat(63) + '1');
  assert.equal(updatedState.inspectionState, 'none');
  assert.equal(updatedState.inspectedState, null);
  assert.equal(updatedState.attachedAddress, null);
  assert.equal(updatedState.errorMessage, null);
  assert.equal(updatedState.copyStatus, 'idle');
});

// 11. inspect and attach actions are represented as separate states
test('11. Inspect and attach actions are represented as separate distinct states', () => {
  const inspectedState: WorkspaceContractState = {
    ...INITIAL_WORKSPACE_CONTRACT_STATE,
    addressInput: '0'.repeat(64),
    inspectionState: 'inspected',
    inspectedState: {
      contractAddress: '0'.repeat(64),
      registrarKey: '1'.repeat(64),
      certifierKey: '2'.repeat(64),
      policyActive: false,
      members: 0n,
      inventoryCommitments: 0n,
      affectedReleases: 0n,
      usedNullifiers: 0n,
      accepted: 0n,
    },
    attachedAddress: null, // inspected only, not attached
  };

  assert.equal(inspectedState.inspectionState, 'inspected');
  assert.equal(inspectedState.attachedAddress, null);

  const attachedState: WorkspaceContractState = {
    ...inspectedState,
    inspectionState: 'attached',
    attachedAddress: '0'.repeat(64),
  };

  assert.equal(attachedState.inspectionState, 'attached');
  assert.equal(attachedState.attachedAddress, '0'.repeat(64));
  assert.notEqual(inspectedState.inspectionState, attachedState.inspectionState);
});

// 12. Address and DUST formatting utilities
test('12. Address and DUST formatting utilities', () => {
  const shortKey = shortenAddress('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  assert.equal(shortKey, '0123456789…89abcdef');
  assert.equal(shortenAddress('short-string'), 'short-string');

  const dustFormatted = formatDust(15_500_000_000_000_000n);
  assert.equal(dustFormatted, '15.5000');
});

// 13. Safe wallet error mapping for wallet missing
test('13. Safe wallet error mapping for wallet missing', () => {
  const missingError = new Error('No compatible Midnight wallet found. Open 1AM, unlock it, then reload this page.');
  const msg = mapWalletError(missingError);
  assert.equal(msg, 'No compatible Midnight wallet found. Open 1AM, unlock it on Preprod, and try again.');
});

// 14. Safe wallet error mapping for wrong network
test('14. Safe wallet error mapping for wrong network', () => {
  const netError = new Error("Wallet connected to 'testnet'. Switch 1AM to Preprod and reconnect.");
  const msg = mapWalletError(netError);
  assert.equal(msg, 'Wallet is not connected to Preprod. Switch 1AM network to Preprod and try again.');
});

// 15. Safe wallet error mapping for user cancellation/rejection
test('15. Safe wallet error mapping for user cancellation or rejection', () => {
  const rejectError = new Error('User rejected the connection request in 1AM popup');
  const msg = mapWalletError(rejectError);
  assert.equal(msg, 'Wallet connection request was cancelled or declined in 1AM.');

  const declinedError = new Error('Connection declined by user');
  assert.equal(mapWalletError(declinedError), 'Wallet connection request was cancelled or declined in 1AM.');
});

// 16. Unknown wallet error sanitization without leaking internals
test('16. Unknown wallet error sanitization without leaking internals', () => {
  const rawDappError = new Error('Internal WebSocket failure at wss://subsquid.mainnet.example.org/v1/graphql with auth bearer secret_12345');
  const msg = mapWalletError(rawDappError);
  assert.equal(msg, 'Wallet connection was not completed. Unlock 1AM on Preprod and try again.');
  assert.ok(!msg.includes('WebSocket'));
  assert.ok(!msg.includes('secret_12345'));
  assert.ok(!msg.includes('subsquid'));
});

// 17. Busy workspace state prevents address mutation while inspecting or attaching
test('17. Busy workspace state prevents address mutation while inspecting or attaching', () => {
  const busyInspecting: WorkspaceContractState = {
    ...INITIAL_WORKSPACE_CONTRACT_STATE,
    addressInput: '0'.repeat(64),
    inspectionState: 'inspecting',
  };
  const prevented1 = handleAddressInputChange(busyInspecting, '1'.repeat(64));
  assert.equal(prevented1.addressInput, '0'.repeat(64));

  const busyAttaching: WorkspaceContractState = {
    ...INITIAL_WORKSPACE_CONTRACT_STATE,
    addressInput: '0'.repeat(64),
    inspectionState: 'attaching',
  };
  const prevented2 = handleAddressInputChange(busyAttaching, '2'.repeat(64));
  assert.equal(prevented2.addressInput, '0'.repeat(64));
});

// 18. Async request race protection (isResponseCurrent) rejects stale responses
test('18. Async request race protection rejects stale responses and address mismatches', () => {
  const state: WorkspaceContractState = {
    ...INITIAL_WORKSPACE_CONTRACT_STATE,
    addressInput: '0'.repeat(64),
    activeRequestId: 5,
  };

  // Same requestId and address: current
  assert.equal(isResponseCurrent(state, 5, '0'.repeat(64)), true);

  // Stale requestId (e.g. earlier request returned late)
  assert.equal(isResponseCurrent(state, 4, '0'.repeat(64)), false);

  // Address changed in the meantime
  assert.equal(isResponseCurrent(state, 5, '1'.repeat(64)), false);
});

// 19. Valid 32-byte registrar secret generation and hex import
test('19. Valid 32-byte registrar secret generation and hex import', () => {
  const generated = generateRegistrarSecret();
  assert.ok(generated instanceof Uint8Array);
  assert.equal(generated.length, 32);

  const hex = bytesToHex(generated);
  assert.equal(hex.length, 64);

  const validatedHex = validateRegistrarSecretHex(hex);
  assert.equal(validatedHex, hex.toLowerCase());

  const parsed = parseRegistrarSecretHex(hex);
  assert.deepEqual(parsed, generated);
});

// 20. Invalid hex and incorrect byte lengths for registrar secret
test('20. Invalid hex and incorrect byte lengths for registrar secret are rejected', () => {
  // Odd length
  assert.throws(() => validateRegistrarSecretHex('abc'), /64 hex characters/);
  // 31 bytes (62 chars)
  assert.throws(() => validateRegistrarSecretHex('00'.repeat(31)), /64 hex characters/);
  // 33 bytes (66 chars)
  assert.throws(() => validateRegistrarSecretHex('00'.repeat(33)), /64 hex characters/);
  // Non-hex chars
  assert.throws(() => validateRegistrarSecretHex('zz'.repeat(32)), /invalid non-hexadecimal/);
  // Non-string
  assert.throws(() => validateRegistrarSecretHex(12345), /hexadecimal string/);
});

// 21. Encrypted registrar backup export and import round trip
test('21. Encrypted registrar backup export and import round trip', async () => {
  const secret = generateRegistrarSecret();
  const backupPkg = buildRegistrarBackupPackage(secret);

  assert.equal(backupPkg.schema, REGISTRAR_BACKUP_SCHEMA);
  assert.equal(backupPkg.role, 'registrar');
  assert.equal(backupPkg.registrarSecret, bytesToHex(secret));

  const validatedBackup = validateRegistrarBackupPackage(backupPkg);
  assert.equal(validatedBackup.registrarSecret, bytesToHex(secret));

  const passphrase = 'correct horse battery staple';
  const envelope: EncryptedEnvelope = await encryptToEnvelope(validatedBackup, passphrase);

  const restored = await decryptAndValidateEnvelope(
    envelope,
    passphrase,
    validateRegistrarBackupPackage,
  );

  assert.equal(restored.schema, REGISTRAR_BACKUP_SCHEMA);
  assert.equal(restored.role, 'registrar');
  assert.equal(restored.registrarSecret, bytesToHex(secret));
  assert.deepEqual(parseRegistrarSecretHex(restored.registrarSecret), secret);
});

// 22. Wrong passphrase and tampered envelope rejection
test('22. Wrong passphrase and tampered envelope rejection for registrar backup', async () => {
  const secret = generateRegistrarSecret();
  const backupPkg = buildRegistrarBackupPackage(secret);
  const envelope = await encryptToEnvelope(backupPkg, 'secure-passphrase-1234');

  // Wrong passphrase
  await assert.rejects(
    async () => {
      await decryptAndValidateEnvelope(
        envelope,
        'wrong-passphrase-5678',
        validateRegistrarBackupPackage,
      );
    },
    /incorrect passphrase or tampered ciphertext/,
  );

  // Tampered ciphertext
  const tamperedCiphertext =
    envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.endsWith('00') ? 'ff' : '00');
  const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };

  await assert.rejects(
    async () => {
      await decryptAndValidateEnvelope(
        tamperedEnvelope,
        'secure-passphrase-1234',
        validateRegistrarBackupPackage,
      );
    },
    /incorrect passphrase or tampered ciphertext/,
  );
});

// 23. Local registrar verification success and failure against public state
test('23. Local registrar verification success and failure against public state', () => {
  const secret = new Uint8Array(32).fill(7);
  const derivedAdminKey = pureCircuits.deriveAdminKey(secret);
  const registrarKeyHex = bytesToHex(derivedAdminKey);

  const matchingPublicState: Pick<CommonVeilPublicState, 'registrarKey'> = {
    registrarKey: registrarKeyHex,
  };

  // Correct secret verifies true
  const ok = verifyRegistrarSecret(matchingPublicState, secret);
  assert.equal(ok, true);

  // Wrong secret verifies false
  const wrongSecret = new Uint8Array(32).fill(8);
  const fail = verifyRegistrarSecret(matchingPublicState, wrongSecret);
  assert.equal(fail, false);
});

// 24. Zeroization wipes secret bytes in memory
test('24. Zeroization wipes secret bytes in memory', () => {
  const secret = new Uint8Array(32).fill(42);
  assert.equal(secret[0], 42);

  zeroizeBytes(secret);
  assert.equal(secret[0], 0);
  assert.equal(secret.every((b) => b === 0), true);
});

// 25. No full secret in persistent state model (RegistrarSecretUiState contains only metadata)
test('25. RegistrarSecretUiState contains no plaintext secret strings', () => {
  const initial: RegistrarSecretUiState = INITIAL_REGISTRAR_SECRET_UI_STATE;
  assert.equal(initial.hasSecret, false);
  assert.equal(initial.isLocked, false);
  assert.equal(initial.verificationStatus, 'unverified');
  assert.equal(initial.canCopyOnce, false);
  assert.equal(initial.copyStatus, 'idle');

  // Verify type/model property keys do not contain any secret or hex fields
  const keys = Object.keys(initial);
  assert.ok(!keys.includes('secret'));
  assert.ok(!keys.includes('secretHex'));
  assert.ok(!keys.includes('activeSecretHex'));
  assert.ok(!keys.includes('plaintextSecret'));

  const generatedState = onSecretGeneratedOrImported(initial);
  assert.equal(generatedState.hasSecret, true);
  assert.equal(generatedState.canCopyOnce, true);
  assert.equal(generatedState.copyStatus, 'idle');
  const genKeys = Object.keys(generatedState);
  assert.ok(!genKeys.includes('secret'));
  assert.ok(!genKeys.includes('secretHex'));
  assert.ok(!genKeys.includes('activeSecretHex'));
});

// 26. One successful copy permanently disables further copying
test('26. One successful copy permanently disables further copying', () => {
  const state = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  assert.equal(state.canCopyOnce, true);

  // Simulate successful copy
  const copiedState = onCopyAttemptResult(state, true);
  assert.equal(copiedState.canCopyOnce, false);
  assert.equal(copiedState.copyStatus, 'copied');

  // Any subsequent attempt cannot be initiated or remains disabled
  const attemptAgain = onCopyAttemptResult(copiedState, true);
  assert.equal(attemptAgain.canCopyOnce, false);
  assert.equal(attemptAgain.copyStatus, 'copied');
});

// 27. Failed copy permits retry
test('27. Failed copy permits retry', () => {
  const state = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  assert.equal(state.canCopyOnce, true);

  // Simulate failed clipboard write
  const failedState = onCopyAttemptResult(state, false);
  assert.equal(failedState.canCopyOnce, true); // Still allowed to retry
  assert.equal(failedState.copyStatus, 'failed');

  // Second attempt succeeds -> now disabled
  const retrySuccess = onCopyAttemptResult(failedState, true);
  assert.equal(retrySuccess.canCopyOnce, false);
  assert.equal(retrySuccess.copyStatus, 'copied');
});

// 28. Restored backup provides no copy or reveal opportunity
test('28. Restored backup provides no copy or reveal opportunity', () => {
  const state = onSecretRestoredFromBackup(INITIAL_REGISTRAR_SECRET_UI_STATE);
  assert.equal(state.hasSecret, true);
  assert.equal(state.canCopyOnce, false); // Invariant: restored backup cannot be copied
  assert.equal(state.copyStatus, 'idle');
  assert.equal(state.verificationStatus, 'unverified');
});

// 29. Lock, disconnect, or address change removes reveal/copy capability immediately
test('29. Lock, disconnect, or address change removes reveal/copy capability immediately', () => {
  const activeState = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  assert.equal(activeState.hasSecret, true);
  assert.equal(activeState.canCopyOnce, true);

  // On lock
  const lockedState = onSecretClearedOrLocked(activeState, true);
  assert.equal(lockedState.hasSecret, false);
  assert.equal(lockedState.isLocked, true);
  assert.equal(lockedState.canCopyOnce, false);
  assert.equal(lockedState.copyStatus, 'idle');

  // On disconnect / address change / unmount
  const clearedState = onSecretClearedOrLocked(activeState, false);
  assert.equal(clearedState.hasSecret, false);
  assert.equal(clearedState.isLocked, false);
  assert.equal(clearedState.canCopyOnce, false);
  assert.equal(clearedState.copyStatus, 'idle');
});

// 30. Raw internal errors never reach displayed messages (sanitized mapping)
test('30. Raw internal errors never reach displayed messages', () => {
  // Web Crypto / AES GCM raw failure
  const cryptoError = new Error('OperationError: WebCrypto AES-GCM tag mismatch at 0x7fff');
  const mappedCrypto = mapRegistrarOperationError(cryptoError);
  assert.equal(mappedCrypto, 'Decryption failed. Check the passphrase or verify the backup file.');
  assert.ok(!mappedCrypto.includes('WebCrypto'));
  assert.ok(!mappedCrypto.includes('0x7fff'));

  // JSON parse raw error
  const jsonError = new SyntaxError('Unexpected token < in JSON at position 0');
  const mappedJson = mapRegistrarOperationError(jsonError);
  assert.equal(mappedJson, 'The selected file is not a valid CommonVeil encrypted backup.');
  assert.ok(!mappedJson.includes('Unexpected token'));

  // FileReader raw error
  const fileError = new Error('FileReader failed to read blob');
  const mappedFile = mapRegistrarOperationError(fileError);
  assert.equal(mappedFile, 'Could not read the selected backup file.');
  assert.ok(!mappedFile.includes('blob'));

  // Clipboard raw error
  const clipError = new Error('NotAllowedError: Clipboard write failed due to permissions');
  const mappedClip = mapRegistrarOperationError(clipError);
  assert.equal(mappedClip, 'Clipboard write failed. Please check browser permissions and try again.');
  assert.ok(!mappedClip.includes('NotAllowedError'));

  // Generic internal exception with sensitive string
  const secretLeakError = new Error('Secret 0123456789abcdef failed to process');
  const mappedGeneric = mapRegistrarOperationError(secretLeakError);
  assert.equal(mappedGeneric, 'The operation could not be completed. Check the input and try again.');
  assert.ok(!mappedGeneric.includes('0123456789abcdef'));
});
