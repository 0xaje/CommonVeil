# Judge demo runbook

This runbook presents completed live evidence without pretending to submit fresh transactions during recording.

## 1. Verify the build

```sh
npm ci
npm run verify
npm run --silent scan:json > inventory-report.json
node -e "JSON.parse(require('fs').readFileSync('inventory-report.json','utf8')); console.log('VALID JSON')"
rm inventory-report.json
```

Explain that generated Compact circuit tests exercise the protocol locally, while the evidence directory records the separate live Preprod run.

## 2. Introduce the problem

“Organizations need to coordinate vulnerability exposure without publishing which organization is affected or what software it operates. CommonVeil separates enrollment, certification, policy publication, and private proof across Registrar, Certifier, and Member roles.”

## 3. Show the live contract read-only

1. Open the Member workspace on Midnight Preprod.
2. Connect 1AM.
3. Inspect or attach contract `b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b`.
4. State clearly that attachment is a read-only lookup and is not a new transaction.
5. Show public counts and `policyActive` exactly as returned by the indexer.

Do not redeploy, re-admit, recertify, or reregister policy during a normal recording.

## 4. Show role separation and recovery

Briefly show the three independent workspaces and the encrypted-backup/recovery-test controls. Never display passwords, secrets, salts, wallet seed phrases, private certification requests, or decrypted snapshot files.

## 5. Show the genuine measurement

Show the terminal output or sanitized report summary:

- provenance: `live-host-scan`;
- product: `pkg:generic/xz-utils`;
- raw version: `5.2.5-2ubuntu1.1`;
- normalized version: `5.2.5`; and
- digest: `e1d39a145e334c3664c1128f45d915c446dd3b718a6867d0fb23262778d25483`.

Do not display the report's host fingerprint publicly.

## 6. Show the completed Member evaluation

Use the committed screenshots or reproduce the read-only UI state:

1. `Verified admitted` and `Recovery Tested`.
2. `Encrypted Snapshot Verified` with Member credential matched locally.
3. Every evaluation prerequisite checked.
4. `Unaffected Release Evaluation — This certified version is outside the registered affected-release set.`

Say explicitly: “The real host measured 5.2.5. The Registrar registered 5.6.0. CommonVeil therefore blocks attestation. No wallet approval, nullifier, or accepted report is created.”

## 7. Explain why the negative result matters

The value is not manufacturing a positive alert. The system preserves private evidence, checks the exact certified tuple against public policy, and refuses to create a blockchain claim when the tuple is outside the affected set.

## 8. Separate prior positive evidence

The six transaction IDs in [evidence.md](evidence.md) belong to the earlier CV-005 positive reference run using a controlled protocol-demonstration input. Present them as prior protocol evidence, never as transactions from the 2026-10-14 genuine-host run.

## 9. Close with the honest boundary

“This run proves the genuine negative operational path on Preprod. A live positive host attestation would require a genuinely affected isolated environment certified before policy activation. We do not change scan results or relabel test vectors to manufacture exposure.”

## Recording safety checklist

- Hide browser downloads and filesystem paths containing private packages.
- Hide wallet balances if they are not needed.
- Do not show secrets, passphrases, salts, seed phrases, or host fingerprints.
- Distinguish a read-only lookup from a submitted transaction.
- Never claim an uncaptured transaction ID.
- Never call the genuine unaffected result a failed transaction.
