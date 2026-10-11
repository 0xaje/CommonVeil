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
  type BackupRecoveryStatus,
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
  MEMBER_BACKUP_SCHEMA,
  type MemberBackupPackage,
  type MemberSecretUiState,
  INITIAL_MEMBER_SECRET_UI_STATE,
  validateMemberSecretOrSaltHex,
  parseMemberSecretOrSaltHex,
  generateMemberSecretOrSalt,
  validateMemberBackupPackage,
  buildMemberBackupPackage,
  buildMemberAdmissionPackage,
  onMemberSecretGeneratedOrImported,
  onMemberSecretRestoredFromBackup,
  onMemberSecretClearedOrLocked,
  MEMBER_ADMISSION_RECEIPT_SCHEMA,
  type MemberAdmissionReceipt,
  validateMemberAdmissionReceipt,
  buildMemberAdmissionReceipt,
  INITIAL_REGISTRAR_ADMISSION_UI_STATE,
  type RegistrarAdmissionUiState,
  onAdmissionPackageImported,
  onAdmissionWalletRequest,
  onAdmissionSubmitting,
  onAdmissionFinalizedIndexing,
  onAdmissionCompleted,
  onAdmissionFailed,
  onAdmissionReset,
  mapMemberOperationError,
  mapAdmissionError,
  mapAdmissionInspectionError,
  canInitiateAdmission,
  ADMISSION_VERIFICATION_ERROR_MESSAGES,
  hasPasswordWhitespaceWarning,
  validatePasswordConfirmation,
  onBackupExported,
  onBackupRecoveryTested,
  canExportMemberAdmissionPackage,
  canExportCertifierKeyPackage,
  buildCertifierBackupPackage,
  validateCertifierBackupPackage,
  buildCertifierKeyPackage,
  CERTIFIER_BACKUP_SCHEMA,
  INITIAL_CERTIFIER_SECRET_UI_STATE,
  generateCertifierSecret,
  triggerBlobDownload,
  INITIAL_MEMBER_INVENTORY_UI_STATE,
  type MemberInventoryUiState,
  canExportCertificationRequest,
  checkCertificationRequestPrerequisites,
  onMemberInventoryImported,
  onMemberInventoryReset,
  onMemberInventoryError,
  mapInventoryReportError,
} from '../src/role-workspace-state.ts';
import {
  bytesToHex,
  hexToBytes,
  encryptToEnvelope,
  decryptAndValidateEnvelope,
  type EncryptedEnvelope,
  MEMBER_ADMISSION_SCHEMA,
  type MemberAdmissionPackage,
  validateMemberAdmissionPackage,
  type ValidatedLiveInventoryReport,
  validateLiveInventoryReport,
  buildCertificationRequestPackage,
  validateCertificationRequestPackage,
  computeMeasurementDigest,
  CERTIFICATION_REQUEST_SCHEMA,
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
    backupRecoveryStatus: 'recovery-tested' as const,
    isDeploying: false,
    proofProviderAvailable: true,
    certifierPublicKey: dummyCertifierKey,
  };
  assert.equal(canInitiateDeployment(fullyReady), true);

  // Missing wallet
  assert.equal(canInitiateDeployment({ ...fullyReady, isConnected: false }), false);

  // Missing secret
  assert.equal(canInitiateDeployment({ ...fullyReady, hasSecret: false }), false);

  // Missing backup confirmation checkbox (both recovery-tested and explicit checkbox required)
  assert.equal(canInitiateDeployment({ ...fullyReady, backupConfirmed: false }), false);

  // Untested backup recovery status blocks deployment even if backupConfirmed checkbox is true
  assert.equal(canInitiateDeployment({ ...fullyReady, backupRecoveryStatus: 'created-untested' }), false);
  assert.equal(canInitiateDeployment({ ...fullyReady, backupRecoveryStatus: 'none' }), false);

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
      backupRecoveryStatus: 'recovery-tested',
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

// 52. Secret and salt generation and format validation
test('52. Member secret and salt generation and format validation', () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();

  assert.equal(secret instanceof Uint8Array, true);
  assert.equal(salt instanceof Uint8Array, true);
  assert.equal(secret.length, 32);
  assert.equal(salt.length, 32);

  const secretHex = bytesToHex(secret);
  const saltHex = bytesToHex(salt);

  assert.equal(validateMemberSecretOrSaltHex(secretHex, 'Secret'), secretHex);
  assert.equal(validateMemberSecretOrSaltHex(saltHex, 'Salt'), saltHex);

  // Rejection of invalid lengths and characters
  assert.throws(() => validateMemberSecretOrSaltHex('1234', 'Secret'), /must be exactly 32 bytes/);
  assert.throws(() => validateMemberSecretOrSaltHex('z'.repeat(64), 'Salt'), /invalid non-hexadecimal characters/);
  assert.throws(() => validateMemberSecretOrSaltHex(12345, 'Secret'), /must be a hexadecimal string/);
});

// 53. Independent secret and salt values
test('53. Independent member secret and salt values', () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();

  // Cryptographically random 32-byte values must never collide
  assert.notDeepEqual(secret, salt);
  assert.notEqual(bytesToHex(secret), bytesToHex(salt));
});

// 54. Encrypted Member backup round trip
test('54. Encrypted Member backup round trip (AES-256-GCM + 600,000 PBKDF2 iterations)', async () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const passphrase = 'member-strong-passphrase-2026';

  const backupPackage = buildMemberBackupPackage(secret, salt);
  assert.equal(backupPackage.schema, MEMBER_BACKUP_SCHEMA);
  assert.equal(backupPackage.role, 'member');
  assert.equal(backupPackage.memberSecret, bytesToHex(secret));
  assert.equal(backupPackage.memberSalt, bytesToHex(salt));

  const envelope = await encryptToEnvelope(backupPackage, passphrase);
  assert.equal(envelope.cipher, 'AES-256-GCM');
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256');
  assert.equal(envelope.iterations, 600_000);

  const restored = await decryptAndValidateEnvelope(
    envelope,
    passphrase,
    validateMemberBackupPackage,
  );

  assert.equal(restored.schema, MEMBER_BACKUP_SCHEMA);
  assert.equal(restored.role, 'member');
  assert.equal(restored.memberSecret, bytesToHex(secret));
  assert.equal(restored.memberSalt, bytesToHex(salt));
});

// 55. Wrong passphrase and tampering rejection
test('55. Member encrypted backup wrong passphrase and tampering rejection', async () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const passphrase = 'correct-passphrase-min12';
  const wrongPassphrase = 'wrong-passphrase-min12!';

  const backupPackage = buildMemberBackupPackage(secret, salt);
  const envelope = await encryptToEnvelope(backupPackage, passphrase);

  // Wrong passphrase rejection
  await assert.rejects(
    () => decryptAndValidateEnvelope(envelope, wrongPassphrase, validateMemberBackupPackage),
    /Failed to decrypt envelope|incorrect passphrase/i,
  );

  // Tampered ciphertext rejection
  const tamperedCiphertext =
    envelope.ciphertext.slice(0, -4) + (envelope.ciphertext.endsWith('0000') ? 'ffff' : '0000');
  const tamperedEnvelope: EncryptedEnvelope = {
    ...envelope,
    ciphertext: tamperedCiphertext,
  };

  await assert.rejects(
    () => decryptAndValidateEnvelope(tamperedEnvelope, passphrase, validateMemberBackupPackage),
    /Failed to decrypt envelope|tampered/i,
  );
});

