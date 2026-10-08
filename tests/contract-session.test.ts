import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConstructorContext, createCircuitContext } from '@midnight-ntwrk/compact-runtime';
import { Contract, pureCircuits } from '../contracts/managed/commonveil/contract/index.js';
import {
  queryCommonVeilContract,
  attachCommonVeilContract,
  verifyRegistrarSecret,
  verifyCertifierSecret,
  verifyMemberCredential,
  ContractSessionError,
} from '../src/contract-session.ts';

// Test double for public and private data providers
function createTestDoubleProviders(stateData: any = null) {
  let boundContractAddress: string | null = null;
  let submitTxCallCount = 0;

  return {
    publicDataProvider: {
      queryContractState: async (address: string) => {
        if (!stateData) return null;
        return { data: stateData };
      },
    },
    privateStateProvider: {
      setContractAddress: (address: string) => {
        boundContractAddress = address;
      },
      getContractAddress: () => boundContractAddress,
    },
    midnightProvider: {
      submitTx: async () => {
        submitTxCallCount++;
        return 'mock-tx-id';
      },
    },
    getBoundAddress: () => boundContractAddress,
    getSubmitTxCount: () => submitTxCallCount,
  };
}

// Generate valid Compact ledger state using the generated contract
function generateValidContractState() {
  const contract = new Contract({});
  const key = '00'.repeat(32);
  const adminSecret = new Uint8Array(32).fill(1);
  const certifierSecret = new Uint8Array(32).fill(12);
  const memberSecret = new Uint8Array(32).fill(3);
  const memberSalt = new Uint8Array(32).fill(4);

  const adminKey = pureCircuits.deriveAdminKey(adminSecret);
  const certifierKey = pureCircuits.deriveCertifierKey(certifierSecret);
  const memberCredential = pureCircuits.deriveMemberCredential(memberSecret, memberSalt);

  // Initialize state
  const initial = contract.initialState(createConstructorContext({}, key), adminKey, certifierKey);
  const context = createCircuitContext(key, key, initial.currentContractState, initial.currentPrivateState);

  // Admit member
  const admitted = contract.impureCircuits.registerMember(context, adminSecret, memberCredential);

  return {
    adminSecret,
    certifierSecret,
    memberSecret,
    memberSalt,
    adminKey,
    certifierKey,
    memberCredential,
    stateData: admitted.context.currentQueryContext.state,
  };
}

const SAMPLE_ADDRESS = '0200abcd1234ef567890abcdef1234567890abcdef1234567890abcdef123456';

// 1. Compatible CommonVeil state decodes successfully
test('1. Compatible CommonVeil state decodes successfully', async () => {
  const { stateData, adminKey, certifierKey } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(session.publicState.contractAddress, SAMPLE_ADDRESS);
  assert.equal(typeof session.publicState.registrarKey, 'string');
  assert.equal(session.publicState.registrarKey.length, 64);
  assert.equal(typeof session.publicState.certifierKey, 'string');
  assert.equal(session.publicState.certifierKey.length, 64);
});

// 2. Public counts and policyActive are reported correctly
test('2. Public counts and policyActive are reported correctly', async () => {
  const { stateData } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(session.publicState.policyActive, false);
  assert.equal(session.publicState.members, 1n);
  assert.equal(session.publicState.inventoryCommitments, 0n);
  assert.equal(session.publicState.affectedReleases, 0n);
  assert.equal(session.publicState.usedNullifiers, 0n);
  assert.equal(session.publicState.accepted, 0n);
});

// 3. Null state returns CONTRACT_NOT_FOUND
test('3. Null state returns CONTRACT_NOT_FOUND', async () => {
  const providers = createTestDoubleProviders(null);

  await assert.rejects(
    () => queryCommonVeilContract(providers, SAMPLE_ADDRESS),
    (err: any) => err instanceof ContractSessionError && err.code === 'CONTRACT_NOT_FOUND',
  );
});

// 4. Incompatible/corrupted state returns INCOMPATIBLE_CONTRACT
test('4. Incompatible/corrupted state returns INCOMPATIBLE_CONTRACT', async () => {
  const corruptedState = { someRandomField: 12345 };
  const providers = createTestDoubleProviders(corruptedState);

  await assert.rejects(
    () => queryCommonVeilContract(providers, SAMPLE_ADDRESS),
    (err: any) => err instanceof ContractSessionError && err.code === 'INCOMPATIBLE_CONTRACT',
  );
});

// 5. Invalid blank address returns INVALID_CONTRACT_ADDRESS
test('5. Invalid blank address returns INVALID_CONTRACT_ADDRESS', async () => {
  const providers = createTestDoubleProviders(null);

  await assert.rejects(
    () => queryCommonVeilContract(providers, '   '),
    (err: any) => err instanceof ContractSessionError && err.code === 'INVALID_CONTRACT_ADDRESS',
  );
});

