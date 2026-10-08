# Role Package Boundary and Cryptographic Handoff

CommonVeil enforces cryptographic role separation across Registrar, Certifier, and Member. When workflows move across separate browser sessions or distinct machines, information exchanged out-of-band is partitioned into strict classification tiers.

## Package Classification Tiers

| Tier | Schema | Participants | Description & Sensitivity |
|---|---|---|---|
| **Public** | `commonveil.certifier-key/v1` | Certifier → Registrar | Contains only `certifierKey` (derived hash) and creation timestamp. Safe for public distribution. |
| **Restricted** | `commonveil.member-admission/v1` | Member → Registrar | Contains `contractAddress` and `memberCredential`. Although `memberCredential` is a one-way persistent commitment that does not reveal `memberSecret`, it is persistent across an organization and creates correlation. Shared **only** with the authorized Registrar. |
| **Private** | `commonveil.certification-request/v1` | Member → Certifier | Contains `contractAddress`, `memberCredential`, and exact inventory measurement details (`product`, `version`, `provenance`, `measurementDigest`, `observedAt`). Reveals private inventory to the Certifier. Must never be published. |
| **Private** | `commonveil.certified-snapshot/v1` | Certifier → Member | Contains `contractAddress`, `memberCredential`, `product`, `version`, `snapshotSalt`, `commitment`, and finalized certification `txId`. Contains the private `snapshotSalt` needed for ZK proving. Must never be published. |
| **Encrypted Envelope** | `commonveil.encrypted-envelope/v1` | Sender ↔ Receiver / Self-backup | Encrypted with **AES-256-GCM** using **PBKDF2-SHA-256** (strictly fixed at 600,000 iterations). Authenticates envelope metadata using AES-GCM additional authenticated data (AAD). Requires minimum 12 Unicode characters passphrase. Protects private packages and secret backups at rest and in transit. |

---

## What Each Participant Learns

1. **Registrar Learns**:
   - The Certifier's public key (`certifierKey`).
   - The Member's admitted credential commitment (`memberCredential`).
   - **Does NOT learn**: Member secret (`memberSecret`), member salt (`memberSalt`), certifier secret (`certifierSecret`), inventory value, or whether any admitted member is exposed.

2. **Certifier Learns**:
   - The Member's credential (`memberCredential`).
   - The Member's inventory measurement tuple submitted for certification.
   - **Does NOT learn**: Member secret (`memberSecret`), member salt (`memberSalt`), or registrar secret (`adminSecret`).

3. **Member Learns**:
   - Their own secrets (`memberSecret`, `memberSalt`).
   - The certified snapshot salt (`snapshotSalt`) and resulting on-chain commitment issued by the Certifier.
   - **Does NOT learn**: Registrar secret (`adminSecret`), certifier secret (`certifierSecret`), or other members' credentials.

4. **Public Ledger / Observers Learn**:
   - Contract public keys (`admin`, `certifier`).
   - Admitted credentials (`memberCredentials` set).
   - Certified inventory commitments (`inventoryCommitments` set).
   - Registered affected release commitments (`affectedReleases` set).
   - Advisory-scoped nullifiers (`usedNullifiers` set).
   - Aggregate accepted counter (`accepted`).
   - **Does NOT learn**: Member identity, member secrets, inventory product/version, or snapshot salts.

---

## What Must Never Be Posted Publicly

1. **Raw Secrets & Private Salts**:
   - `adminSecret`, `certifierSecret`, `memberSecret`, `memberSalt`, and `snapshotSalt` must NEVER be shared, logged, or exported in plaintext.
2. **Private Role Packages**:
   - `commonveil.certification-request/v1` and `commonveil.certified-snapshot/v1` contain unmasked inventory tuples and snapshot salts. They must never be posted to public chats, forums, or unencrypted storage.
3. **Correlation-Sensitive Identifiers**:
   - `memberCredential` must not be broadcast to public directories; treat it as restricted workflow data shared only with the required Registrar and Certifier.

---

## Provenance Honesty and Boundary

Inventory reports label their origin as either:
- `live-host-scan`: Measured from the host's actual package manager (`dpkg-query`, `rpm`) or executable.
- `controlled-test-vector`: Predefined protocol demonstration vector (e.g. controlled XZ 5.6.1 input).

**Honest boundary notice**:
- Package validation preserves the claimed provenance label throughout the workflow.
- Package validation verifies internal measurement consistency (that `normalized` exactly derives as `${major}.${minor}.${patch}` and matches `measurementDigest`).
- Package validation **does not cryptographically authenticate scanner origin**.
- Authenticated scanner provenance requires a future signature or hardware/device-attestation mechanism.
- A controlled test vector must never be presented as a live scan.