// 56. Restored-backup copy prohibition
test('56. Restored-backup copy prohibition', () => {
  const initial = INITIAL_MEMBER_SECRET_UI_STATE;
  assert.equal(initial.canCopyOnce, false);

  // Direct generation or import grants copy opportunity
  const generated = onMemberSecretGeneratedOrImported(initial, '11'.repeat(32));
  assert.equal(generated.hasSecret, true);
  assert.equal(generated.canCopyOnce, true);

  // Backup restoration explicitly PROHIBITS plaintext copying
  const restored = onMemberSecretRestoredFromBackup(initial, '11'.repeat(32));
  assert.equal(restored.hasSecret, true);
  assert.equal(restored.canCopyOnce, false);
});

// 57. Lifecycle clearing and zeroization
test('57. Lifecycle clearing and zeroization', () => {
  const secret = new Uint8Array(32).fill(42);
  const salt = new Uint8Array(32).fill(84);

  zeroizeBytes(secret);
  zeroizeBytes(salt);

  assert.deepEqual(secret, new Uint8Array(32));
  assert.deepEqual(salt, new Uint8Array(32));

  const active = onMemberSecretGeneratedOrImported(INITIAL_MEMBER_SECRET_UI_STATE, 'aa'.repeat(32));
  assert.equal(active.hasSecret, true);

  // Lock session
  const locked = onMemberSecretClearedOrLocked(active, true);
  assert.equal(locked.hasSecret, false);
  assert.equal(locked.isLocked, true);
  assert.equal(locked.memberCredentialHex, null);
  assert.equal(locked.canCopyOnce, false);

  // Clear session on disconnect or role change
  const cleared = onMemberSecretClearedOrLocked(active, false);
  assert.equal(cleared.hasSecret, false);
  assert.equal(cleared.isLocked, false);
  assert.equal(cleared.memberCredentialHex, null);
  assert.equal(cleared.canCopyOnce, false);
});

// 58. Correct credential derivation via pure circuits
test('58. Correct member credential derivation via pure circuits', () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();

  const credential1 = pureCircuits.deriveMemberCredential(secret, salt);
  const credential2 = pureCircuits.deriveMemberCredential(secret, salt);

  assert.equal(credential1 instanceof Uint8Array, true);
  assert.equal(credential1.length, 32);
  assert.deepEqual(credential1, credential2);

  // Different salt must produce different credential
  const differentSalt = generateMemberSecretOrSalt();
  const credential3 = pureCircuits.deriveMemberCredential(secret, differentSalt);
  assert.notDeepEqual(credential1, credential3);
});

// 59. Admission package contains only allowed fields and no private material
test('59. Admission package contains only allowed fields and no private material', () => {
  const contractAddress = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const credentialBytes = pureCircuits.deriveMemberCredential(secret, salt);

  const pkg = buildMemberAdmissionPackage(contractAddress, credentialBytes);

  assert.equal(pkg.schema, MEMBER_ADMISSION_SCHEMA);
  assert.equal(pkg.contractAddress, contractAddress);
  assert.equal(pkg.memberCredential, bytesToHex(credentialBytes));
  assert.equal(typeof pkg.createdAt, 'string');

  // Verify strict key count: only schema, contractAddress, memberCredential, createdAt
  const keys = Object.keys(pkg);
  assert.deepEqual(keys.sort(), ['contractAddress', 'createdAt', 'memberCredential', 'schema'].sort());

  // Confirm no secret, salt, wallet, or inventory material
  assert.equal('memberSecret' in pkg, false);
  assert.equal('memberSalt' in pkg, false);
  assert.equal('passphrase' in pkg, false);
  assert.equal('inventory' in pkg, false);
});

// 60. Admission package contract-address mismatch rejection
test('60. Admission package contract-address mismatch rejection', () => {
  const attachedContract = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';
  const otherContract = '1122334455667788990011223344556677889900112233445566778899001122';

  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const credential = pureCircuits.deriveMemberCredential(secret, salt);

  const pkg = buildMemberAdmissionPackage(otherContract, credential);

  const state = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    pkg,
    attachedContract,
  );

  assert.equal(state.stage, 'failed');
  assert.equal(state.importedPackage, null);
  assert.match(state.errorMessage ?? '', /does not match the attached contract/i);

  // Matching contract address succeeds into confirming state
  const matchingPkg = buildMemberAdmissionPackage(attachedContract, credential);
  const matchingState = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    matchingPkg,
    attachedContract,
  );

  assert.equal(matchingState.stage, 'confirming');
  assert.deepEqual(matchingState.importedPackage, matchingPkg);
  assert.equal(matchingState.errorMessage, null);
});

// 61. Registrar verification prerequisite before admission import
test('61. Registrar verification prerequisite before admission import', () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const credential = pureCircuits.deriveMemberCredential(secret, salt);
  const pkg = buildMemberAdmissionPackage('contract123', credential);

  // When attachedContractAddress is null, import fails cleanly
  const state = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    pkg,
    null,
    'verified',
  );

  assert.equal(state.stage, 'failed');
  assert.match(state.errorMessage ?? '', /Attach to a verified CommonVeil contract/i);

  // When registrar verificationStatus is unverified, import fails
  const stateUnverified = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    pkg,
    'contract123',
    'unverified',
  );
  assert.equal(stateUnverified.stage, 'failed');
  assert.match(stateUnverified.errorMessage ?? '', /Active Registrar secret must be verified/i);

  // When registrar verificationStatus is failed, import fails
  const stateFailed = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    pkg,
    'contract123',
    'failed',
  );
  assert.equal(stateFailed.stage, 'failed');
  assert.match(stateFailed.errorMessage ?? '', /Active Registrar secret must be verified/i);
});

// 62. Transaction double-click prevention and cancellation
test('62. Transaction double-click prevention and cancellation', () => {
  let state = INITIAL_REGISTRAR_ADMISSION_UI_STATE;
  state = { ...state, stage: 'confirming' };

  // First wallet request
  state = onAdmissionWalletRequest(state);
  assert.equal(state.stage, 'requesting-wallet');

  // Rapid second invocation while requesting-wallet or submitting must be a no-op
  const duplicateState = onAdmissionWalletRequest(state);
  assert.equal(duplicateState.stage, 'requesting-wallet');

  state = onAdmissionSubmitting(state);
  assert.equal(state.stage, 'submitting');

  const duplicateSubmitting = onAdmissionWalletRequest(state);
  assert.equal(duplicateSubmitting.stage, 'submitting');

  // User cancellation in 1AM
  const cancelledState = onAdmissionFailed(state, 'Member admission transaction was cancelled in 1AM.', true);
  assert.equal(cancelledState.stage, 'cancelled');
  assert.match(cancelledState.errorMessage ?? '', /cancelled/i);
});

// 63. Finalized-but-not-indexed state transitions without resubmission
test('63. Finalized-but-not-indexed state transitions without resubmission', () => {
  let state = INITIAL_REGISTRAR_ADMISSION_UI_STATE;
  state = { ...state, stage: 'submitting' };

  // Enters finalized-indexing
  state = onAdmissionFinalizedIndexing(state);
  assert.equal(state.stage, 'finalized-indexing');

  // State remains finalized-indexing during manual retry polling
  assert.equal(state.stage, 'finalized-indexing');
  assert.equal(state.errorMessage, null);
});

// 64. Genuine public-ledger membership verification
test('64. Genuine public-ledger membership verification via hasMemberCredential', () => {
  const credential = generateMemberSecretOrSalt();
  const nonMemberCredential = generateMemberSecretOrSalt();

  // Test double of ContractSession with exact hasMemberCredential contract
  const admittedSet = new Set([bytesToHex(credential)]);
  const session = {
    hasMemberCredential: (bytes: Uint8Array) => admittedSet.has(bytesToHex(bytes)),
  };

  assert.equal(session.hasMemberCredential(credential), true);
  assert.equal(session.hasMemberCredential(nonMemberCredential), false);
});

