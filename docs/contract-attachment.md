# Verified Contract Attachment and Session Scoping

CommonVeil enables genuine multi-user and multi-session workflows across separate browser sessions or distinct machines. Independent participants (Registrar, Certifier, Member) attach to an existing deployed contract address on Midnight Preprod rather than deploying new contracts.

## 1. Query versus Attach

CommonVeil provides two explicit contract inspection boundaries:

- **`queryCommonVeilContract(providers, contractAddress)` (Read-Only Inspection)**:
  - Validates that `contractAddress` is a non-empty string.
  - Queries the public indexer (`providers.publicDataProvider.queryContractState`).
  - Decodes the raw on-chain state as a valid `CommonVeil.ledger`.
  - Returns `CommonVeilPublicState`.
  - **Does NOT scope the private-state provider**: `privateStateProvider.setContractAddress` is never called.
  - **Submits zero transactions** and reveals zero secrets.

- **`attachCommonVeilContract(providers, contractAddress)` (Verified Attachment)**:
  - First executes `queryCommonVeilContract` and validates ledger compatibility.
  - **Scopes the private-state provider session**: Calls `providers.privateStateProvider.setContractAddress(address)` only after state query and decoding succeed.
  - If query or decoding fails, `setContractAddress` is never called.
  - **Submits zero transactions** and creates no secrets.

---

## 2. Public State Visible After Attachment

Upon successful query or attachment, the session receives a `CommonVeilPublicState` summary containing:

- `contractAddress`: Target contract address.
- `registrarKey`: 32-byte hex public key (`adminKey`) bound at construction.
- `certifierKey`: 32-byte hex public key (`certifierKey`) bound at construction.
- `policyActive`: Boolean flag indicating whether the affected-release policy is active.
- `members`: Count of admitted opaque credentials (`bigint`).
- `inventoryCommitments`: Count of certified inventory snapshots (`bigint`).
- `affectedReleases`: Count of registered affected releases (`bigint`).
- `usedNullifiers`: Count of emitted nullifiers (`bigint`).
- `accepted`: Total verified reports accepted (`bigint`).

**No private secrets or raw inventory values are present in public contract state.**

---

## 3. Local Role Verification (Preflight Checking)

Before attempting a Midnight circuit transaction, participants can locally verify whether their role credentials match the attached contract's state:

- **Registrar Verification (`verifyRegistrarSecret`)**:
  - Locally computes `deriveAdminKey(adminSecret)` using the pure Compact circuit.
  - Compares the derived key to the contract's on-chain `registrarKey`.
- **Certifier Verification (`verifyCertifierSecret`)**:
  - Locally computes `deriveCertifierKey(certifierSecret)` using the pure Compact circuit.
  - Compares the derived key to the contract's on-chain `certifierKey`.
- **Member Verification (`verifyMemberCredential`)**:
  - Locally computes `deriveMemberCredential(memberSecret, memberSalt)` using the pure Compact circuit.
  - Checks set membership in `memberCredentials.member(...)` decoded from the contract ledger.

### Invariants:
1. **Local Preflight Only**: Role verification is performed entirely on the client. It does not submit an on-chain transaction.
2. **Compact Contract Authority**: Local verification is a convenience preflight check; the Midnight Compact contract circuits remain the authoritative cryptographic enforcement on-chain.
3. **Secrets Remain Local**: Supplied `Uint8Array` inputs are never logged, serialized, or retained in the public state object. (Note: standard JavaScript runtime memory cannot guarantee perfect physical zeroization).

---

## 4. Addressing and Transaction Disambiguation

- **Transaction IDs are NOT Contract Addresses**:
  - A transaction identifier (e.g. `0044682865b9...`) represents a submitted ledger transaction. It cannot be queried as a contract address.
  - Contract addresses are distinct identifiers (e.g. `0200...`) assigned by Midnight upon contract creation.
- **Strict Verification Gate**:
  - An address is accepted by CommonVeil if and only if the indexer returns existing state and `CommonVeil.ledger(state.data)` successfully decodes.
  - Attempting to attach to non-existent addresses returns `CONTRACT_NOT_FOUND`.
  - Attempting to attach to corrupted or non-CommonVeil contracts returns `INCOMPATIBLE_CONTRACT`.
