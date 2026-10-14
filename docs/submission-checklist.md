# Submission readiness checklist

## Repository

- [ ] Feature branch reviewed and merged according to the submission plan.
- [ ] `npm run verify` passes from a clean install.
- [ ] `git diff --check` reports no errors.
- [ ] `contracts/commonveil.compact` is unchanged by evidence-only work.
- [ ] No `.env`, Blockfrost token, wallet secret, passphrase, or private package is tracked.
- [ ] README links to architecture, threat model, evidence, runbook, and this checklist.

## Live Preprod evidence

- [x] Contract address captured.
- [x] Genuine host scan and digest captured.
- [x] Member admission verified read-only.
- [x] Certified snapshot verified locally and on-chain.
- [x] Policy activation and affected release verified.
- [x] Honest unaffected evaluation captured.
- [x] Absence of an attestation transaction stated explicitly.
- [ ] Add any current-run full transaction IDs only from genuine downloaded receipts or wallet/indexer records.

## Screenshots

- [x] Verified Member admission and recovery-tested identity.
- [x] Certified snapshot decrypted and verified.
- [x] Complete prerequisite checklist.
- [x] Honest unaffected-release result.
- [ ] Review images for accidental secrets, filesystem paths, wallet balances, or tokens before publication.

## Documentation and presentation

- [x] Architecture and privacy boundaries documented.
- [x] Threat model and non-goals documented.
- [x] Judge demo sequence separates completed evidence from new actions.
- [ ] Prepare concise pitch deck or submission narrative for the actual competition form.
- [ ] Record the demo video using the judge runbook.
- [ ] Add the final public video URL.
- [ ] Add the deployed application URL if hosting is required.
- [ ] Add the exact track/category, team details, and repository URL requested by the submission form.
- [ ] Confirm deadline, video-length limit, required tags, and judging criteria from the current official submission page.

## Known limitations to disclose

- The genuine scan is package-manager evidence, not hardware-backed remote attestation.
- Current policy semantics use exact release tuples rather than general version ranges.
- The 2026-10-14 genuine host was unaffected; no live positive attestation is claimed.
- A new positive live-host run requires a genuinely affected isolated environment and a snapshot certified before activation, likely on a fresh contract.
- JavaScript cannot guarantee absolute memory scrubbing despite explicit buffer overwrites.

## Final commands

```sh
npm ci
npm run verify
npm run --silent scan:json > inventory-report.json
node -e "JSON.parse(require('fs').readFileSync('inventory-report.json','utf8')); console.log('VALID JSON')"
rm inventory-report.json
git diff --check
git status --short
```