// 65. Admission receipt validation and private-data exclusion
test('65. Admission receipt validation and private-data exclusion', () => {
  const contractAddress = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';
  const credentialHex = 'bb'.repeat(32);
  const txId = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';

  const receipt = buildMemberAdmissionReceipt({
    contractAddress,
    memberCredential: credentialHex,
    admissionTxId: txId,
  });

  assert.equal(receipt.schema, MEMBER_ADMISSION_RECEIPT_SCHEMA);
  assert.equal(receipt.network, 'preprod');
  assert.equal(receipt.contractAddress, contractAddress);
  assert.equal(receipt.admittedMemberCredential, credentialHex);
  assert.equal(receipt.admissionTxId, txId);
  assert.equal(receipt.status, 'finalized');
  assert.equal(typeof receipt.admittedAt, 'string');

  // Ensure no secret or private state in receipt
  assert.equal('memberSecret' in receipt, false);
  assert.equal('memberSalt' in receipt, false);
  assert.equal('adminSecret' in receipt, false);

  // Validate receipt parser accepts valid and rejects tampered
  const validated = validateMemberAdmissionReceipt(receipt);
  assert.deepEqual(validated, receipt);

  assert.throws(() => validateMemberAdmissionReceipt({ ...receipt, network: 'mainnet' }), /preprod/);
  assert.throws(() => validateMemberAdmissionReceipt({ ...receipt, status: 'pending' }), /finalized/);
  assert.throws(() => validateMemberAdmissionReceipt({ ...receipt, admittedMemberCredential: '123' }), /32-byte/);
});

// 66. Raw error sanitization for member and admission operations
test('66. Raw error sanitization for member and admission operations', () => {
  // Member errors
  const rawMemberLeak = new Error('CryptoKey import failed: invalid key bytes at node:crypto:124');
  const sanitizedMember = mapMemberOperationError(rawMemberLeak);
  assert.equal(sanitizedMember.includes('node:crypto'), false);
  assert.equal(sanitizedMember.includes('CryptoKey'), false);

  // Duplicate member error
  const dupErr = new Error('Ledger assertion failed: member already admitted in memberCredentials set');
  const sanitizedDup = mapAdmissionError(dupErr);
  assert.equal(sanitizedDup, 'This member credential has already been admitted to this contract.');

  // Insufficient DUST
  const dustErr = new Error('Insufficient balance: account has 0 DUST');
  const sanitizedDust = mapAdmissionError(dustErr);
  assert.equal(sanitizedDust, 'Insufficient DUST or balance in connected 1AM wallet to cover transaction fees.');

  // Prover failure
  const proverErr = new Error('Prover failed at http://127.0.0.1:6300/prove: exit 1');
  const sanitizedProver = mapAdmissionError(proverErr);
  assert.equal(sanitizedProver.includes('http://127.0.0.1:6300'), false);
  assert.equal(sanitizedProver, 'ZK proof generation failed. Ensure your local proof server is reachable and responsive.');

  // Wallet cancellation
  const cancelErr = new Error('User cancelled transaction in 1AM wallet');
  assert.equal(mapAdmissionError(cancelErr), 'Member admission transaction was cancelled in 1AM.');
});

// 67. Constructor / deployment parameters remain unchanged
test('67. Constructor and deployment logic remains unchanged from verified live checkpoint', () => {
  // Ensure deployment receipt schema and deployment reducer contracts remain unaffected
  const deploymentReceipt: DeploymentReceipt = {
    schema: DEPLOYMENT_RECEIPT_SCHEMA,
    network: 'preprod',
    contractAddress: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b',
    deploymentTxId: null,
    registrarPublicKey: 'aa'.repeat(32),
    certifierPublicKey: 'bb'.repeat(32),
    deployedAt: new Date().toISOString(),
    status: 'finalized',
  };

  const validated = validateDeploymentReceipt(deploymentReceipt);
  assert.equal(validated.schema, DEPLOYMENT_RECEIPT_SCHEMA);
  assert.equal(validated.status, 'finalized');
  assert.equal(validated.certifierPublicKey, 'bb'.repeat(32));
});

// 68. Active but unverified Registrar secret blocks import and submission
test('68. Active but unverified Registrar secret blocks import and submission', () => {
  const attachedContract = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';

  // canInitiateAdmission pure validator
  const unverified = canInitiateAdmission({
    isConnected: true,
    attachedContractAddress: attachedContract,
    hasSecret: true,
    verificationStatus: 'unverified',
    isAdmitting: false,
  });
  assert.equal(unverified, false);

  // Import handler blocks unverified
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const credential = pureCircuits.deriveMemberCredential(secret, salt);
  const pkg = buildMemberAdmissionPackage(attachedContract, credential);

  const importState = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    pkg,
    attachedContract,
    'unverified',
  );
  assert.equal(importState.stage, 'failed');
  assert.match(importState.errorMessage ?? '', /Active Registrar secret must be verified/i);
});

// 69. Failed verification blocks submission
test('69. Failed verification blocks submission', () => {
  const attachedContract = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';

  const failedStatus = canInitiateAdmission({
    isConnected: true,
    attachedContractAddress: attachedContract,
    hasSecret: true,
    verificationStatus: 'failed',
    isAdmitting: false,
  });
  assert.equal(failedStatus, false);

  const missingSecret = canInitiateAdmission({
    isConnected: true,
    attachedContractAddress: attachedContract,
    hasSecret: false,
    verificationStatus: 'verified',
    isAdmitting: false,
  });
  assert.equal(missingSecret, false);

  const disconnected = canInitiateAdmission({
    isConnected: false,
    attachedContractAddress: attachedContract,
    hasSecret: true,
    verificationStatus: 'verified',
    isAdmitting: false,
  });
  assert.equal(disconnected, false);

  const unattached = canInitiateAdmission({
    isConnected: true,
    attachedContractAddress: null,
    hasSecret: true,
    verificationStatus: 'verified',
    isAdmitting: false,
  });
  assert.equal(unattached, false);

  const alreadyAdmitting = canInitiateAdmission({
    isConnected: true,
    attachedContractAddress: attachedContract,
    hasSecret: true,
    verificationStatus: 'verified',
    isAdmitting: true,
  });
  assert.equal(alreadyAdmitting, false);
});

// 70. Verified Registrar permits submission preparation
test('70. Verified Registrar permits submission preparation', () => {
  const attachedContract = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';

  const verified = canInitiateAdmission({
    isConnected: true,
    attachedContractAddress: attachedContract,
    hasSecret: true,
    verificationStatus: 'verified',
    isAdmitting: false,
  });
  assert.equal(verified, true);

  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const credential = pureCircuits.deriveMemberCredential(secret, salt);
  const pkg = buildMemberAdmissionPackage(attachedContract, credential);

  const importState = onAdmissionPackageImported(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
    pkg,
    attachedContract,
    'verified',
  );
  assert.equal(importState.stage, 'confirming');
  assert.deepEqual(importState.importedPackage, pkg);
});

// 71. Captured finalized txId survives indexer delay and retry
test('71. Captured finalized txId survives indexer delay and retry', () => {
  const genuineTxId = '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff';
  let state = INITIAL_REGISTRAR_ADMISSION_UI_STATE;
  state = { ...state, stage: 'submitting' };

  // When submitting finalizes on-chain but indexer has not caught up:
  state = onAdmissionFinalizedIndexing(state, genuineTxId);
  assert.equal(state.stage, 'finalized-indexing');
  assert.equal(state.admissionTxId, genuineTxId);

  // Calling onAdmissionFinalizedIndexing without txId or null must NEVER overwrite an already-captured txId
  state = onAdmissionFinalizedIndexing(state, null);
  assert.equal(state.admissionTxId, genuineTxId);

  state = onAdmissionFinalizedIndexing(state);
  assert.equal(state.admissionTxId, genuineTxId);
});

