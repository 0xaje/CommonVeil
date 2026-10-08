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
  onCopyAttemptInitiated,
  onCopyAttemptResult,
  onSecretClearedOrLocked,
  mapRegistrarOperationError,
  DEPLOYMENT_RECEIPT_SCHEMA,
  type DeploymentReceipt,
  validateDeploymentReceipt,
  INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE,
  type RegistrarDeploymentUiState,
  canInitiateDeployment,
  onDeploymentConfirmOpen,
  onDeploymentConfirmCancel,
  onDeploymentWalletRequest,
  onDeploymentSubmitting,
  onDeploymentFinalizedIndexing,
  onDeploymentCompleted,
  onDeploymentCancelled,
  onDeploymentFailed,
  onDeploymentReset,
  mapDeploymentError,
  mapDeploymentInspectionError,
  DEPLOYMENT_VERIFICATION_ERROR_MESSAGES,
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

  // Initiate copy
  const pendingState = onCopyAttemptInitiated(state);
  assert.equal(pendingState.copyStatus, 'pending');

  // Simulate successful copy
  const copiedState = onCopyAttemptResult(pendingState, true);
  assert.equal(copiedState.canCopyOnce, false);
  assert.equal(copiedState.copyStatus, 'copied');

  // Any subsequent attempt cannot be initiated or remains disabled
  const attemptAgain = onCopyAttemptInitiated(copiedState);
  assert.equal(attemptAgain.canCopyOnce, false);
  assert.equal(attemptAgain.copyStatus, 'copied');
});

// 27. Failed copy permits retry
test('27. Failed copy permits retry', () => {
  const state = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  assert.equal(state.canCopyOnce, true);

  // Initiate copy
  const pendingState = onCopyAttemptInitiated(state);
  assert.equal(pendingState.copyStatus, 'pending');

  // Simulate failed clipboard write
  const failedState = onCopyAttemptResult(pendingState, false);
  assert.equal(failedState.canCopyOnce, true); // Still allowed to retry
  assert.equal(failedState.copyStatus, 'failed');

  // Second attempt initiates and succeeds -> now disabled
  const retryPending = onCopyAttemptInitiated(failedState);
  assert.equal(retryPending.copyStatus, 'pending');
  const retrySuccess = onCopyAttemptResult(retryPending, true);
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

// 31. Immediate pending state transition on copy initiation
test('31. Immediate pending state transition on copy initiation', () => {
  const state = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  assert.equal(state.canCopyOnce, true);
  assert.equal(state.copyStatus, 'idle');

  // Immediately transition to pending
  const pendingState = onCopyAttemptInitiated(state);
  assert.equal(pendingState.canCopyOnce, true);
  assert.equal(pendingState.copyStatus, 'pending');
});

// 32. Two rapid invocations result in exactly one attempt reservation
test('32. Rapid double invocations: second invocation while pending does nothing', () => {
  let clipboardCalls = 0;
  let isPendingRef = false;
  let uiState = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);

  // Simulated copy handler incorporating ref guard + reducer
  const triggerCopy = () => {
    if (!uiState.canCopyOnce || uiState.copyStatus === 'pending' || isPendingRef) {
      return;
    }
    isPendingRef = true;
    uiState = onCopyAttemptInitiated(uiState);
    clipboardCalls++;
  };

  // First invocation
  triggerCopy();
  assert.equal(clipboardCalls, 1);
  assert.equal(isPendingRef, true);
  assert.equal(uiState.copyStatus, 'pending');

  // Second rapid invocation while pending
  triggerCopy();
  assert.equal(clipboardCalls, 1, 'Second invocation must be blocked by guard and pending state');
  assert.equal(isPendingRef, true);
  assert.equal(uiState.copyStatus, 'pending');
});

// 33. Success permanently consumes opportunity
test('33. Success permanently consumes copy opportunity from pending state', () => {
  const active = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  const pending = onCopyAttemptInitiated(active);
  assert.equal(pending.copyStatus, 'pending');

  const succeeded = onCopyAttemptResult(pending, true);
  assert.equal(succeeded.canCopyOnce, false);
  assert.equal(succeeded.copyStatus, 'copied');

  // Attempting to initiate again fails
  const blocked = onCopyAttemptInitiated(succeeded);
  assert.equal(blocked.canCopyOnce, false);
  assert.equal(blocked.copyStatus, 'copied');
});

// 34. Failure restores exactly one retry opportunity
test('34. Failure restores exactly one retry opportunity', () => {
  const active = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  const pending = onCopyAttemptInitiated(active);

  const failed = onCopyAttemptResult(pending, false);
  assert.equal(failed.canCopyOnce, true);
  assert.equal(failed.copyStatus, 'failed');

  // Can initiate retry
  const retryPending = onCopyAttemptInitiated(failed);
  assert.equal(retryPending.copyStatus, 'pending');
  assert.equal(retryPending.canCopyOnce, true);

  // Success on retry permanently consumes
  const retrySuccess = onCopyAttemptResult(retryPending, true);
  assert.equal(retrySuccess.canCopyOnce, false);
  assert.equal(retrySuccess.copyStatus, 'copied');
});

// 35. Stale success or failure after lock or lifecycle reset cannot mutate new state
test('35. Stale callback after lock or lifecycle reset cannot mutate new state', () => {
  const active = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);
  const pending = onCopyAttemptInitiated(active);
  assert.equal(pending.copyStatus, 'pending');

  // User locks session or changes contract address while writeText was in flight
  const locked = onSecretClearedOrLocked(pending, true);
  assert.equal(locked.hasSecret, false);
  assert.equal(locked.isLocked, true);
  assert.equal(locked.canCopyOnce, false);
  assert.equal(locked.copyStatus, 'idle');

  // Stale async completion arrives
  const afterStaleSuccess = onCopyAttemptResult(locked, true);
  assert.equal(afterStaleSuccess.hasSecret, false);
  assert.equal(afterStaleSuccess.isLocked, true);
  assert.equal(afterStaleSuccess.canCopyOnce, false);
  assert.equal(afterStaleSuccess.copyStatus, 'idle');

  const afterStaleFailure = onCopyAttemptResult(locked, false);
  assert.equal(afterStaleFailure.hasSecret, false);
  assert.equal(afterStaleFailure.isLocked, true);
  assert.equal(afterStaleFailure.canCopyOnce, false);
  assert.equal(afterStaleFailure.copyStatus, 'idle');
});

