# CV-001 measured status — 2026-10-07 (Africa/Lagos)

- Workspace had no existing Commonveil repository.
- Node 24.19.0 available.
- Compact devtools 0.5.3 installed via official installer. This differs from documented 0.5.1; compiler remains explicitly pinned to 0.31.1.
- Compact runtime 0.16.0 dependency installation succeeded; package-lock recorded.
- Devtools compiler installer failed fetching releases. Downloaded official compactc-v0.31.1 Linux release directly; compactc --version returned 0.31.1. Full compilation succeeded with no skip flags. Generated contract, prover/verifier keys and ZKIR included.
- Actual generated-circuit test PASSED (1 test): first private commitment increments accepted to 1; same secret/salt replay rejected. This is local execution, not a generated network proof.
- Docker command unavailable. Proof server NOT started.
- Browser Connector v4 deployment and attestation surface implemented and production bundle verified locally.
- The browser path prefers wallet-provided proving (1AM) and falls back to a configured/local proof server.
- No generated network proof, deployment, contract address, transaction ID, or Preprod verification has been recorded in this repository yet.

CV-001 remains incomplete until the browser flow records a real Preprod deployment and private-input attestation.

Next: run the browser DApp in WSL, connect a locally controlled funded Preprod wallet, deploy, submit one attestation, and record the returned contract/transaction identifiers. Do not paste wallet recovery material into chat.

References inspected: official example-hello-world commit fa01af37511e955672f484af6f1ef31cb6509798 and the official midnight-leaderboard Connector v4 browser implementation available on 2026-10-07.