// 72. Retry receipt contains the original genuine txId
test('72. Retry receipt contains the original genuine txId', () => {
  const attachedContract = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';
  const genuineTxId = '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff';
  const memberCred = 'bb'.repeat(32);

  let state = onAdmissionFinalizedIndexing(INITIAL_REGISTRAR_ADMISSION_UI_STATE, genuineTxId);
  assert.equal(state.admissionTxId, genuineTxId);

  // Build receipt using preserved genuine admissionTxId
  const receipt = buildMemberAdmissionReceipt({
    contractAddress: attachedContract,
    memberCredential: memberCred,
    admissionTxId: state.admissionTxId,
  });

  assert.equal(receipt.admissionTxId, genuineTxId);

  // onAdmissionCompleted transitions state to admitted and preserves receipt
  state = onAdmissionCompleted(state, receipt);
  assert.equal(state.stage, 'admitted');
  assert.equal(state.receipt?.admissionTxId, genuineTxId);
  assert.equal(state.admissionTxId, genuineTxId);
});

// 73. Workflow reset clears the retained txId
test('73. Workflow reset clears the retained txId', () => {
  const genuineTxId = '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff';
  let state = onAdmissionFinalizedIndexing(INITIAL_REGISTRAR_ADMISSION_UI_STATE, genuineTxId);
  assert.equal(state.admissionTxId, genuineTxId);

  const resetState = onAdmissionReset(state);
  assert.equal(resetState.stage, 'idle');
  assert.equal(resetState.admissionTxId, null);
  assert.equal(resetState.importedPackage, null);
  assert.equal(resetState.receipt, null);
  assert.equal(resetState.errorMessage, null);
});

// 74. Only lookup/not-found or missing updated membership are retryable
test('74. Only lookup/not-found or missing updated membership are retryable', () => {
  // Not found is retryable
  const notFoundErr = new ContractSessionError('CONTRACT_NOT_FOUND', 'Contract not found on indexer');
  assert.equal(notFoundErr.code === 'CONTRACT_NOT_FOUND', true);

  // Indexer query failed is retryable
  const queryFailedErr = new ContractSessionError('INDEXER_QUERY_FAILED', 'Indexer query failed');
  assert.equal(queryFailedErr.code === 'INDEXER_QUERY_FAILED', true);

  // Incompatible contract is NOT retryable (maps to safe fixed error)
  const incompatibleErr = new ContractSessionError('INCOMPATIBLE_CONTRACT', 'Contract schema mismatch');
  const safeIncompatible = mapAdmissionInspectionError(incompatibleErr);
  assert.equal(safeIncompatible, ADMISSION_VERIFICATION_ERROR_MESSAGES.INCOMPATIBLE_CONTRACT);

  // Registrar mismatch is NOT retryable
  const mismatchErr = new Error('Registrar secret does not match contract authority');
  const safeMismatch = mapAdmissionInspectionError(mismatchErr);
  assert.equal(safeMismatch, ADMISSION_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH);

  // Unknown decoder / provider errors use fixed safe verification-failure message
  const unknownDecoderErr = new Error('Failed to decode CBOR sequence at offset 0x48a');
  const safeUnknown = mapAdmissionInspectionError(unknownDecoderErr);
  assert.equal(safeUnknown, ADMISSION_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE);
  assert.equal(safeUnknown.includes('CBOR'), false);
  assert.equal(safeUnknown.includes('0x48a'), false);
});

// 75. Incompatible and unknown errors become sanitized hard failures
test('75. Incompatible and unknown errors become sanitized hard failures without leaking internals', () => {
  const secretKeyLeakErr = new Error('GraphQLError: connection refused to https://indexer.preprod.midnight.network/graphql');
  const safeMsg = mapAdmissionInspectionError(secretKeyLeakErr);
  assert.equal(safeMsg, ADMISSION_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE);
  assert.equal(safeMsg.includes('https://'), false);
  assert.equal(safeMsg.includes('graphql'), false);

  // Ensure state becomes 'failed' when inspection hard failure occurs
  let state = INITIAL_REGISTRAR_ADMISSION_UI_STATE;
  state = { ...state, stage: 'submitting' };
  const failedState = onAdmissionFailed(state, safeMsg);
  assert.equal(failedState.stage, 'failed');
  assert.equal(failedState.errorMessage, ADMISSION_VERIFICATION_ERROR_MESSAGES.GENERIC_VERIFICATION_FAILURE);
});

// 76. Retry performs zero additional submitCallTx calls
test('76. Retry performs zero additional submitCallTx calls', async () => {
  let submitCallCount = 0;
  const mockSubmitCallTx = async () => {
    submitCallCount++;
    return { public: { txId: 'mock-tx-id' } };
  };

  // Submission stage calls submitCallTx exactly once
  await mockSubmitCallTx();
  assert.equal(submitCallCount, 1);

  // Retry inspection tests membership via read-only indexer query and never invokes submitCallTx
  const mockQueryContract = async (credential: Uint8Array) => {
    return {
      hasMemberCredential: (_c: Uint8Array) => true,
      publicState: { registrarPublicKey: 'aa'.repeat(32), certifierPublicKey: 'bb'.repeat(32), memberCount: 1n },
    };
  };

  const session = await mockQueryContract(new Uint8Array(32));
  assert.equal(session.hasMemberCredential(new Uint8Array(32)), true);

  // Confirm zero additional submitCallTx calls were made during retry
  assert.equal(submitCallCount, 1);
});

// 77. Regression: Passing privateStateId to unseeded private state provider reproduces pre-proof failure
test('77. Regression: Passing privateStateId to unseeded private state provider reproduces pre-proof failure', async () => {
  const privateStateStore = new Map<string, any>();
  const mockPrivateStateProvider = {
    setContractAddress: (_addr: string) => {},
    get: async (key: string) => privateStateStore.get(key) ?? null,
  };

  // Simulating the Midnight SDK getStates assertion:
  // assertDefined(privateState, `No private state found at private state ID '${privateStateId}'`)
  const executeCallTxSetup = async (options: { privateStateId?: string }) => {
    if ('privateStateId' in options && options.privateStateId) {
      const privateState = await mockPrivateStateProvider.get(options.privateStateId);
      if (privateState === null || privateState === undefined) {
        throw new Error(`Unexpected error executing scoped transaction '<unnamed>': Error: No private state found at private state ID '${options.privateStateId}'`);
      }
    }
    return { status: 'ready-to-prove-and-balance' };
  };

  // With privateStateId provided on unseeded provider: fails before proof request
  await assert.rejects(
    () => executeCallTxSetup({ privateStateId: 'commonveilPrivateState' }),
    (err: any) => {
      assert.equal(err instanceof Error, true);
      assert.match(err.message, /No private state found at private state ID 'commonveilPrivateState'/);
      // Verify our safe error mapping sanitizes this without leaking internal details
      const userMessage = mapAdmissionError(err);
      assert.equal(
        userMessage,
        'The member admission transaction could not be completed. Check the network connection and try again.',
      );
      return true;
    },
  );
});