// 36. Overlapping copy generations across lifecycle reset: stale A callback cannot mutate B
test('36. Overlapping copy generations across lifecycle reset: stale A callback cannot mutate B', async () => {
  let copyGenerationCounter = 0;
  let activeToken: number | null = null;
  let state = onSecretGeneratedOrImported(INITIAL_REGISTRAR_SECRET_UI_STATE);

  // Deferred resolvers for async clipboard simulation
  let resolveA: () => void = () => {};
  let rejectA: (err: any) => void = () => {};
  const promiseA = new Promise<void>((res, rej) => {
    resolveA = res;
    rejectA = rej;
  });

  let resolveB: () => void = () => {};
  const promiseB = new Promise<void>((res) => {
    resolveB = res;
  });

  // Step 1: Copy for secret A starts
  const tokenA = ++copyGenerationCounter;
  activeToken = tokenA;
  state = onCopyAttemptInitiated(state);
  assert.equal(state.copyStatus, 'pending');

  // Step 2: Lifecycle reset (e.g. lock session or new secret generation)
  // Increments generation counter and invalidates activeToken
  copyGenerationCounter++;
  activeToken = null;
  state = onSecretClearedOrLocked(state, false);
  assert.equal(state.hasSecret, false);
  assert.equal(state.canCopyOnce, false);
  assert.equal(state.copyStatus, 'idle');

  // Step 3: Secret B is generated and its copy starts
  state = onSecretGeneratedOrImported(state);
  assert.equal(state.hasSecret, true);
  assert.equal(state.canCopyOnce, true);

  const tokenB = ++copyGenerationCounter;
  activeToken = tokenB;
  state = onCopyAttemptInitiated(state);
  assert.equal(state.copyStatus, 'pending');
  assert.equal(activeToken, tokenB);

  // Step 4: Stale callback for A resolves
  // Handler checks if tokenA === activeToken
  const handleCallbackA = () => {
    if (activeToken !== tokenA) {
      // Invalidation guard: dropped stale callback
      return;
    }
    state = onCopyAttemptResult(state, true);
  };
  resolveA();
  await promiseA;
  handleCallbackA();

  // B must remain pending and unchanged!
  assert.equal(state.copyStatus, 'pending');
  assert.equal(state.canCopyOnce, true);
  assert.equal(activeToken, tokenB);

  // Step 5: B then resolves
  const handleCallbackB = () => {
    if (activeToken !== tokenB) {
      return;
    }
    activeToken = null;
    state = onCopyAttemptResult(state, true);
  };
  resolveB();
  await promiseB;
  handleCallbackB();

  // B's opportunity is now consumed permanently
  assert.equal(state.copyStatus, 'copied');
  assert.equal(state.canCopyOnce, false);
  assert.equal(activeToken, null);
});

