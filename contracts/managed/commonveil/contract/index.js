import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = __compactRuntime.CompactTypeBoolean;

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(23);

class _tuple_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_3.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_0.toValue(value_0[2])));
  }
}

const _descriptor_4 = new _tuple_0();

const _descriptor_5 = new __compactRuntime.CompactTypeBytes(21);

class _tuple_1 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment())))));
  }
  fromValue(value_0) {
    return [
      _descriptor_5.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_0.toValue(value_0[2]).concat(_descriptor_2.toValue(value_0[3]).concat(_descriptor_2.toValue(value_0[4]).concat(_descriptor_2.toValue(value_0[5]))))));
  }
}

const _descriptor_6 = new _tuple_1();

class _tuple_2 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_3.fromValue(value_0),
      _descriptor_0.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]));
  }
}

const _descriptor_7 = new _tuple_2();

const _descriptor_8 = new __compactRuntime.CompactTypeBytes(20);

class _tuple_3 {
  alignment() {
    return _descriptor_8.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_8.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_8.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_0.toValue(value_0[2])));
  }
}

const _descriptor_9 = new _tuple_3();

class _tuple_4 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_3.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_0.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_0.toValue(value_0[2]).concat(_descriptor_2.toValue(value_0[3]).concat(_descriptor_2.toValue(value_0[4]).concat(_descriptor_2.toValue(value_0[5]).concat(_descriptor_0.toValue(value_0[6])))))));
  }
}

const _descriptor_10 = new _tuple_4();

const _descriptor_11 = new __compactRuntime.CompactTypeBytes(19);

class _tuple_5 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_11.fromValue(value_0),
      _descriptor_0.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]));
  }
}

const _descriptor_12 = new _tuple_5();

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_14 = new _Either_0();

const _descriptor_15 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_16 = new _ContractAddress_0();