// 6. Successful attachment sets the private-state provider address exactly once
test('6. Successful attachment sets the private-state provider address exactly once', async () => {
  const { stateData } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  assert.equal(providers.getBoundAddress(), null);
  const session = await attachCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(providers.getBoundAddress(), SAMPLE_ADDRESS);
  assert.equal(session.publicState.contractAddress, SAMPLE_ADDRESS);
});

// 7. Failed attachment never sets the private-state provider address
test('7. Failed attachment never sets the private-state provider address', async () => {
  const providers = createTestDoubleProviders(null);

  await assert.rejects(
    () => attachCommonVeilContract(providers, SAMPLE_ADDRESS),
    (err: any) => err instanceof ContractSessionError && err.code === 'CONTRACT_NOT_FOUND',
  );
  assert.equal(providers.getBoundAddress(), null);
});

// 8. Correct registrar secret verifies true
test('8. Correct registrar secret verifies true', async () => {
  const { stateData, adminSecret } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(verifyRegistrarSecret(session.publicState, adminSecret), true);
});

// 9. Wrong registrar secret verifies false
test('9. Wrong registrar secret verifies false', async () => {
  const { stateData } = generateValidContractState();
  const wrongAdminSecret = new Uint8Array(32).fill(99);
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(verifyRegistrarSecret(session.publicState, wrongAdminSecret), false);
});

// 10. Correct certifier secret verifies true
test('10. Correct certifier secret verifies true', async () => {
  const { stateData, certifierSecret } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(verifyCertifierSecret(session.publicState, certifierSecret), true);
});

// 11. Wrong certifier secret verifies false
test('11. Wrong certifier secret verifies false', async () => {
  const { stateData } = generateValidContractState();
  const wrongCertifierSecret = new Uint8Array(32).fill(99);
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(verifyCertifierSecret(session.publicState, wrongCertifierSecret), false);
});

// 12. Admitted member secret/salt verifies true
test('12. Admitted member secret/salt verifies true', async () => {
  const { stateData, memberSecret, memberSalt } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(verifyMemberCredential(session, memberSecret, memberSalt), true);
});

// 13. Non-admitted member verifies false
test('13. Non-admitted member verifies false', async () => {
  const { stateData } = generateValidContractState();
  const outsiderSecret = new Uint8Array(32).fill(77);
  const outsiderSalt = new Uint8Array(32).fill(88);
  const providers = createTestDoubleProviders(stateData);

  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(verifyMemberCredential(session, outsiderSecret, outsiderSalt), false);
});

// 14. 31-byte and 33-byte secrets return INVALID_SECRET_LENGTH
test('14. 31-byte and 33-byte secrets return INVALID_SECRET_LENGTH', async () => {
  const { stateData } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);
  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);

  const shortSecret = new Uint8Array(31);
  const longSecret = new Uint8Array(33);

  assert.throws(
    () => verifyRegistrarSecret(session.publicState, shortSecret),
    (err: any) => err instanceof ContractSessionError && err.code === 'INVALID_SECRET_LENGTH',
  );
  assert.throws(
    () => verifyCertifierSecret(session.publicState, longSecret),
    (err: any) => err instanceof ContractSessionError && err.code === 'INVALID_SECRET_LENGTH',
  );
  assert.throws(
    () => verifyMemberCredential(session, shortSecret, new Uint8Array(32)),
    (err: any) => err instanceof ContractSessionError && err.code === 'INVALID_SECRET_LENGTH',
  );
});

// 15. Verification does not mutate the caller’s Uint8Array
test('15. Verification does not mutate the caller’s Uint8Array', async () => {
  const { stateData, adminSecret } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);
  const session = await queryCommonVeilContract(providers, SAMPLE_ADDRESS);

  const secretCopy = new Uint8Array(adminSecret);
  verifyRegistrarSecret(session.publicState, adminSecret);
  assert.deepEqual(adminSecret, secretCopy, 'Secret bytes must remain intact and unchanged');
});

// 16. Attachment performs zero submitTx calls
test('16. Attachment performs zero submitTx calls', async () => {
  const { stateData } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  await attachCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(providers.getSubmitTxCount(), 0, 'Attachment must not submit any transactions');
});

// 17. Query-only inspection does not set the private-state provider address
test('17. Query-only inspection does not set the private-state provider address', async () => {
  const { stateData } = generateValidContractState();
  const providers = createTestDoubleProviders(stateData);

  await queryCommonVeilContract(providers, SAMPLE_ADDRESS);
  assert.equal(providers.getBoundAddress(), null, 'Read-only query must not set private-state provider address');
});