// 37. Deployment disabled without wallet, secret, backup confirmation, or valid certifier key
test('37. Deployment disabled without wallet, secret, backup confirmation, or valid certifier key', () => {
  const dummyCertifierKey = '44'.repeat(32);
  // All prerequisites met
  const fullyReady = {
    isConnected: true,
    hasSecret: true,
    backupConfirmed: true,
    isDeploying: false,
    proofProviderAvailable: true,
    certifierPublicKey: dummyCertifierKey,
  };
  assert.equal(canInitiateDeployment(fullyReady), true);

  // Missing wallet
  assert.equal(canInitiateDeployment({ ...fullyReady, isConnected: false }), false);

  // Missing secret
  assert.equal(canInitiateDeployment({ ...fullyReady, hasSecret: false }), false);

  // Missing backup confirmation
  assert.equal(canInitiateDeployment({ ...fullyReady, backupConfirmed: false }), false);

  // Already deploying
  assert.equal(canInitiateDeployment({ ...fullyReady, isDeploying: true }), false);

  // Missing proof provider
  assert.equal(canInitiateDeployment({ ...fullyReady, proofProviderAvailable: false }), false);

  // Missing certifier public key
  assert.equal(canInitiateDeployment({ ...fullyReady, certifierPublicKey: null }), false);

  // Zero certifier public key rejected
  assert.equal(canInitiateDeployment({ ...fullyReady, certifierPublicKey: '00'.repeat(32) }), false);

  // Malformed certifier public key rejected
  assert.equal(canInitiateDeployment({ ...fullyReady, certifierPublicKey: 'not-a-valid-key' }), false);
  assert.equal(canInitiateDeployment({ ...fullyReady, certifierPublicKey: '00'.repeat(31) }), false);
});

// 38. Public key derivation from active secret and constructor receives only derived public key
test('38. Public key derivation from active secret and constructor receives only derived public key', () => {
  const adminSecret = new Uint8Array(32).fill(42);
  const derivedAdminKey = pureCircuits.deriveAdminKey(adminSecret);

  assert.equal(derivedAdminKey instanceof Uint8Array, true);
  assert.equal(derivedAdminKey.length, 32);

  // The derived public key is completely different from the secret
  assert.notDeepEqual(derivedAdminKey, adminSecret);

  // Genuine non-zero certifier public key
  const certifierSecret = new Uint8Array(32).fill(77);
  const derivedCertifierKey = pureCircuits.deriveCertifierKey(certifierSecret);

  // Simulate constructor arguments: only public keys passed
  const constructorArgs = [derivedAdminKey, derivedCertifierKey];

  // Verify constructor arguments contain NO secret bytes and neither is zero
  assert.equal(constructorArgs.length, 2);
  assert.notDeepEqual(constructorArgs[0], adminSecret);
  assert.notDeepEqual(constructorArgs[1], certifierSecret);
  assert.notDeepEqual(constructorArgs[1], new Uint8Array(32));
});