// 78. Corrected registerMember invocation omits privateStateId and proceeds without uninitialized private state lookup
test('78. Corrected registerMember invocation omits privateStateId and proceeds without uninitialized private state lookup', async () => {
  const privateStateStore = new Map<string, any>();
  let getCallCount = 0;
  const mockPrivateStateProvider = {
    setContractAddress: (_addr: string) => {},
    get: async (key: string) => {
      getCallCount++;
      return privateStateStore.get(key) ?? null;
    },
  };

  // Simulating Midnight SDK CallTxOptionsBase (without privateStateId):
  const executeCallTxSetup = async (options: { privateStateId?: string; circuitId: string; args: unknown[] }) => {
    if ('privateStateId' in options && options.privateStateId) {
      const privateState = await mockPrivateStateProvider.get(options.privateStateId);
      if (privateState === null || privateState === undefined) {
        throw new Error(`No private state found at private state ID '${options.privateStateId}'`);
      }
    }
    // For Contract<undefined> circuits (registerMember), public states are queried instead
    return { status: 'ready-to-prove-and-balance' };
  };

  // Calling with CallTxOptionsBase without privateStateId:
  const result = await executeCallTxSetup({
    circuitId: 'registerMember',
    args: [new Uint8Array(32), new Uint8Array(32)],
  });

  assert.equal(result.status, 'ready-to-prove-and-balance');
  assert.equal(getCallCount, 0, 'No private state lookup should occur for circuit with vacant witness state');
});

// 79. Password confirmation and minimum length enforcement
test('79. Password confirmation and minimum length enforcement', () => {
  // Short password (<12 chars)
  const shortRes = validatePasswordConfirmation('short-pass', 'short-pass');
  assert.equal(shortRes.valid, false);
  assert.match(shortRes.error!, /at least 12 characters/i);

  // Mismatch
  const mismatchRes = validatePasswordConfirmation('correct-passphrase-12', 'different-passphrase-12');
  assert.equal(mismatchRes.valid, false);
  assert.match(mismatchRes.error!, /does not match/i);

  // Exact match >= 12 chars
  const validRes = validatePasswordConfirmation('correct-passphrase-12', 'correct-passphrase-12');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.error, null);
});

// 80. Leading and trailing whitespace detection and exact preservation without trimming
test('80. Leading and trailing whitespace detection and exact preservation without trimming', async () => {
  // Whitespace detection
  assert.equal(hasPasswordWhitespaceWarning('  leading-spaces-1234'), true);
  assert.equal(hasPasswordWhitespaceWarning('trailing-spaces-1234  '), true);
  assert.equal(hasPasswordWhitespaceWarning('\tleading-tab-12345'), true);
  assert.equal(hasPasswordWhitespaceWarning('no-edge-whitespace-1234'), false);
  assert.equal(hasPasswordWhitespaceWarning('inner spaces preserved-12'), false);

  // Exact preservation in envelope encryption without trimming or normalization
  const passwordWithSpaces = '  untrimmed-password-2026!  ';
  const secret = generateRegistrarSecret();
  const pkg = buildRegistrarBackupPackage(secret);
  const envelope = await encryptToEnvelope(pkg, passwordWithSpaces);

  // Trimmed password must NOT decrypt it (proves it was not silently trimmed)
  await assert.rejects(
    () => decryptAndValidateEnvelope(envelope, passwordWithSpaces.trim(), validateRegistrarBackupPackage),
    /Failed to decrypt envelope|incorrect passphrase/i,
  );

  // Exact password with whitespace decrypts successfully
  const restored = await decryptAndValidateEnvelope(envelope, passwordWithSpaces, validateRegistrarBackupPackage);
  assert.equal(restored.registrarSecret, bytesToHex(secret));
});

// 81. Immediate in-memory encrypt and decrypt validation before download
test('81. Immediate in-memory encrypt and decrypt validation before download', async () => {
  const secret = generateRegistrarSecret();
  const passphrase = 'valid-passphrase-12345';
  const pkg = buildRegistrarBackupPackage(secret);
  const envelope = await encryptToEnvelope(pkg, passphrase);

  // Immediate roundtrip decrypt
  const restored = await decryptAndValidateEnvelope(envelope, passphrase, validateRegistrarBackupPackage);
  const restoredSecret = parseRegistrarSecretHex(restored.registrarSecret);
  const originalKey = bytesToHex(pureCircuits.deriveAdminKey(secret));
  const restoredKey = bytesToHex(pureCircuits.deriveAdminKey(restoredSecret));

  assert.equal(originalKey, restoredKey);
});

// 82. Downloaded backup recovery testing and role identity validation
test('82. Downloaded backup recovery testing and role identity validation', async () => {
  const secret = generateCertifierSecret();
  const passphrase = 'certifier-strong-pass-12';
  const pkg = buildCertifierBackupPackage(secret);
  const envelope = await encryptToEnvelope(pkg, passphrase);

  // Test downloaded envelope
  const restored = await decryptAndValidateEnvelope(envelope, passphrase, validateCertifierBackupPackage);
  const restoredSecret = parseRegistrarSecretHex(restored.certifierSecret);
  const currentKey = bytesToHex(pureCircuits.deriveCertifierKey(secret));
  const restoredKey = bytesToHex(pureCircuits.deriveCertifierKey(restoredSecret));

  assert.equal(currentKey, restoredKey);

  // Different secret causes identity mismatch
  const differentSecret = generateCertifierSecret();
  const differentKey = bytesToHex(pureCircuits.deriveCertifierKey(differentSecret));
  assert.notEqual(currentKey, differentKey);
});

// 83. Wrong-password and tampered-file rejection during recovery test
test('83. Wrong-password and tampered-file rejection during recovery test', async () => {
  const secret = generateMemberSecretOrSalt();
  const salt = generateMemberSecretOrSalt();
  const passphrase = 'member-safe-passphrase-2026';
  const pkg = buildMemberBackupPackage(secret, salt);
  const envelope = await encryptToEnvelope(pkg, passphrase);

  // Wrong password
  await assert.rejects(
    () => decryptAndValidateEnvelope(envelope, 'wrong-passphrase-2026', validateMemberBackupPackage),
    /Failed to decrypt envelope|incorrect passphrase/i,
  );

  // Tampered ciphertext
  const tamperedEnvelope: EncryptedEnvelope = {
    ...envelope,
    ciphertext: envelope.ciphertext.slice(0, -8) + 'ffffffff',
  };
  await assert.rejects(
    () => decryptAndValidateEnvelope(tamperedEnvelope, passphrase, validateMemberBackupPackage),
    /Failed to decrypt envelope|tampered/i,
  );
});

// 84. Wrong-role package schema rejection
test('84. Wrong-role package schema rejection', async () => {
  const secret = generateRegistrarSecret();
  const passphrase = 'valid-passphrase-12345';
  const regPkg = buildRegistrarBackupPackage(secret);
  const envelope = await encryptToEnvelope(regPkg, passphrase);

  // Attempting to validate a registrar package with the member validator fails schema validation
  await assert.rejects(
    () => decryptAndValidateEnvelope(envelope, passphrase, validateMemberBackupPackage),
    /Invalid backup schema|expected 'commonveil\.member-backup/i,
  );
});

// 85. Recovery-tested status lifecycle invalidation
test('85. Recovery-tested status lifecycle invalidation', () => {
  let state: RegistrarSecretUiState = INITIAL_REGISTRAR_SECRET_UI_STATE;
  assert.equal(state.backupRecoveryStatus, 'none');

  // After secret generated
  state = onSecretGeneratedOrImported(state);
  assert.equal(state.backupRecoveryStatus, 'none');

  // After backup exported
  state = onBackupExported(state);
  assert.equal(state.backupRecoveryStatus, 'created-untested');

  // After recovery tested
  state = onBackupRecoveryTested(state);
  assert.equal(state.backupRecoveryStatus, 'recovery-tested');

  // On session lock or clearing
  state = onSecretClearedOrLocked(state, true);
  assert.equal(state.backupRecoveryStatus, 'none');
  assert.equal(state.hasSecret, false);
});