const _descriptor_17 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      deriveInventoryCommitment(context, ...args_1) {
        return { result: pureCircuits.deriveInventoryCommitment(...args_1), context };
      },
      deriveAdminKey(context, ...args_1) {
        return { result: pureCircuits.deriveAdminKey(...args_1), context };
      },
      deriveCertifierKey(context, ...args_1) {
        return { result: pureCircuits.deriveCertifierKey(...args_1), context };
      },
      deriveMemberCredential(context, ...args_1) {
        return { result: pureCircuits.deriveMemberCredential(...args_1), context };
      },
      deriveNullifier(context, ...args_1) {
        return { result: pureCircuits.deriveNullifier(...args_1), context };
      },
      deriveReleaseId(context, ...args_1) {
        return { result: pureCircuits.deriveReleaseId(...args_1), context };
      },
      registerMember: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`registerMember: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const adminSecret_0 = args_1[1];
        const credential_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerMember',
                                     'argument 1 (as invoked from Typescript)',
                                     'commonveil.compact line 109 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(adminSecret_0.buffer instanceof ArrayBuffer && adminSecret_0.BYTES_PER_ELEMENT === 1 && adminSecret_0.length === 32)) {
          __compactRuntime.typeError('registerMember',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'commonveil.compact line 109 char 1',
                                     'Bytes<32>',
                                     adminSecret_0)
        }
        if (!(credential_0.buffer instanceof ArrayBuffer && credential_0.BYTES_PER_ELEMENT === 1 && credential_0.length === 32)) {
          __compactRuntime.typeError('registerMember',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'commonveil.compact line 109 char 1',
                                     'Bytes<32>',
                                     credential_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(adminSecret_0).concat(_descriptor_0.toValue(credential_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._registerMember_0(context,
                                                partialProofData,
                                                adminSecret_0,
                                                credential_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      certifyInventory: (...args_1) => {
        if (args_1.length !== 8) {
          throw new __compactRuntime.CompactError(`certifyInventory: expected 8 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const certifierSecret_0 = args_1[1];
        const credential_0 = args_1[2];
        const productId_0 = args_1[3];
        const major_0 = args_1[4];
        const minor_0 = args_1[5];
        const patch_0 = args_1[6];
        const snapshotSalt_0 = args_1[7];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 1 (as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(certifierSecret_0.buffer instanceof ArrayBuffer && certifierSecret_0.BYTES_PER_ELEMENT === 1 && certifierSecret_0.length === 32)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Bytes<32>',
                                     certifierSecret_0)
        }
        if (!(credential_0.buffer instanceof ArrayBuffer && credential_0.BYTES_PER_ELEMENT === 1 && credential_0.length === 32)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Bytes<32>',
                                     credential_0)
        }
        if (!(productId_0.buffer instanceof ArrayBuffer && productId_0.BYTES_PER_ELEMENT === 1 && productId_0.length === 32)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Bytes<32>',
                                     productId_0)
        }
        if (!(typeof(major_0) === 'bigint' && major_0 >= 0n && major_0 <= 65535n)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Uint<0..65536>',
                                     major_0)
        }
        if (!(typeof(minor_0) === 'bigint' && minor_0 >= 0n && minor_0 <= 65535n)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Uint<0..65536>',
                                     minor_0)
        }
        if (!(typeof(patch_0) === 'bigint' && patch_0 >= 0n && patch_0 <= 65535n)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Uint<0..65536>',
                                     patch_0)
        }
        if (!(snapshotSalt_0.buffer instanceof ArrayBuffer && snapshotSalt_0.BYTES_PER_ELEMENT === 1 && snapshotSalt_0.length === 32)) {
          __compactRuntime.typeError('certifyInventory',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'commonveil.compact line 118 char 1',
                                     'Bytes<32>',
                                     snapshotSalt_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(certifierSecret_0).concat(_descriptor_0.toValue(credential_0).concat(_descriptor_0.toValue(productId_0).concat(_descriptor_2.toValue(major_0).concat(_descriptor_2.toValue(minor_0).concat(_descriptor_2.toValue(patch_0).concat(_descriptor_0.toValue(snapshotSalt_0))))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._certifyInventory_0(context,
                                                  partialProofData,
                                                  certifierSecret_0,
                                                  credential_0,
                                                  productId_0,
                                                  major_0,
                                                  minor_0,
                                                  patch_0,
                                                  snapshotSalt_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      registerAffectedRelease: (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`registerAffectedRelease: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const adminSecret_0 = args_1[1];
        const advisoryId_0 = args_1[2];
        const productId_0 = args_1[3];
        const major_0 = args_1[4];
        const minor_0 = args_1[5];
        const patch_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 1 (as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(adminSecret_0.buffer instanceof ArrayBuffer && adminSecret_0.BYTES_PER_ELEMENT === 1 && adminSecret_0.length === 32)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'Bytes<32>',
                                     adminSecret_0)
        }
        if (!(advisoryId_0.buffer instanceof ArrayBuffer && advisoryId_0.BYTES_PER_ELEMENT === 1 && advisoryId_0.length === 32)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'Bytes<32>',
                                     advisoryId_0)
        }
        if (!(productId_0.buffer instanceof ArrayBuffer && productId_0.BYTES_PER_ELEMENT === 1 && productId_0.length === 32)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'Bytes<32>',
                                     productId_0)
        }
        if (!(typeof(major_0) === 'bigint' && major_0 >= 0n && major_0 <= 65535n)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'Uint<0..65536>',
                                     major_0)
        }
        if (!(typeof(minor_0) === 'bigint' && minor_0 >= 0n && minor_0 <= 65535n)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'Uint<0..65536>',
                                     minor_0)
        }
        if (!(typeof(patch_0) === 'bigint' && patch_0 >= 0n && patch_0 <= 65535n)) {
          __compactRuntime.typeError('registerAffectedRelease',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'commonveil.compact line 137 char 1',
                                     'Uint<0..65536>',
                                     patch_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(adminSecret_0).concat(_descriptor_0.toValue(advisoryId_0).concat(_descriptor_0.toValue(productId_0).concat(_descriptor_2.toValue(major_0).concat(_descriptor_2.toValue(minor_0).concat(_descriptor_2.toValue(patch_0)))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._registerAffectedRelease_0(context,
                                                         partialProofData,
                                                         adminSecret_0,
                                                         advisoryId_0,
                                                         productId_0,
                                                         major_0,
                                                         minor_0,
                                                         patch_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      attest: (...args_1) => {
        if (args_1.length !== 9) {
          throw new __compactRuntime.CompactError(`attest: expected 9 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const advisoryId_0 = args_1[1];
        const memberSecret_0 = args_1[2];
        const memberSalt_0 = args_1[3];
        const productId_0 = args_1[4];
        const major_0 = args_1[5];
        const minor_0 = args_1[6];
        const patch_0 = args_1[7];
        const snapshotSalt_0 = args_1[8];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('attest',
                                     'argument 1 (as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(advisoryId_0.buffer instanceof ArrayBuffer && advisoryId_0.BYTES_PER_ELEMENT === 1 && advisoryId_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Bytes<32>',
                                     advisoryId_0)
        }
        if (!(memberSecret_0.buffer instanceof ArrayBuffer && memberSecret_0.BYTES_PER_ELEMENT === 1 && memberSecret_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Bytes<32>',
                                     memberSecret_0)
        }
        if (!(memberSalt_0.buffer instanceof ArrayBuffer && memberSalt_0.BYTES_PER_ELEMENT === 1 && memberSalt_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Bytes<32>',
                                     memberSalt_0)
        }
        if (!(productId_0.buffer instanceof ArrayBuffer && productId_0.BYTES_PER_ELEMENT === 1 && productId_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Bytes<32>',
                                     productId_0)
        }
        if (!(typeof(major_0) === 'bigint' && major_0 >= 0n && major_0 <= 65535n)) {
          __compactRuntime.typeError('attest',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Uint<0..65536>',
                                     major_0)
        }
        if (!(typeof(minor_0) === 'bigint' && minor_0 >= 0n && minor_0 <= 65535n)) {
          __compactRuntime.typeError('attest',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Uint<0..65536>',
                                     minor_0)
        }
        if (!(typeof(patch_0) === 'bigint' && patch_0 >= 0n && patch_0 <= 65535n)) {
          __compactRuntime.typeError('attest',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Uint<0..65536>',
                                     patch_0)
        }
        if (!(snapshotSalt_0.buffer instanceof ArrayBuffer && snapshotSalt_0.BYTES_PER_ELEMENT === 1 && snapshotSalt_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'commonveil.compact line 152 char 1',
                                     'Bytes<32>',
                                     snapshotSalt_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(advisoryId_0).concat(_descriptor_0.toValue(memberSecret_0).concat(_descriptor_0.toValue(memberSalt_0).concat(_descriptor_0.toValue(productId_0).concat(_descriptor_2.toValue(major_0).concat(_descriptor_2.toValue(minor_0).concat(_descriptor_2.toValue(patch_0).concat(_descriptor_0.toValue(snapshotSalt_0)))))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment())))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._attest_0(context,
                                        partialProofData,
                                        advisoryId_0,
                                        memberSecret_0,
                                        memberSalt_0,
                                        productId_0,
                                        major_0,
                                        minor_0,
                                        patch_0,
                                        snapshotSalt_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      registerMember: this.circuits.registerMember,
      certifyInventory: this.circuits.certifyInventory,
      registerAffectedRelease: this.circuits.registerAffectedRelease,
      attest: this.circuits.attest
    };
    this.provableCircuits = {
      registerMember: this.circuits.registerMember,
      certifyInventory: this.circuits.certifyInventory,
      registerAffectedRelease: this.circuits.registerAffectedRelease,
      attest: this.circuits.attest
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const adminKey_0 = args_0[1];
    const certifierKey_0 = args_0[2];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(adminKey_0.buffer instanceof ArrayBuffer && adminKey_0.BYTES_PER_ELEMENT === 1 && adminKey_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'commonveil.compact line 25 char 1',
                                 'Bytes<32>',
                                 adminKey_0)
    }
    if (!(certifierKey_0.buffer instanceof ArrayBuffer && certifierKey_0.BYTES_PER_ELEMENT === 1 && certifierKey_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'commonveil.compact line 25 char 1',
                                 'Bytes<32>',
                                 certifierKey_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('registerMember', new __compactRuntime.ContractOperation());
    state_0.setOperation('certifyInventory', new __compactRuntime.ContractOperation());
    state_0.setOperation('registerAffectedRelease', new __compactRuntime.ContractOperation());
    state_0.setOperation('attest', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(2n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(3n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(4n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(5n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(false),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(6n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(7n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(adminKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(certifierKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(5n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(false),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_10, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_7, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_4, value_0);
    return result_0;
  }
  _persistentHash_5(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_6, value_0);
    return result_0;
  }
  _deriveInventoryCommitment_0(credential_0,
                               productId_0,
                               major_0,
                               minor_0,
                               patch_0,
                               snapshotSalt_0)
  {
    return this._persistentHash_0([new Uint8Array([99, 111, 109, 109, 111, 110, 118, 101, 105, 108, 58, 105, 110, 118, 101, 110, 116, 111, 114, 121, 58, 118, 49]),
                                   credential_0,
                                   productId_0,
                                   major_0,
                                   minor_0,
                                   patch_0,
                                   snapshotSalt_0]);
  }
  _deriveAdminKey_0(adminSecret_0) {
    return this._persistentHash_1([new Uint8Array([99, 111, 109, 109, 111, 110, 118, 101, 105, 108, 58, 97, 100, 109, 105, 110, 58, 118, 49]),
                                   adminSecret_0]);
  }
  _deriveCertifierKey_0(certifierSecret_0) {
    return this._persistentHash_2([new Uint8Array([99, 111, 109, 109, 111, 110, 118, 101, 105, 108, 58, 99, 101, 114, 116, 105, 102, 105, 101, 114, 58, 118, 49]),
                                   certifierSecret_0]);
  }
  _deriveMemberCredential_0(memberSecret_0, memberSalt_0) {
    return this._persistentHash_3([new Uint8Array([99, 111, 109, 109, 111, 110, 118, 101, 105, 108, 58, 109, 101, 109, 98, 101, 114, 58, 118, 49]),
                                   memberSecret_0,
                                   memberSalt_0]);
  }
  _deriveNullifier_0(advisoryId_0, memberSecret_0) {
    return this._persistentHash_4([new Uint8Array([99, 111, 109, 109, 111, 110, 118, 101, 105, 108, 58, 110, 117, 108, 108, 105, 102, 105, 101, 114, 58, 118, 49]),
                                   advisoryId_0,
                                   memberSecret_0]);
  }
  _deriveReleaseId_0(advisoryId_0, productId_0, major_0, minor_0, patch_0) {
    return this._persistentHash_5([new Uint8Array([99, 111, 109, 109, 111, 110, 118, 101, 105, 108, 58, 114, 101, 108, 101, 97, 115, 101, 58, 118, 49]),
                                   advisoryId_0,
                                   productId_0,
                                   major_0,
                                   minor_0,
                                   patch_0]);
  }
  _registerMember_0(context, partialProofData, adminSecret_0, credential_0) {
    __compactRuntime.assert(this._equal_0(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_17.toValue(0n),
                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          this._deriveAdminKey_0(adminSecret_0)),
                            'Only the registrar can admit members');
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(2n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credential_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Member credential already admitted');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(2n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credential_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _certifyInventory_0(context,
                      partialProofData,
                      certifierSecret_0,
                      credential_0,
                      productId_0,
                      major_0,
                      minor_0,
                      patch_0,
                      snapshotSalt_0)
  {
    __compactRuntime.assert(this._equal_1(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_17.toValue(1n),
                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          this._deriveCertifierKey_0(certifierSecret_0)),
                            'Only the authorized certifier can commit inventory');
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(5n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'Inventory certification window is closed');
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_17.toValue(2n),
                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credential_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Member credential not admitted');
    const commitment_0 = this._deriveInventoryCommitment_0(credential_0,
                                                           productId_0,
                                                           major_0,
                                                           minor_0,
                                                           patch_0,
                                                           snapshotSalt_0);
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(4n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(commitment_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Inventory snapshot already committed');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(4n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(commitment_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _registerAffectedRelease_0(context,
                             partialProofData,
                             adminSecret_0,
                             advisoryId_0,
                             productId_0,
                             major_0,
                             minor_0,
                             patch_0)
  {
    __compactRuntime.assert(this._equal_2(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_17.toValue(0n),
                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          this._deriveAdminKey_0(adminSecret_0)),
                            'Only the registrar can register affected releases');
    const releaseId_0 = this._deriveReleaseId_0(advisoryId_0,
                                                productId_0,
                                                major_0,
                                                minor_0,
                                                patch_0);
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(3n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(releaseId_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Affected release already registered');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(3n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(releaseId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(5n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(true),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _attest_0(context,
            partialProofData,
            advisoryId_0,
            memberSecret_0,
            memberSalt_0,
            productId_0,
            major_0,
            minor_0,
            patch_0,
            snapshotSalt_0)
  {
    const credential_0 = this._deriveMemberCredential_0(memberSecret_0,
                                                        memberSalt_0);
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_17.toValue(2n),
                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credential_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Member credential not admitted');
    const inventoryCommitment_0 = this._deriveInventoryCommitment_0(credential_0,
                                                                    productId_0,
                                                                    major_0,
                                                                    minor_0,
                                                                    patch_0,
                                                                    snapshotSalt_0);
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_17.toValue(4n),
                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(inventoryCommitment_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Inventory snapshot was not committed before policy activation');
    const publicAdvisoryId_0 = advisoryId_0;
    const releaseId_0 = this._deriveReleaseId_0(publicAdvisoryId_0,
                                                productId_0,
                                                major_0,
                                                minor_0,
                                                patch_0);
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_17.toValue(3n),
                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(releaseId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Product version is not an affected release');
    const nullifier_0 = this._deriveNullifier_0(publicAdvisoryId_0,
                                                memberSecret_0);
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(6n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nullifier_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Member already attested for this advisory');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nullifier_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(7n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_2.toValue(tmp_0),
                                                                alignment: _descriptor_2.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get admin() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(0n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get certifier() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(1n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    memberCredentials: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(2n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                                                                 alignment: _descriptor_13.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(2n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'commonveil.compact line 18 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(2n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    affectedReleases: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(3n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                                                                 alignment: _descriptor_13.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(3n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'commonveil.compact line 19 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(3n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    inventoryCommitments: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(4n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                                                                 alignment: _descriptor_13.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(4n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'commonveil.compact line 20 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(4n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[4];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get policyActive() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(5n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    usedNullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(6n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                                                                 alignment: _descriptor_13.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(6n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'commonveil.compact line 22 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(6n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get accepted() {
      return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_17.toValue(7n),
                                                                                                    alignment: _descriptor_17.alignment() } }] } },
                                                                         { popeq: { cached: true,
                                                                                    result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {
  deriveInventoryCommitment: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`deriveInventoryCommitment: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    const productId_0 = args_0[1];
    const major_0 = args_0[2];
    const minor_0 = args_0[3];
    const patch_0 = args_0[4];
    const snapshotSalt_0 = args_0[5];
    if (!(credential_0.buffer instanceof ArrayBuffer && credential_0.BYTES_PER_ELEMENT === 1 && credential_0.length === 32)) {
      __compactRuntime.typeError('deriveInventoryCommitment',
                                 'argument 1',
                                 'commonveil.compact line 31 char 1',
                                 'Bytes<32>',
                                 credential_0)
    }
    if (!(productId_0.buffer instanceof ArrayBuffer && productId_0.BYTES_PER_ELEMENT === 1 && productId_0.length === 32)) {
      __compactRuntime.typeError('deriveInventoryCommitment',
                                 'argument 2',
                                 'commonveil.compact line 31 char 1',
                                 'Bytes<32>',
                                 productId_0)
    }
    if (!(typeof(major_0) === 'bigint' && major_0 >= 0n && major_0 <= 65535n)) {
      __compactRuntime.typeError('deriveInventoryCommitment',
                                 'argument 3',
                                 'commonveil.compact line 31 char 1',
                                 'Uint<0..65536>',
                                 major_0)
    }
    if (!(typeof(minor_0) === 'bigint' && minor_0 >= 0n && minor_0 <= 65535n)) {
      __compactRuntime.typeError('deriveInventoryCommitment',
                                 'argument 4',
                                 'commonveil.compact line 31 char 1',
                                 'Uint<0..65536>',
                                 minor_0)
    }
    if (!(typeof(patch_0) === 'bigint' && patch_0 >= 0n && patch_0 <= 65535n)) {
      __compactRuntime.typeError('deriveInventoryCommitment',
                                 'argument 5',
                                 'commonveil.compact line 31 char 1',
                                 'Uint<0..65536>',
                                 patch_0)
    }
    if (!(snapshotSalt_0.buffer instanceof ArrayBuffer && snapshotSalt_0.BYTES_PER_ELEMENT === 1 && snapshotSalt_0.length === 32)) {
      __compactRuntime.typeError('deriveInventoryCommitment',
                                 'argument 6',
                                 'commonveil.compact line 31 char 1',
                                 'Bytes<32>',
                                 snapshotSalt_0)
    }
    return _dummyContract._deriveInventoryCommitment_0(credential_0,
                                                       productId_0,
                                                       major_0,
                                                       minor_0,
                                                       patch_0,
                                                       snapshotSalt_0);
  },
  deriveAdminKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`deriveAdminKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const adminSecret_0 = args_0[0];
    if (!(adminSecret_0.buffer instanceof ArrayBuffer && adminSecret_0.BYTES_PER_ELEMENT === 1 && adminSecret_0.length === 32)) {
      __compactRuntime.typeError('deriveAdminKey',
                                 'argument 1',
                                 'commonveil.compact line 52 char 1',
                                 'Bytes<32>',
                                 adminSecret_0)
    }
    return _dummyContract._deriveAdminKey_0(adminSecret_0);
  },
  deriveCertifierKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`deriveCertifierKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const certifierSecret_0 = args_0[0];
    if (!(certifierSecret_0.buffer instanceof ArrayBuffer && certifierSecret_0.BYTES_PER_ELEMENT === 1 && certifierSecret_0.length === 32)) {
      __compactRuntime.typeError('deriveCertifierKey',
                                 'argument 1',
                                 'commonveil.compact line 59 char 1',
                                 'Bytes<32>',
                                 certifierSecret_0)
    }
    return _dummyContract._deriveCertifierKey_0(certifierSecret_0);
  },
  deriveMemberCredential: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`deriveMemberCredential: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const memberSecret_0 = args_0[0];
    const memberSalt_0 = args_0[1];
    if (!(memberSecret_0.buffer instanceof ArrayBuffer && memberSecret_0.BYTES_PER_ELEMENT === 1 && memberSecret_0.length === 32)) {
      __compactRuntime.typeError('deriveMemberCredential',
                                 'argument 1',
                                 'commonveil.compact line 66 char 1',
                                 'Bytes<32>',
                                 memberSecret_0)
    }
    if (!(memberSalt_0.buffer instanceof ArrayBuffer && memberSalt_0.BYTES_PER_ELEMENT === 1 && memberSalt_0.length === 32)) {
      __compactRuntime.typeError('deriveMemberCredential',
                                 'argument 2',
                                 'commonveil.compact line 66 char 1',
                                 'Bytes<32>',
                                 memberSalt_0)
    }
    return _dummyContract._deriveMemberCredential_0(memberSecret_0, memberSalt_0);
  },
  deriveNullifier: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`deriveNullifier: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const advisoryId_0 = args_0[0];
    const memberSecret_0 = args_0[1];
    if (!(advisoryId_0.buffer instanceof ArrayBuffer && advisoryId_0.BYTES_PER_ELEMENT === 1 && advisoryId_0.length === 32)) {
      __compactRuntime.typeError('deriveNullifier',
                                 'argument 1',
                                 'commonveil.compact line 77 char 1',
                                 'Bytes<32>',
                                 advisoryId_0)
    }
    if (!(memberSecret_0.buffer instanceof ArrayBuffer && memberSecret_0.BYTES_PER_ELEMENT === 1 && memberSecret_0.length === 32)) {
      __compactRuntime.typeError('deriveNullifier',
                                 'argument 2',
                                 'commonveil.compact line 77 char 1',
                                 'Bytes<32>',
                                 memberSecret_0)
    }
    return _dummyContract._deriveNullifier_0(advisoryId_0, memberSecret_0);
  },
  deriveReleaseId: (...args_0) => {
    if (args_0.length !== 5) {
      throw new __compactRuntime.CompactError(`deriveReleaseId: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const advisoryId_0 = args_0[0];
    const productId_0 = args_0[1];
    const major_0 = args_0[2];
    const minor_0 = args_0[3];
    const patch_0 = args_0[4];
    if (!(advisoryId_0.buffer instanceof ArrayBuffer && advisoryId_0.BYTES_PER_ELEMENT === 1 && advisoryId_0.length === 32)) {
      __compactRuntime.typeError('deriveReleaseId',
                                 'argument 1',
                                 'commonveil.compact line 88 char 1',
                                 'Bytes<32>',
                                 advisoryId_0)
    }
    if (!(productId_0.buffer instanceof ArrayBuffer && productId_0.BYTES_PER_ELEMENT === 1 && productId_0.length === 32)) {
      __compactRuntime.typeError('deriveReleaseId',
                                 'argument 2',
                                 'commonveil.compact line 88 char 1',
                                 'Bytes<32>',
                                 productId_0)
    }
    if (!(typeof(major_0) === 'bigint' && major_0 >= 0n && major_0 <= 65535n)) {
      __compactRuntime.typeError('deriveReleaseId',
                                 'argument 3',
                                 'commonveil.compact line 88 char 1',
                                 'Uint<0..65536>',
                                 major_0)
    }
    if (!(typeof(minor_0) === 'bigint' && minor_0 >= 0n && minor_0 <= 65535n)) {
      __compactRuntime.typeError('deriveReleaseId',
                                 'argument 4',
                                 'commonveil.compact line 88 char 1',
                                 'Uint<0..65536>',
                                 minor_0)
    }
    if (!(typeof(patch_0) === 'bigint' && patch_0 >= 0n && patch_0 <= 65535n)) {
      __compactRuntime.typeError('deriveReleaseId',
                                 'argument 5',
                                 'commonveil.compact line 88 char 1',
                                 'Uint<0..65536>',
                                 patch_0)
    }
    return _dummyContract._deriveReleaseId_0(advisoryId_0,
                                             productId_0,
                                             major_0,
                                             minor_0,
                                             patch_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
