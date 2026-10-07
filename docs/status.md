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

References inspected: official example-hello-world commit fa01af37511e955672f484af6f1ef31cb6509798 and the official midnight-leaderboard Connector v4 browser implementation available on 2026-10-07.