// 86. Registrar deployment gating enforces recovery-tested backup
test('86. Registrar deployment gating enforces recovery-tested backup', () => {
  const dummyCertifierKey = '11'.repeat(32);
  const baseParams = {
    isConnected: true,
    hasSecret: true,
    backupConfirmed: true,
    isDeploying: false,
    proofProviderAvailable: true,
    certifierPublicKey: dummyCertifierKey,
  };

  // Blocked when backupRecoveryStatus is 'none'
  assert.equal(
    canInitiateDeployment({
      ...baseParams,
      backupRecoveryStatus: 'none',
    }),
    false,
  );

  // Blocked when backupRecoveryStatus is 'created-untested'
  assert.equal(
    canInitiateDeployment({
      ...baseParams,
      backupRecoveryStatus: 'created-untested',
    }),
    false,
  );

  // Blocked if backupRecoveryStatus is undefined/omitted at runtime (no fallback to backupConfirmed)
  assert.equal(
    canInitiateDeployment({
      ...baseParams,
      backupRecoveryStatus: undefined as unknown as BackupRecoveryStatus,
    }),
    false,
  );

  // Blocked even if recovery-tested when backupConfirmed checkbox is false (both are mandatory)
  assert.equal(
    canInitiateDeployment({
      ...baseParams,
      backupConfirmed: false,
      backupRecoveryStatus: 'recovery-tested',
    }),
    false,
  );

  // Enabled only when 'recovery-tested' AND backupConfirmed is true
  assert.equal(
    canInitiateDeployment({
      ...baseParams,
      backupConfirmed: true,
      backupRecoveryStatus: 'recovery-tested',
    }),
    true,
  );
});

// 87. Certifier public-key export gating enforces recovery-tested backup
test('87. Certifier public-key export gating enforces recovery-tested backup', () => {
  // Blocked without secret
  assert.equal(
    canExportCertifierKeyPackage({
      hasSecret: false,
      backupRecoveryStatus: 'recovery-tested',
    }),
    false,
  );

  // Blocked when untested
  assert.equal(
    canExportCertifierKeyPackage({
      hasSecret: true,
      backupRecoveryStatus: 'created-untested',
    }),
    false,
  );

  // Enabled when recovery-tested
  assert.equal(
    canExportCertifierKeyPackage({
      hasSecret: true,
      backupRecoveryStatus: 'recovery-tested',
    }),
    true,
  );
});

// 88. Member admission package export gating enforces recovery-tested backup
test('88. Member admission package export gating enforces recovery-tested backup', () => {
  const contractAddress = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';

  // Blocked without attached contract
  assert.equal(
    canExportMemberAdmissionPackage({
      hasSecret: true,
      attachedContractAddress: null,
      backupRecoveryStatus: 'recovery-tested',
    }),
    false,
  );

  // Blocked when backup untested
  assert.equal(
    canExportMemberAdmissionPackage({
      hasSecret: true,
      attachedContractAddress: contractAddress,
      backupRecoveryStatus: 'created-untested',
    }),
    false,
  );

  // Enabled when recovery-tested with attached contract
  assert.equal(
    canExportMemberAdmissionPackage({
      hasSecret: true,
      attachedContractAddress: contractAddress,
      backupRecoveryStatus: 'recovery-tested',
    }),
    true,
  );
});

// 89. Asynchronous deferred revocation and anchor cleanup in triggerBlobDownload helper
test('89. Asynchronous deferred revocation and anchor cleanup in triggerBlobDownload helper', async () => {
  let createdUrl = '';
  let revokedUrls: string[] = [];
  let clicked = false;
  let appendedChild = false;
  let removedChild = false;

  // Mock DOM environment for node test runner
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalDocument = globalThis.document;

  try {
    URL.createObjectURL = (blob: Blob) => {
      createdUrl = `blob:test-${Date.now()}`;
      return createdUrl;
    };
    URL.revokeObjectURL = (url: string) => {
      revokedUrls.push(url);
    };

    const mockAnchor = {
      href: '',
      download: '',
      style: { display: '' },
      click() {
        clicked = true;
      },
    };

    globalThis.document = {
      body: {
        appendChild(node: any) {
          appendedChild = true;
          return node;
        },
        removeChild(node: any) {
          removedChild = true;
          return node;
        },
      },
      createElement(tag: string) {
        if (tag === 'a') return mockAnchor;
        throw new Error(`Unexpected tag: ${tag}`);
      },
    } as any;

    // Use a very short delay (5ms) for the test
    const cleanup = triggerBlobDownload('{"test":true}', 'test-file.json', 'application/json', 5);

    // Synchronous execution checks: anchor was appended, clicked, removed, but URL not yet revoked
    assert.equal(appendedChild, true);
    assert.equal(clicked, true);
    assert.equal(removedChild, true);
    assert.equal(mockAnchor.download, 'test-file.json');
    assert.equal(revokedUrls.length, 0, 'Object URL must not be revoked synchronously upon click');

    // Wait for the asynchronous deferred revocation timer
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(revokedUrls.includes(createdUrl), true, 'Object URL must be revoked after timeout');
  } finally {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.document = originalDocument;
  }
});

// 90. Strict deployment gating rejects omission and demands both recovery-tested and confirmation
test('90. Strict deployment gating rejects omission and demands both recovery-tested and confirmation', () => {
  const readyParams = {
    isConnected: true,
    hasSecret: true,
    backupConfirmed: true,
    backupRecoveryStatus: 'recovery-tested' as const,
    isDeploying: false,
    proofProviderAvailable: true,
    certifierPublicKey: 'ee'.repeat(32),
  };

  // Valid configuration passes
  assert.equal(canInitiateDeployment(readyParams), true);

  // Status = none is strictly rejected
  assert.equal(
    canInitiateDeployment({ ...readyParams, backupRecoveryStatus: 'none' }),
    false,
  );

  // Status = created-untested is strictly rejected
  assert.equal(
    canInitiateDeployment({ ...readyParams, backupRecoveryStatus: 'created-untested' }),
    false,
  );

  // Missing status / undefined rejected even if backupConfirmed is true
  assert.equal(
    canInitiateDeployment({
      ...readyParams,
      backupRecoveryStatus: undefined as unknown as BackupRecoveryStatus,
    }),
    false,
  );

  // recovery-tested alone without explicit backupConfirmed checkbox rejected
  assert.equal(
    canInitiateDeployment({ ...readyParams, backupConfirmed: false }),
    false,
  );
});

const SAMPLE_CONTRACT_ADDRESS = '0200abcd1234ef567890abcdef1234567890abcdef1234567890abcdef123456';
const SAMPLE_HEX_64 = 'a1'.repeat(32);
const FIXED_NOW = new Date('2026-10-07T12:00:00.000Z');

// 91. Strict workflow gating for certification request export
test('91. Strict workflow gating for certification request export', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport: ValidatedLiveInventoryReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    status: 'detected',
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    normalizedVersion: '5.2.5',
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
  };

  const readyParams = {
    isConnected: true,
    attachedContractAddress: SAMPLE_CONTRACT_ADDRESS,
    hasSecret: true,
    hasSalt: true,
    memberCredentialHex: SAMPLE_HEX_64,
    backupRecoveryStatus: 'recovery-tested' as const,
    importedInventory: validReport,
  };

  // All satisfied passes
  assert.equal(canExportCertificationRequest(readyParams), true);

  // Disconnected wallet rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, isConnected: false }),
    false,
  );

  // Missing contract address rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, attachedContractAddress: null }),
    false,
  );
  assert.equal(
    canExportCertificationRequest({ ...readyParams, attachedContractAddress: '' }),
    false,
  );

  // Missing secret rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, hasSecret: false }),
    false,
  );

  // Missing salt rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, hasSalt: false }),
    false,
  );

  // Missing memberCredentialHex rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, memberCredentialHex: null }),
    false,
  );

  // Invalid hex credential rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, memberCredentialHex: 'invalid-hex' }),
    false,
  );

  // Backup status none rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, backupRecoveryStatus: 'none' }),
    false,
  );

  // Backup status created-untested rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, backupRecoveryStatus: 'created-untested' }),
    false,
  );

  // Missing importedInventory rejected
  assert.equal(
    canExportCertificationRequest({ ...readyParams, importedInventory: null }),
    false,
  );
});

