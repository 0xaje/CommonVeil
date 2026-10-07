import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as CommonVeil from '../contracts/managed/commonveil/contract/index.js';

export const CompiledCommonVeilContract = CompiledContract.make(
  'commonveil',
  CommonVeil.Contract,
).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets('./contracts/managed/commonveil'),
);

export { CommonVeil };
