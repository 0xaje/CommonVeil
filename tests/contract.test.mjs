import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConstructorContext, createCircuitContext } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../contracts/managed/commonveil/contract/index.js';

// Actual generated Compact execution, not a mocked contract or network proof.
test('member proves an authorized pre-policy certified snapshot is affected', () => {
  const contract = new Contract({});
  const key = '00'.repeat(32);
  const adminSecret = new Uint8Array(32).fill(1);
  const wrongAdminSecret = new Uint8Array(32).fill(2);
  const certifierSecret = new Uint8Array(32).fill(12);
  const wrongCertifierSecret = new Uint8Array(32).fill(13);
  const memberSecret = new Uint8Array(32).fill(3);
  const memberSalt = new Uint8Array(32).fill(4);
  const outsiderSecret = new Uint8Array(32).fill(5);
  const advisoryA = new Uint8Array(32).fill(6);
  const advisoryB = new Uint8Array(32).fill(7);
  const xz = new Uint8Array(32).fill(8);
  const snapshotSalt = new Uint8Array(32).fill(10);
  const otherSnapshotSalt = new Uint8Array(32).fill(11);
  const adminKey = pureCircuits.deriveAdminKey(adminSecret);
  const certifierKey = pureCircuits.deriveCertifierKey(certifierSecret);
  const credential = pureCircuits.deriveMemberCredential(memberSecret, memberSalt);
  const outsiderCredential = pureCircuits.deriveMemberCredential(outsiderSecret, memberSalt);
  const initial = contract.initialState(createConstructorContext({}, key), adminKey, certifierKey);
  const context = createCircuitContext(key, key, initial.currentContractState, initial.currentPrivateState);

  assert.throws(
    () => contract.impureCircuits.registerMember(context, wrongAdminSecret, credential),
    /Only the registrar can admit members/,
  );

  const admitted = contract.impureCircuits.registerMember(context, adminSecret, credential);
  assert.equal(ledger(admitted.context.currentQueryContext.state).memberCredentials.size(), 1n);
  assert.throws(
    () => contract.impureCircuits.certifyInventory(admitted.context, wrongCertifierSecret, credential, xz, 5n, 6n, 1n, snapshotSalt),
    /Only the authorized certifier can commit inventory/,
  );
  assert.throws(
    () => contract.impureCircuits.certifyInventory(admitted.context, certifierSecret, outsiderCredential, xz, 5n, 6n, 1n, snapshotSalt),
    /Member credential not admitted/,
  );

  const committedAffected = contract.impureCircuits.certifyInventory(
    admitted.context, certifierSecret, credential, xz, 5n, 6n, 1n, snapshotSalt,
  );
  const committedSafe = contract.impureCircuits.certifyInventory(
    committedAffected.context, certifierSecret, credential, xz, 5n, 5n, 9n, snapshotSalt,
  );
  assert.equal(ledger(committedSafe.context.currentQueryContext.state).inventoryCommitments.size(), 2n);

  assert.throws(
    () => contract.impureCircuits.registerAffectedRelease(committedSafe.context, wrongAdminSecret, advisoryA, xz, 5n, 6n, 0n),
    /Only the registrar can register affected releases/,
  );
  const registeredA0 = contract.impureCircuits.registerAffectedRelease(committedSafe.context, adminSecret, advisoryA, xz, 5n, 6n, 0n);
  const registeredA = contract.impureCircuits.registerAffectedRelease(registeredA0.context, adminSecret, advisoryA, xz, 5n, 6n, 1n);
  assert.throws(
    () => contract.impureCircuits.certifyInventory(registeredA.context, certifierSecret, credential, xz, 5n, 6n, 0n, snapshotSalt),
    /Inventory certification window is closed/,
  );
  assert.throws(
    () => contract.impureCircuits.attest(registeredA.context, advisoryA, memberSecret, memberSalt, xz, 5n, 6n, 1n, otherSnapshotSalt),
    /Inventory snapshot was not committed before policy activation/,
  );
  assert.throws(
    () => contract.impureCircuits.attest(registeredA.context, advisoryA, memberSecret, memberSalt, xz, 5n, 5n, 9n, snapshotSalt),
    /Product version is not an affected release/,
  );

  const first = contract.impureCircuits.attest(registeredA.context, advisoryA, memberSecret, memberSalt, xz, 5n, 6n, 1n, snapshotSalt);
  assert.equal(ledger(first.context.currentQueryContext.state).accepted, 1n);
  assert.equal(ledger(first.context.currentQueryContext.state).usedNullifiers.size(), 1n);
  assert.throws(
    () => contract.impureCircuits.attest(first.context, advisoryA, memberSecret, memberSalt, xz, 5n, 6n, 1n, snapshotSalt),
    /Member already attested for this advisory/,
  );

  const registeredB = contract.impureCircuits.registerAffectedRelease(first.context, adminSecret, advisoryB, xz, 5n, 6n, 1n);
  const second = contract.impureCircuits.attest(registeredB.context, advisoryB, memberSecret, memberSalt, xz, 5n, 6n, 1n, snapshotSalt);
  assert.equal(ledger(second.context.currentQueryContext.state).accepted, 2n);
  assert.equal(ledger(second.context.currentQueryContext.state).usedNullifiers.size(), 2n);
});