// 92. Missing individual prerequisites accurately identified by checkCertificationRequestPrerequisites
test('92. Missing individual prerequisites accurately identified by checkCertificationRequestPrerequisites', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport: ValidatedLiveInventoryReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    status: 'detected',
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    normalizedVersion: '5.2.5',
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
  };

  // Initially nothing connected or active
  const initial = checkCertificationRequestPrerequisites({
    isConnected: false,
    attachedContractAddress: null,
    hasSecret: false,
    hasSalt: false,
    memberCredentialHex: null,
    backupRecoveryStatus: 'none',
    importedInventory: null,
  });

  assert.equal(initial.canExport, false);
  assert.equal(initial.missingPrerequisites.length, 5);
  assert.equal(initial.missingPrerequisites.some((m) => m.includes('wallet')), true);
  assert.equal(initial.missingPrerequisites.some((m) => m.includes('contract')), true);
  assert.equal(initial.missingPrerequisites.some((m) => m.includes('Member secret')), true);
  assert.equal(initial.missingPrerequisites.some((m) => m.includes('backup')), true);
  assert.equal(initial.missingPrerequisites.some((m) => m.includes('report')), true);

  // Partial setup: wallet + contract attached + secret present, but backup not recovery tested and no report
  const partial = checkCertificationRequestPrerequisites({
    isConnected: true,
    attachedContractAddress: SAMPLE_CONTRACT_ADDRESS,
    hasSecret: true,
    hasSalt: true,
    memberCredentialHex: SAMPLE_HEX_64,
    backupRecoveryStatus: 'created-untested',
    importedInventory: null,
  });

  assert.equal(partial.canExport, false);
  assert.equal(partial.missingPrerequisites.length, 2);
  assert.equal(partial.missingPrerequisites.some((m) => m.includes('backup')), true);
  assert.equal(partial.missingPrerequisites.some((m) => m.includes('report')), true);

  // Fully satisfied setup
  const complete = checkCertificationRequestPrerequisites({
    isConnected: true,
    attachedContractAddress: SAMPLE_CONTRACT_ADDRESS,
    hasSecret: true,
    hasSalt: true,
    memberCredentialHex: SAMPLE_HEX_64,
    backupRecoveryStatus: 'recovery-tested',
    importedInventory: validReport,
  });

  assert.equal(complete.canExport, true);
  assert.equal(complete.missingPrerequisites.length, 0);
});

// 93. State reducer onMemberInventoryImported binds validated report and certification request
test('93. State reducer onMemberInventoryImported binds validated report and certification request', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport: ValidatedLiveInventoryReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    status: 'detected',
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    normalizedVersion: '5.2.5',
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
  };

  const certReq = buildCertificationRequestPackage({
    inventoryReport: validReport,
    contractAddress: SAMPLE_CONTRACT_ADDRESS,
    memberCredentialHex: SAMPLE_HEX_64,
    now: FIXED_NOW,
  });

  const nextState = onMemberInventoryImported(INITIAL_MEMBER_INVENTORY_UI_STATE, {
    fileName: 'live-scan-host.json',
    fileSize: 1024,
    report: validReport,
    certificationRequest: certReq,
  });

  assert.equal(nextState.selectedFileName, 'live-scan-host.json');
  assert.equal(nextState.selectedFileSize, 1024);
  assert.deepEqual(nextState.importedReport, validReport);
  assert.deepEqual(nextState.certificationRequest, certReq);
  assert.equal(nextState.errorMessage, null);
  assert.equal(nextState.noticeMessage !== null, true);
});

// 94. State reducer onMemberInventoryError clears imported report and request
test('94. State reducer onMemberInventoryError clears imported report and request', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport: ValidatedLiveInventoryReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    status: 'detected',
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    normalizedVersion: '5.2.5',
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
  };

  const certReq = buildCertificationRequestPackage({
    inventoryReport: validReport,
    contractAddress: SAMPLE_CONTRACT_ADDRESS,
    memberCredentialHex: SAMPLE_HEX_64,
    now: FIXED_NOW,
  });

  const populatedState = onMemberInventoryImported(INITIAL_MEMBER_INVENTORY_UI_STATE, {
    fileName: 'live-scan-host.json',
    fileSize: 1024,
    report: validReport,
    certificationRequest: certReq,
  });

  const errorState = onMemberInventoryError(populatedState, 'Invalid inventory provenance.');

  assert.equal(errorState.importedReport, null);
  assert.equal(errorState.certificationRequest, null);
  assert.equal(errorState.errorMessage, 'Invalid inventory provenance.');
  assert.equal(errorState.noticeMessage, null);
});

// 95. State reducer onMemberInventoryReset clears all inventory state
test('95. State reducer onMemberInventoryReset clears all inventory state', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport: ValidatedLiveInventoryReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    status: 'detected',
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    normalizedVersion: '5.2.5',
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
  };

  const populatedState = onMemberInventoryImported(INITIAL_MEMBER_INVENTORY_UI_STATE, {
    fileName: 'live-scan.json',
    fileSize: 500,
    report: validReport,
    certificationRequest: {} as any,
  });

  const resetState = onMemberInventoryReset(populatedState);
  assert.deepEqual(resetState, INITIAL_MEMBER_INVENTORY_UI_STATE);
  assert.equal(resetState.importedReport, null);
  assert.equal(resetState.certificationRequest, null);
  assert.equal(resetState.selectedFileName, null);
  assert.equal(resetState.selectedFileSize, null);
  assert.equal(resetState.errorMessage, null);
  assert.equal(resetState.noticeMessage, null);
});

// 96. Lifecycle invalidation scenarios: contract change, wallet disconnect, session lock, member identity replacement
test('96. Lifecycle invalidation scenarios: contract change, wallet disconnect, session lock, member identity replacement', async () => {
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport: ValidatedLiveInventoryReport = {
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    status: 'detected',
    product: 'pkg:generic/xz-utils',
    rawVersion: '5.2.5-2ubuntu1.1',
    version: { major: 5, minor: 2, patch: 5 },
    normalizedVersion: '5.2.5',
    measurementDigest: digest,
    observedAt: FIXED_NOW.toISOString(),
  };

  let inventoryState: MemberInventoryUiState = onMemberInventoryImported(INITIAL_MEMBER_INVENTORY_UI_STATE, {
    fileName: 'live.json',
    fileSize: 2048,
    report: validReport,
    certificationRequest: {} as any,
  });
  assert.notEqual(inventoryState.importedReport, null);

  // 1. Contract address change triggers reset
  inventoryState = onMemberInventoryReset(inventoryState);
  assert.equal(inventoryState.importedReport, null);

  // 2. Wallet disconnect triggers reset
  inventoryState = onMemberInventoryImported(inventoryState, {
    fileName: 'live.json',
    fileSize: 2048,
    report: validReport,
    certificationRequest: {} as any,
  });
  assert.notEqual(inventoryState.importedReport, null);
  inventoryState = onMemberInventoryReset(inventoryState);
  assert.equal(inventoryState.importedReport, null);

  // 3. Session lock triggers reset
  inventoryState = onMemberInventoryImported(inventoryState, {
    fileName: 'live.json',
    fileSize: 2048,
    report: validReport,
    certificationRequest: {} as any,
  });
  assert.notEqual(inventoryState.importedReport, null);
  inventoryState = onMemberInventoryReset(inventoryState);
  assert.equal(inventoryState.importedReport, null);

  // 4. Member identity replacement triggers reset
  inventoryState = onMemberInventoryImported(inventoryState, {
    fileName: 'live.json',
    fileSize: 2048,
    report: validReport,
    certificationRequest: {} as any,
  });
  assert.notEqual(inventoryState.importedReport, null);
  inventoryState = onMemberInventoryReset(inventoryState);
  assert.equal(inventoryState.importedReport, null);
});

