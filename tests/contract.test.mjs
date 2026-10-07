import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConstructorContext, createCircuitContext } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../contracts/managed/commonveil/contract/index.js';

// Actual generated Compact execution, not a mocked contract or network proof.
test('admitted member can prove an exact affected release once per advisory', () => {
  const contract = new Contract({});
  const key = '00'.repeat(32);
  const adminSecret = new Uint8Array(32).fill(1);
  const wrongAdminSecret = new Uint8Array(32).fill(2);
  const memberSecret = new Uint8Array(32).fill(3);
  const memberSalt = new Uint8Array(32).fill(4);
  const outsiderSecret = new Uint8Array(32).fill(5);
  const advisoryA = new Uint8Array(32).fill(6);
  const advisoryB = new Uint8Array(32).fill(7);
  const xz = new Uint8Array(32).fill(8);
  const otherProduct = new Uint8Array(32).fill(9);
  const adminKey = pureCircuits.deriveAdminKey(adminSecret);
  const credential = pureCircuits.deriveMemberCredential(memberSecret, memberSalt);
  const initial = contract.initialState(createConstructorContext({}, key), adminKey);
  const context = createCircuitContext(key, key, initial.currentContractState, initial.currentPrivateState);

  assert.throws(
    () => contract.impureCircuits.registerMember(context, wrongAdminSecret, credential),
    /Only the registrar can admit members/,
  );

  const admitted = contract.impureCircuits.registerMember(context, adminSecret, credential);
  assert.equal(ledger(admitted.context.currentQueryContext.state).memberCredentials.size(), 1n);
  assert.throws(
    () => contract.impureCircuits.attest(admitted.context, advisoryA, memberSecret, memberSalt, xz, 5n, 6n, 0n),
    /Product version is not an affected release/,
  );

  assert.throws(
    () => contract.impureCircuits.registerAffectedRelease(admitted.context, wrongAdminSecret, advisoryA, xz, 5n, 6n, 0n),
    /Only the registrar can register affected releases/,
  );
  const registeredA0 = contract.impureCircuits.registerAffectedRelease(admitted.context, adminSecret, advisoryA, xz, 5n, 6n, 0n);
  const registeredA = contract.impureCircuits.registerAffectedRelease(registeredA0.context, adminSecret, advisoryA, xz, 5n, 6n, 1n);
  assert.throws(
    () => contract.impureCircuits.attest(registeredA.context, advisoryA, outsiderSecret, memberSalt, xz, 5n, 6n, 0n),
    /Member credential not admitted/,
  );
  assert.throws(
    () => contract.impureCircuits.attest(registeredA.context, advisoryA, memberSecret, memberSalt, otherProduct, 5n, 6n, 0n),
    /Product version is not an affected release/,
  );
  assert.throws(
    () => contract.impureCircuits.attest(registeredA.context, advisoryA, memberSecret, memberSalt, xz, 5n, 5n, 9n),
    /Product version is not an affected release/,
  );

  const first = contract.impureCircuits.attest(registeredA.context, advisoryA, memberSecret, memberSalt, xz, 5n, 6n, 1n);
  assert.equal(ledger(first.context.currentQueryContext.state).accepted, 1n);
  assert.equal(ledger(first.context.currentQueryContext.state).usedNullifiers.size(), 1n);
  assert.throws(
    () => contract.impureCircuits.attest(first.context, advisoryA, memberSecret, memberSalt, xz, 5n, 6n, 0n),
    /Member already attested for this advisory/,
  );

  const registeredB = contract.impureCircuits.registerAffectedRelease(first.context, adminSecret, advisoryB, xz, 5n, 6n, 0n);
  const second = contract.impureCircuits.attest(registeredB.context, advisoryB, memberSecret, memberSalt, xz, 5n, 6n, 0n);
  assert.equal(ledger(second.context.currentQueryContext.state).accepted, 2n);
  assert.equal(ledger(second.context.currentQueryContext.state).usedNullifiers.size(), 2n);
});
