import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type AdminKey = Uint8Array;

export type CertifierKey = Uint8Array;

export type MemberCredential = Uint8Array;

export type AdvisoryId = Uint8Array;

export type ProductId = Uint8Array;

export type ReleaseId = Uint8Array;

export type InventoryCommitment = Uint8Array;

export type Nullifier = Uint8Array;

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  registerMember(context: __compactRuntime.CircuitContext<PS>,
                 adminSecret_0: Uint8Array,
                 credential_0: MemberCredential): __compactRuntime.CircuitResults<PS, []>;
  certifyInventory(context: __compactRuntime.CircuitContext<PS>,
                   certifierSecret_0: Uint8Array,
                   credential_0: MemberCredential,
                   productId_0: ProductId,
                   major_0: bigint,
                   minor_0: bigint,
                   patch_0: bigint,
                   snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerAffectedRelease(context: __compactRuntime.CircuitContext<PS>,
                          adminSecret_0: Uint8Array,
                          advisoryId_0: AdvisoryId,
                          productId_0: ProductId,
                          major_0: bigint,
                          minor_0: bigint,
                          patch_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  attest(context: __compactRuntime.CircuitContext<PS>,
         advisoryId_0: AdvisoryId,
         memberSecret_0: Uint8Array,
         memberSalt_0: Uint8Array,
         productId_0: ProductId,
         major_0: bigint,
         minor_0: bigint,
         patch_0: bigint,
         snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerMember(context: __compactRuntime.CircuitContext<PS>,
                 adminSecret_0: Uint8Array,
                 credential_0: MemberCredential): __compactRuntime.CircuitResults<PS, []>;
  certifyInventory(context: __compactRuntime.CircuitContext<PS>,
                   certifierSecret_0: Uint8Array,
                   credential_0: MemberCredential,
                   productId_0: ProductId,
                   major_0: bigint,
                   minor_0: bigint,
                   patch_0: bigint,
                   snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerAffectedRelease(context: __compactRuntime.CircuitContext<PS>,
                          adminSecret_0: Uint8Array,
                          advisoryId_0: AdvisoryId,
                          productId_0: ProductId,
                          major_0: bigint,
                          minor_0: bigint,
                          patch_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  attest(context: __compactRuntime.CircuitContext<PS>,
         advisoryId_0: AdvisoryId,
         memberSecret_0: Uint8Array,
         memberSalt_0: Uint8Array,
         productId_0: ProductId,
         major_0: bigint,
         minor_0: bigint,
         patch_0: bigint,
         snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  deriveInventoryCommitment(credential_0: MemberCredential,
                            productId_0: ProductId,
                            major_0: bigint,
                            minor_0: bigint,
                            patch_0: bigint,
                            snapshotSalt_0: Uint8Array): InventoryCommitment;
  deriveAdminKey(adminSecret_0: Uint8Array): AdminKey;
  deriveCertifierKey(certifierSecret_0: Uint8Array): CertifierKey;
  deriveMemberCredential(memberSecret_0: Uint8Array, memberSalt_0: Uint8Array): MemberCredential;
  deriveNullifier(advisoryId_0: AdvisoryId, memberSecret_0: Uint8Array): Nullifier;
  deriveReleaseId(advisoryId_0: AdvisoryId,
                  productId_0: ProductId,
                  major_0: bigint,
                  minor_0: bigint,
                  patch_0: bigint): ReleaseId;
}

export type Circuits<PS> = {
  deriveInventoryCommitment(context: __compactRuntime.CircuitContext<PS>,
                            credential_0: MemberCredential,
                            productId_0: ProductId,
                            major_0: bigint,
                            minor_0: bigint,
                            patch_0: bigint,
                            snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, InventoryCommitment>;
  deriveAdminKey(context: __compactRuntime.CircuitContext<PS>,
                 adminSecret_0: Uint8Array): __compactRuntime.CircuitResults<PS, AdminKey>;
  deriveCertifierKey(context: __compactRuntime.CircuitContext<PS>,
                     certifierSecret_0: Uint8Array): __compactRuntime.CircuitResults<PS, CertifierKey>;
  deriveMemberCredential(context: __compactRuntime.CircuitContext<PS>,
                         memberSecret_0: Uint8Array,
                         memberSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, MemberCredential>;
  deriveNullifier(context: __compactRuntime.CircuitContext<PS>,
                  advisoryId_0: AdvisoryId,
                  memberSecret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Nullifier>;
  deriveReleaseId(context: __compactRuntime.CircuitContext<PS>,
                  advisoryId_0: AdvisoryId,
                  productId_0: ProductId,
                  major_0: bigint,
                  minor_0: bigint,
                  patch_0: bigint): __compactRuntime.CircuitResults<PS, ReleaseId>;
  registerMember(context: __compactRuntime.CircuitContext<PS>,
                 adminSecret_0: Uint8Array,
                 credential_0: MemberCredential): __compactRuntime.CircuitResults<PS, []>;
  certifyInventory(context: __compactRuntime.CircuitContext<PS>,
                   certifierSecret_0: Uint8Array,
                   credential_0: MemberCredential,
                   productId_0: ProductId,
                   major_0: bigint,
                   minor_0: bigint,
                   patch_0: bigint,
                   snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerAffectedRelease(context: __compactRuntime.CircuitContext<PS>,
                          adminSecret_0: Uint8Array,
                          advisoryId_0: AdvisoryId,
                          productId_0: ProductId,
                          major_0: bigint,
                          minor_0: bigint,
                          patch_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  attest(context: __compactRuntime.CircuitContext<PS>,
         advisoryId_0: AdvisoryId,
         memberSecret_0: Uint8Array,
         memberSalt_0: Uint8Array,
         productId_0: ProductId,
         major_0: bigint,
         minor_0: bigint,
         patch_0: bigint,
         snapshotSalt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly admin: AdminKey;
  readonly certifier: CertifierKey;
  memberCredentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: MemberCredential): boolean;
    [Symbol.iterator](): Iterator<MemberCredential>
  };
  affectedReleases: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: ReleaseId): boolean;
    [Symbol.iterator](): Iterator<ReleaseId>
  };
  inventoryCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: InventoryCommitment): boolean;
    [Symbol.iterator](): Iterator<InventoryCommitment>
  };
  readonly policyActive: boolean;
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Nullifier): boolean;
    [Symbol.iterator](): Iterator<Nullifier>
  };
  readonly accepted: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               adminKey_0: AdminKey,
               certifierKey_0: CertifierKey): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
