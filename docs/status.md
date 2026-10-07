# CV-001 measured status — 2026-10-07 (Africa/Lagos)

- Compact devtools 0.5.3 and compiler 0.31.1 installed in Ubuntu 22.04 on WSL2.
- Full compilation succeeded with no skip flags and generated the contract, prover/verifier keys, and ZKIR.
- Generated-circuit test PASSED (1 test): the first private commitment increments `accepted` to 1 and replaying the same secret/salt is rejected.
- Proof server 8.1.0 ran in Docker and reported healthy on `127.0.0.1:6300`.
- Connector v4 connected a locally controlled 1AM wallet on Midnight Preprod.
- The real Compact contract deployment finalized with transaction ID `00a194c3d7fd61403e878af0d4ce2ff02ffd24990a6159887e9a7ab7c16a0ccfaf`.
- A private `attest(secret, salt)` proof and call finalized with transaction ID `00d507d6787c0e703abe4d72e99c7812d7d78cafdffafe94eae397a040a27c5182`.
- The DApp queried public contract state after submission and reported `Private attestation verified`.
- Raw secret and salt values were generated locally, never displayed or submitted as public data, and their browser buffers were overwritten after the operation.
- Ledger v8 is pinned and hoisted as one physical dependency to preserve WASM class identity across Compact JS and Midnight.js.

CV-001 is complete: local circuit behavior, a real Preprod deployment, and a real private-input attestation have all been recorded without mock network data.

## CV-002 measured status — 2026-10-07 (Africa/Lagos)

- Three circuits compiled with Compact 0.31.1: `attest` (k=14, 8,686 rows), `registerAdvisory` (k=13, 2,605 rows), and `registerMember` (k=13, 2,605 rows).
- Generated-circuit invariants PASSED: unauthorized enrollment, unregistered-advisory use, unadmitted-member use, and same-member/same-advisory replay are rejected; the same member can attest for a separately registered advisory.
- The production TypeScript/Vite build completed successfully.
- Registrar-bound deployment finalized with transaction ID `003ca5d0e6cf8fffd7c69d5cef217706bbb40d82b560e872c4d2287b588be0f38e`.
- Opaque member admission finalized with transaction ID `00088e8aee0785ab9b51b8c73928f05b01ee2b8312aa8cd9687d5b941552039ab9`.
- Public advisory scope `CVE-2024-3094` was registered through its canonical hash with transaction ID `00a05da0f3861d50f3dfb2832e8a1bd282029fc917ca8beacbd60883d2a2502f68`.
- Private membership attestation finalized with transaction ID `006cb070c40d8f809bc56aa65fd87669b70890894d70bb56263dd8f1e5433512e3`.
- Indexed public state reported 1 accepted report and 1 used nullifier. The member identity, member secret, and member salt were not published.

CV-002 is complete for the demonstrated enrollment policy and advisory. It proves membership in the registrar-admitted set and prevents the admitted secret from attesting twice for the same registered advisory. It does not independently prove that two admitted credentials belong to two distinct real-world organizations; that remains an enrollment-policy responsibility.

Next: bind the report to an exact affected product/version predicate before claiming verified vulnerability exposure.

## CV-003 measured status — 2026-10-07 (Africa/Lagos)

- The contract now registers exact affected-release commitments and requires the private product/version tuple to match one before accepting an attestation.
- The browser policy is deliberately narrow: `CVE-2024-3094`, product `pkg:generic/xz-utils`, and exact releases 5.6.0 or 5.6.1.
- Three circuits compiled with Compact 0.31.1: `attest` (k=14, 12,953 rows), `registerAffectedRelease` (k=13, 6,872 rows), and `registerMember` (k=13, 2,605 rows).
- The generated-circuit test PASSED and covers unauthorized policy registration, unregistered releases, an unadmitted member, wrong product, wrong version, valid affected release, advisory replay, and a separate-advisory success path.
- The production TypeScript/Vite build completed successfully.
- Registrar-bound deployment finalized with transaction ID `0023665f966744a83ca90cd2ed14dd7d70b921d9b4d61fa32720b85da5f6c2d638`.
- Opaque member admission finalized with transaction ID `0029f070b71adff055015ef2dc62eb7aa8807ecf9dac31029f53365037db2ab15a`.
- Affected XZ Utils 5.6.0 policy registration finalized with transaction ID `00d692b2782ffae3c91b9af3bd9f94ec0b05e73f53fa79a41fc98a07154d20b1c2`.
- Affected XZ Utils 5.6.1 policy registration finalized with transaction ID `00d858d5b15ffa54485ac971f4703af7f3b8f2d879663781fc75e48182c46d81df`.
- The private affected-release proof finalized with transaction ID `00ee2d2c8c077f5b0bf800deb94073814fda47f5f66dbf1af140989b4bb81e9433`.
- Indexed public state reported 1 accepted report and 1 used nullifier; the page reported `Verified` and `Inventory value: Not published`.
- The product/version inputs are not stored as ledger fields. A release commitment is disclosed for set membership, and a successful proof establishes membership in the small public policy set.
- This is controlled protocol-demonstration inventory, not a claim that the test machine is exposed. Scanner/device authenticity and inventory completeness remain outside CV-003.

CV-003 is complete for the exact affected-release predicate demonstrated above. All network evidence is from finalized Midnight Preprod transactions; no transaction identifier or exposure result is fabricated.

Policy references inspected on 2026-10-07: the XZ Utils project incident page and Red Hat CVE-2024-3094 advisory, both identifying the malicious release tarballs as versions 5.6.0 and 5.6.1.

References inspected: official example-hello-world commit fa01af37511e955672f484af6f1ef31cb6509798 and the official midnight-leaderboard Connector v4 browser implementation available on 2026-10-07.