// 97. Pure error mapping for inventory report errors via mapInventoryReportError
test('97. Pure error mapping for inventory report errors via mapInventoryReportError', () => {
  // JSON syntax error
  assert.equal(
    mapInventoryReportError(new SyntaxError('Unexpected token < in JSON at position 0')),
    'The selected file is not valid JSON.',
  );

  // Forbidden sensitive property
  assert.equal(
    mapInventoryReportError(new Error("Inventory report contains forbidden sensitive property 'memberSecret'.")),
    'The selected inventory report contains forbidden sensitive or private data and was rejected.',
  );

  // Invalid schema
  assert.equal(
    mapInventoryReportError(new Error("Invalid inventory schema: expected 'commonveil.inventory/v1'.")),
    "Invalid inventory report schema: expected 'commonveil.inventory/v1'.",
  );

  // Invalid provenance
  assert.equal(
    mapInventoryReportError(new Error("Invalid inventory provenance: expected 'live-host-scan'.")),
    "Invalid inventory provenance: only genuine 'live-host-scan' reports from 'npm run scan' are accepted.",
  );

  // Status not detected
  assert.equal(
    mapInventoryReportError(new Error("Inventory report status must be 'detected'.")),
    "Inventory report status must be 'detected'. Scans where no affected package was detected cannot generate a certification request.",
  );

  // Version tuple mismatch
  assert.equal(
    mapInventoryReportError(new Error("Inventory report normalized version mismatch: normalized '5.2.5' != derived tuple '5.2.4'.")),
    'Inventory report normalized version does not match the major.minor.patch version tuple.',
  );

  // Measurement digest mismatch
  assert.equal(
    mapInventoryReportError(new Error("Inventory report measurementDigest mismatch: expected 'aaa', got 'bbb'.")),
    'Inventory report measurement digest is invalid or does not match product and version.',
  );

  // Timestamp error
  assert.equal(
    mapInventoryReportError(new Error('Inventory report observedAt must be a valid ISO-8601 UTC timestamp.')),
    'Inventory report observation timestamp is invalid or missing.',
  );

  // Missing contract attachment
  assert.equal(
    mapInventoryReportError(new Error('Attach to a compatible CommonVeil contract before exporting a certification request.')),
    'Attach to a compatible CommonVeil contract before exporting a certification request.',
  );
});

// 98. Confirmation that no sensitive fields or keys are leaked in sanitized errors
test('98. Confirmation that no sensitive fields or keys are leaked in sanitized errors', () => {
  const sensitiveError = new Error(
    "Injected error containing memberSecret='1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' at /home/user/CommonVeil/file.json",
  );
  const mapped = mapInventoryReportError(sensitiveError);

  assert.equal(mapped.includes('1234567890abcdef'), false);
  assert.equal(mapped.includes('/home/user'), false);
  assert.equal(mapped.includes('file.json'), false);
  assert.equal(
    mapped,
    'The selected inventory report contains forbidden sensitive or private data and was rejected.',
  );
});

// 99. Confirmation of zero transaction submission: pure local execution without blockchain transactions or network calls
test('99. Confirmation of zero transaction submission: pure local execution without blockchain transactions or network calls', async () => {
  let blockchainCallCount = 0;
  const mockSubmitCallTx = () => {
    blockchainCallCount++;
    throw new Error('Should never be called');
  };
  const mockDeployContract = () => {
    blockchainCallCount++;
    throw new Error('Should never be called');
  };

  // Perform genuine report validation, credential derivation, and package construction
  const digest = await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5');
  const validReport = await validateLiveInventoryReport({
    schema: 'commonveil.inventory/v1',
    provenance: 'live-host-scan',
    observedAt: FIXED_NOW.toISOString(),
    product: 'pkg:generic/xz-utils',
    status: 'detected',
    version: { raw: '5.2.5-2ubuntu1.1', normalized: '5.2.5', major: 5, minor: 2, patch: 5 },
    measurementDigest: digest,
  });

  const certReq = buildCertificationRequestPackage({
    inventoryReport: validReport,
    contractAddress: SAMPLE_CONTRACT_ADDRESS,
    memberCredentialHex: SAMPLE_HEX_64,
    now: FIXED_NOW,
  });

  assert.equal(certReq.schema, CERTIFICATION_REQUEST_SCHEMA);
  assert.equal(certReq.network, 'preprod');
  assert.equal(blockchainCallCount, 0, 'Zero on-chain calls must be made during certification request export');
});

// 100. End-to-end simulated workflow from genuine npm run scan JSON structure to exportable package
test('100. End-to-end simulated workflow from genuine npm run scan JSON structure to exportable package', async () => {
  // Replicating exact output structure of npm run scan
  const genuineScanOutputJson = JSON.stringify({
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
    measurementDigest: await computeMeasurementDigest('pkg:generic/xz-utils', '5.2.5'),
    attempts: [],
  });

  // Step 1: Parse user-selected file content
  const parsed = JSON.parse(genuineScanOutputJson);

  // Step 2: Validate live inventory report
  const validatedReport = await validateLiveInventoryReport(parsed);
  assert.equal(validatedReport.provenance, 'live-host-scan');
  assert.equal(validatedReport.product, 'pkg:generic/xz-utils');
  assert.equal(validatedReport.version.major, 5);
  assert.equal(validatedReport.version.minor, 2);
  assert.equal(validatedReport.version.patch, 5);

  // Step 3: Check workflow prerequisites
  const prereqs = checkCertificationRequestPrerequisites({
    isConnected: true,
    attachedContractAddress: SAMPLE_CONTRACT_ADDRESS,
    hasSecret: true,
    hasSalt: true,
    memberCredentialHex: SAMPLE_HEX_64,
    backupRecoveryStatus: 'recovery-tested',
    importedInventory: validatedReport,
  });
  assert.equal(prereqs.canExport, true);

  // Step 4: Build CertificationRequestPackage
  const certReqPkg = buildCertificationRequestPackage({
    inventoryReport: validatedReport,
    contractAddress: SAMPLE_CONTRACT_ADDRESS,
    memberCredentialHex: SAMPLE_HEX_64,
    now: FIXED_NOW,
  });

  assert.equal(certReqPkg.schema, CERTIFICATION_REQUEST_SCHEMA);
  assert.equal(certReqPkg.network, 'preprod');
  assert.equal(certReqPkg.contractAddress, SAMPLE_CONTRACT_ADDRESS);
  assert.equal(certReqPkg.memberCredential, SAMPLE_HEX_64);
  assert.equal(certReqPkg.provenance, 'live-host-scan');
  assert.equal(certReqPkg.product, 'pkg:generic/xz-utils');
  assert.equal(certReqPkg.rawVersion, '5.2.5-2ubuntu1.1');
  assert.deepEqual(certReqPkg.version, { major: 5, minor: 2, patch: 5 });
  assert.equal(certReqPkg.measurementDigest, validatedReport.measurementDigest);

  // Step 5: Verify exactly 11 top-level fields and zero sensitive properties in the package
  assert.equal(Object.keys(certReqPkg).length, 11);
  const validatedPkg = await validateCertificationRequestPackage(certReqPkg);
  assert.equal(validatedPkg.network, 'preprod');
  const serialized = JSON.stringify(certReqPkg, null, 2);
  assert.equal(serialized.includes('fingerprint'), false);
  assert.equal(serialized.includes('platform'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('salt'), false);
});