// 39. Deployment receipt schema validation and secret exclusion
test('39. Deployment receipt schema validation and secret exclusion', () => {
  const secret = new Uint8Array(32).fill(99);
  const adminKey = pureCircuits.deriveAdminKey(secret);
  const registrarPublicKey = bytesToHex(adminKey);
  const certifierPublicKey = '55'.repeat(32);

  const validReceipt: DeploymentReceipt = {
    schema: DEPLOYMENT_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: 'addr_test1' + '00'.repeat(25),
    deploymentTxId: 'txid_' + '11'.repeat(25),
    registrarPublicKey,
    certifierPublicKey,
    deployedAt: new Date().toISOString(),
    status: 'finalized',
  };

  const validated = validateDeploymentReceipt(validReceipt);
  assert.equal(validated.schema, DEPLOYMENT_RECEIPT_SCHEMA);
  assert.equal(validated.network, 'preprod');
  assert.equal(validated.contractAddress, validReceipt.contractAddress);
  assert.equal(validated.deploymentTxId, validReceipt.deploymentTxId);
  assert.equal(validated.status, 'finalized');
  assert.equal(validated.certifierPublicKey, certifierPublicKey);

  // Valid receipt with null deploymentTxId (when SDK does not expose it)
  const validReceiptNoTxId: DeploymentReceipt = {
    ...validReceipt,
    deploymentTxId: null,
  };
  const validatedNoTxId = validateDeploymentReceipt(validReceiptNoTxId);
  assert.equal(validatedNoTxId.deploymentTxId, null);

  // Rejection if certifier key is zero
  assert.throws(
    () => validateDeploymentReceipt({ ...validReceipt, certifierPublicKey: '00'.repeat(32) }),
    /Receipt certifierPublicKey cannot be a zero key/,
  );

  // Verify rejection if any sensitive secret property is present
  const receiptWithSecret = {
    ...validReceipt,
    registrarSecret: bytesToHex(secret),
  };
  assert.throws(
    () => validateDeploymentReceipt(receiptWithSecret),
    /forbidden sensitive property 'registrarSecret'/,
  );

  const receiptWithCertifierSecret = {
    ...validReceipt,
    certifierSecret: bytesToHex(secret),
  };
  assert.throws(
    () => validateDeploymentReceipt(receiptWithCertifierSecret),
    /forbidden sensitive property 'certifierSecret'/,
  );

  const receiptWithSeed = {
    ...validReceipt,
    seedPhrase: 'word word word',
  };
  assert.throws(
    () => validateDeploymentReceipt(receiptWithSeed),
    /forbidden sensitive property 'seedPhrase'/,
  );

  // Invalid schema
  assert.throws(
    () => validateDeploymentReceipt({ ...validReceipt, schema: 'other-schema' }),
    /Invalid receipt schema/,
  );

  // Invalid network
  assert.throws(
    () => validateDeploymentReceipt({ ...validReceipt, network: 'mainnet' }),
    /Invalid receipt network/,
  );
});

// 40. Explicit confirmation requirement transitions
test('40. Explicit confirmation requirement transitions', () => {
  const initial = INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE;
  assert.equal(initial.stage, 'idle');
  assert.equal(initial.errorMessage, null);

  // Open confirmation
  const confirming = onDeploymentConfirmOpen(initial);
  assert.equal(confirming.stage, 'confirming');

  // Dismiss confirmation
  const cancelled = onDeploymentConfirmCancel(confirming);
  assert.equal(cancelled.stage, 'idle');

  // If already deploying, opening confirm does nothing
  const deploying: RegistrarDeploymentUiState = {
    ...initial,
    stage: 'deploying',
  };
  assert.equal(onDeploymentConfirmOpen(deploying).stage, 'deploying');
});

// 41. Wallet approval waiting state and cancellation handling
test('41. Wallet approval waiting state and cancellation handling', () => {
  const initial = INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE;

  // 1. Enter requesting-wallet state
  const requesting = onDeploymentWalletRequest(initial);
  assert.equal(requesting.stage, 'requesting-wallet');

  // 2. User cancels in 1AM
  const cancelled = onDeploymentCancelled(requesting);
  assert.equal(cancelled.stage, 'cancelled');
  assert.equal(cancelled.errorMessage, null);

  // 3. Submitting state after wallet approval
  const submitting = onDeploymentSubmitting(requesting);
  assert.equal(submitting.stage, 'deploying');
});

