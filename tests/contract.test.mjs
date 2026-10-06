import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConstructorContext, createCircuitContext } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../contracts/managed/commonveil/contract/index.js';

// Actual generated Compact execution, not a mocked contract or network proof.
test('private commitment increments once and rejects replay', () => {
  const contract = new Contract({});
  const key = '00'.repeat(32);
  const initial = contract.initialState(createConstructorContext({}, key));
  const context = createCircuitContext(key, key, initial.currentContractState, initial.currentPrivateState);
  const secret = new Uint8Array(32).fill(7);
  const salt = new Uint8Array(32).fill(9);
  const first = contract.impureCircuits.attest(context, secret, salt);
  assert.equal(ledger(first.context.currentQueryContext.state).accepted, 1n);
  assert.throws(() => contract.impureCircuits.attest(first.context, secret, salt), /Duplicate commitment/);
});
