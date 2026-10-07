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

Next: define CV-002's admitted-member credential and advisory-scoped nullifier before making anonymity or organizational-uniqueness claims.

References inspected: official example-hello-world commit fa01af37511e955672f484af6f1ef31cb6509798 and the official midnight-leaderboard Connector v4 browser implementation available on 2026-10-07.