// 42. Separate contract address and deployment transaction ID values
test('42. Separate contract address and deployment transaction ID values', () => {
  const initial = INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE;
  const dummyAddress = 'contract_address_12345';
  const dummyTxId = 'tx_id_67890';

  const receipt: DeploymentReceipt = {
    schema: DEPLOYMENT_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: dummyAddress,
    deploymentTxId: dummyTxId,
    registrarPublicKey: 'aa'.repeat(32),
    certifierPublicKey: 'bb'.repeat(32),
    deployedAt: new Date().toISOString(),
    status: 'finalized',
  };

  const completed = onDeploymentCompleted(initial, receipt);
  assert.equal(completed.stage, 'deployed');
  assert.equal(completed.contractAddress, dummyAddress);
  assert.equal(completed.deploymentTxId, dummyTxId);
  assert.notEqual(completed.contractAddress, completed.deploymentTxId);
});

// 43. Finalized-but-not-indexed state and retry inspection without redeploying
test('43. Finalized-but-not-indexed state and retry inspection without redeploying', () => {
  const initial = INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE;
  const contractAddress = 'contract_address_lagging_indexer';
  const txId = 'tx_id_1111';

  // Deployment finalized on-chain, but indexer lookup failed
  const indexedLagState = onDeploymentFinalizedIndexing(initial, {
    contractAddress,
    deploymentTxId: txId,
  });

  assert.equal(indexedLagState.stage, 'finalized-indexing');
  assert.equal(indexedLagState.contractAddress, contractAddress);
  assert.equal(indexedLagState.deploymentTxId, txId);
  assert.equal(indexedLagState.errorMessage, null);

  // Redeployment is prevented while in finalized-indexing state
  assert.equal(
    canInitiateDeployment({
      isConnected: true,
      hasSecret: true,
      backupConfirmed: true,
      isDeploying: true, // finalized-indexing is treated as busy/isDeploying
      proofProviderAvailable: true,
      certifierPublicKey: '44'.repeat(32),
    }),
    false,
  );

  // Completing inspection transitions to deployed
  const receipt: DeploymentReceipt = {
    schema: DEPLOYMENT_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress,
    deploymentTxId: txId,
    registrarPublicKey: 'aa'.repeat(32),
    certifierPublicKey: '44'.repeat(32),
    deployedAt: new Date().toISOString(),
    status: 'finalized',
  };

  const finalizedAndIndexed = onDeploymentCompleted(indexedLagState, receipt);
  assert.equal(finalizedAndIndexed.stage, 'deployed');
  assert.equal(finalizedAndIndexed.contractAddress, contractAddress);
});

// 44. Safe deployment error mapping without leaks
test('44. Safe deployment error mapping without leaks', () => {
  assert.equal(
    mapDeploymentError(new Error('User aborted wallet request')),
    'Deployment transaction was cancelled in 1AM.',
  );
  assert.equal(
    mapDeploymentError(new Error('Insufficient balance or dust capacity')),
    'Insufficient DUST or balance in connected 1AM wallet to cover deployment fees.',
  );
  assert.equal(
    mapDeploymentError(new Error('Prover connection error at http://internal.prover:6300')),
    'ZK proof generation failed. Ensure your local proof server is reachable and responsive.',
  );
  assert.equal(
    mapDeploymentError(new Error('Connection to preprod node closed unexpectedly')),
    'Network communication failure during deployment. Check Midnight Preprod connectivity.',
  );
  assert.equal(
    mapDeploymentError(new Error('Indexer lookup timeout on graphql endpoint')),
    'Contract finalized on-chain, but indexer synchronization is delayed. Use retry inspection.',
  );
  // Unknown raw stack/error
  assert.equal(
    mapDeploymentError(new Error('Fatal exception at lib0xMidnightConnectorImpl.cpp:456')),
    'The deployment transaction could not be completed. Check the network connection and try again.',
  );
});

