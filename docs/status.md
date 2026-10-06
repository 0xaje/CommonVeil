# CV-001 measured status — 2026-10-07 (Africa/Lagos)

- Workspace had no existing Commonveil repository.
- Node 24.19.0 available.
- Compact devtools 0.5.3 installed via official installer. This differs from documented 0.5.1; compiler remains explicitly pinned to 0.31.1.
- Compact runtime 0.16.0 dependency installation succeeded; package-lock recorded.
- Devtools compiler installer failed fetching releases. Downloaded official compactc-v0.31.1 Linux release directly; compactc --version returned 0.31.1. Full compilation succeeded with no skip flags. Generated contract, prover/verifier keys and ZKIR included.
- Actual generated-circuit test PASSED (1 test): first private commitment increments accepted to 1; same secret/salt replay rejected. This is local execution, not a generated network proof.
- Docker command unavailable. Proof server NOT started.
- No wallet configured or funded in this workspace.
- No generated proof, deployment, contract address, transaction ID, or Preprod verification exists.

CV-001 remains BLOCKED / incomplete. The archive is source foundation, not proof of a functioning Midnight deployment.

Next: run scripts/validate.sh in WSL with Docker Desktop integration enabled, start the loopback-bound proof server from README, and wire the official 4.1.1 providers to a locally controlled funded Preprod wallet. Do not paste wallet recovery material into chat.

Reference inspected: official example-hello-world commit fa01af37511e955672f484af6f1ef31cb6509798. Provider/deployment integration is not included yet because it has not been validated.