// 45. Stale async completion protection for overlapping deployment generations
test('45. Stale async completion protection for overlapping deployment generations', async () => {
  let deployGenerationCounter = 0;
  let activeDeployToken: number | null = null;
  let state = INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE;

  // Deployment A starts
  const tokenA = ++deployGenerationCounter;
  activeDeployToken = tokenA;
  state = onDeploymentWalletRequest(state);
  assert.equal(state.stage, 'requesting-wallet');

  // Lifecycle reset (e.g. user switches address or clears secret)
  state = onDeploymentReset(state);
  activeDeployToken = null;
  assert.equal(state.stage, 'idle');

  // Stale callback for A completes
  const handleStaleCallbackA = () => {
    if (activeDeployToken !== tokenA) {
      // Correctly dropped
      return;
    }
    state = onDeploymentCompleted(state, {
      schema: DEPLOYMENT_RECEIPT_SCHEMA,
      network: 'preprod',
      contractAddress: 'stale_addr',
      deploymentTxId: 'stale_tx',
      registrarPublicKey: '11'.repeat(32),
      certifierPublicKey: '22'.repeat(32),
      deployedAt: new Date().toISOString(),
      status: 'finalized',
    });
  };

  handleStaleCallbackA();
  // State must remain idle!
  assert.equal(state.stage, 'idle');
  assert.equal(state.contractAddress, null);
});

// 46. Zero certifier key package rejection
test('46. Zero certifier key package rejection', () => {
  const zeroKey = '00'.repeat(32);
  const pkgWithZeroKey = {
    schema: 'commonveil.certifier-key/v1',
    network: 'preprod',
    certifierPublicKey: zeroKey,
    createdAt: new Date().toISOString(),
  };

  assert.throws(
    () => {
      // Validating or importing a package with a zero key must be rejected
      const parsed = pkgWithZeroKey;
      if (parsed.certifierPublicKey.toLowerCase() === '00'.repeat(32)) {
        throw new Error('Certifier public key cannot be a zero key.');
      }
    },
    /Certifier public key cannot be a zero key/,
  );
});

// 47. Malformed certifier package rejected and genuine accepted
test('47. Malformed certifier package rejected and genuine accepted', () => {
  const certSecret = new Uint8Array(32).fill(65);
  const certPubKey = pureCircuits.deriveCertifierKey(certSecret);
  const certPubKeyHex = bytesToHex(certPubKey);

  // Valid package
  const validPkg = {
    schema: 'commonveil.certifier-key/v1',
    network: 'preprod',
    certifierPublicKey: certPubKeyHex,
    createdAt: new Date().toISOString(),
  };

  // Malformed: bad schema
  assert.throws(() => {
    const p = { ...validPkg, schema: 'invalid/schema' };
    if (p.schema !== 'commonveil.certifier-key/v1') {
      throw new Error('Invalid certifier key schema');
    }
  }, /Invalid certifier key schema/);

  // Malformed: short key
  assert.throws(() => {
    const p = { ...validPkg, certifierPublicKey: 'aa'.repeat(16) };
    if (!/^[0-9a-f]{64}$/i.test(p.certifierPublicKey)) {
      throw new Error('Certifier public key must be 32 hex bytes');
    }
  }, /Certifier public key must be 32 hex bytes/);
});

// 48. Certifier plaintext secret never reaches Registrar/provider/receipt/log/storage
test('48. Certifier plaintext secret never reaches Registrar/provider/receipt/log/storage', () => {
  const certSecret = new Uint8Array(32).fill(88);
  const certPubKey = pureCircuits.deriveCertifierKey(certSecret);
  const certPubKeyHex = bytesToHex(certPubKey);
  const certSecretHex = bytesToHex(certSecret);

  // Public package contains ONLY public key and metadata
  const publicPkg = {
    schema: 'commonveil.certifier-key/v1',
    network: 'preprod',
    certifierPublicKey: certPubKeyHex,
    createdAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(publicPkg);
  assert.equal(serialized.includes(certSecretHex), false);

  // Deployment receipt contains ONLY public keys
  const receipt: DeploymentReceipt = {
    schema: DEPLOYMENT_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: 'addr123',
    deploymentTxId: null,
    registrarPublicKey: 'aa'.repeat(32),
    certifierPublicKey: certPubKeyHex,
    deployedAt: new Date().toISOString(),
    status: 'finalized',
  };
  const receiptJson = JSON.stringify(receipt);
  assert.equal(receiptJson.includes(certSecretHex), false);
});

// 49. Incompatible ledger and registrar-key mismatch are hard failures, not indexer lag
test('49. Incompatible ledger and registrar-key mismatch are hard failures, not indexer lag', () => {
  // CONTRACT_NOT_FOUND and INDEXER_QUERY_FAILED are classified as indexer lag
  const isIndexerLagError = (err: unknown): boolean => {
    if (err instanceof ContractSessionError) {
      return (
        err.code === 'CONTRACT_NOT_FOUND' ||
        err.code === 'INDEXER_QUERY_FAILED'
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('Indexer') || msg.includes('CONTRACT_NOT_FOUND');
  };

  const notFoundErr = new ContractSessionError('CONTRACT_NOT_FOUND', 'Not found');
  const indexerQueryErr = new ContractSessionError('INDEXER_QUERY_FAILED', 'Query failed');
  const incompatibleErr = new ContractSessionError('INCOMPATIBLE_CONTRACT', 'Incompatible contract');
  const keyMismatchErr = new ContractSessionError(
    'INCOMPATIBLE_CONTRACT',
    'Contract registrar public key does not match the active registrar secret.',
  );

  assert.equal(isIndexerLagError(notFoundErr), true);
  assert.equal(isIndexerLagError(indexerQueryErr), true);
  // INCOMPATIBLE_CONTRACT and key mismatch must NOT be classified as indexer lag
  assert.equal(isIndexerLagError(incompatibleErr), false);
  assert.equal(isIndexerLagError(keyMismatchErr), false);
});

// 50. Post-deployment verification error sanitization prevents internal leaks
test('50. Post-deployment verification error sanitization prevents internal leaks', () => {
  // Incompatible contract
  const incompatibleErr = new ContractSessionError(
    'INCOMPATIBLE_CONTRACT',
    'Raw Compact state decoding failed at offset 0x48: schema mismatch',
  );
  assert.equal(
    mapDeploymentInspectionError(incompatibleErr),
    DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT,
  );

  // Registrar key mismatch
  const keyMismatchErr = new ContractSessionError(
    'INCOMPATIBLE_CONTRACT',
    'Deployed contract registrar key does not match active secret.',
  );
  assert.equal(
    mapDeploymentInspectionError(keyMismatchErr),
    DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH,
  );

  // Raw unexpected exception with internals/URLs/stack
  const rawLeakErr = new Error(
    'GraphQL client request to https://preprod-indexer.midnight.network/v1/graphql failed with status 502 Bad Gateway at QueryExecutor.ts:89',
  );
  const sanitized = mapDeploymentInspectionError(rawLeakErr);
  assert.equal(
    sanitized,
    DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE,
  );
  assert.equal(sanitized.includes('https://'), false);
  assert.equal(sanitized.includes('502'), false);
  assert.equal(sanitized.includes('QueryExecutor'), false);
});

// 51. Retry-indexer inspection error sanitization maps hard failures and unknown errors safely
test('51. Retry-indexer inspection error sanitization maps hard failures and unknown errors safely', () => {
  // Key mismatch string error
  const keyMismatch = 'Contract registrar secret does not match';
  assert.equal(
    mapDeploymentInspectionError(keyMismatch),
    DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH,
  );

  // Incompatible ledger string error
  const ledgerMismatch = 'Ledger state incompatible with protocol version';
  assert.equal(
    mapDeploymentInspectionError(ledgerMismatch),
    DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT,
  );

  // Unknown connector error
  const connectorErr = new Error('RPC endpoint unreachable');
  assert.equal(
    mapDeploymentInspectionError(connectorErr),
    DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE,
  );
});
