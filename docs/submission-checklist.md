# Midnight Buildathon submission checklist

This checklist tracks the requirements shown on the official AKINDO Buildathon page, the linked rules, and the detailed judging rubric. If those sources conflict, follow the live signed-in AKINDO submission form operationally and preserve a screenshot of the displayed deadline and required fields.

## Mandatory eligibility and technical gate

- [x] Public GitHub repository: `https://github.com/0xaje/CommonVeil`.
- [x] Repository default branch contains the complete current product.
- [x] Feature branch and `main` are identical at commit `412b5a40c90602c2c7e0abd16b69e76a4cfe7804`.
- [x] At least one Compact contract compiles; CommonVeil contains four state-changing circuits.
- [x] Midnight functionality is material to the product rather than a superficial integration.
- [x] Midnight-related code is licensed under Apache License 2.0.
- [ ] Add the required `midnightntwrk` GitHub repository topic.
- [ ] Confirm every team member has registered individually.
- [ ] Confirm the final team contains no more than five members.
- [ ] Confirm eligibility and sanctions requirements for every entrant and connected wallet.

## Required submission materials

- [x] Public source repository.
- [x] README covering the problem, setup, architecture, Midnight integration, privacy boundary, evidence, limitations, and judge instructions.
- [x] Architecture, threat model, package boundary, evidence, and demo-runbook documentation.
- [x] Genuine Midnight Preprod evidence separated from local tests.
- [x] Current-wave progress narrative: [Buildathon submission draft](buildathon-submission.md).
- [ ] Final slide deck with a public judge-accessible URL.
- [ ] Final demo/video pitch with a public judge-accessible URL.
- [ ] Public application URL, if the team can host the wallet-enabled build safely.
- [ ] Final AKINDO project description and current-wave progress fields.
- [ ] Final team names and roles.
- [ ] Submit personally through AKINDO; do not use automated entry tools.
- [ ] Save the submitted form confirmation and timestamp as evidence.

## Repository verification

- [ ] Run `npm ci` from a clean checkout.
- [ ] Run `npm run verify`.
- [ ] Run `git diff --check`.
- [ ] Confirm no `.env`, Blockfrost token, wallet secret, passphrase, private role package, or private inventory file is tracked.
- [ ] Confirm the README’s deck, video, and application links resolve without sign-in.
- [ ] Confirm the repository topic `midnightntwrk` is visible publicly.

## Genuine evidence review

- [x] Contract address captured.
- [x] Genuine host scan and digest captured.
- [x] Member admission verified read-only.
- [x] Certified snapshot verified locally and on-chain.
- [x] Policy activation and affected release verified.
- [x] Honest unaffected evaluation captured.
- [x] Absence of an attestation transaction stated explicitly for the genuine 5.2.5 run.
- [ ] Add current-run full transaction IDs only when recovered from genuine receipts, wallet history, or indexer records.
- [ ] Review every published screenshot for secrets, filesystem paths, wallet balances, project tokens, and identifying host details.

## Judge-path acceptance test

- [ ] A first-time reviewer understands the problem and Midnight value in 30 seconds.
- [ ] The demo distinguishes controlled positive protocol evidence from genuine live-host evidence.
- [ ] The demo shows the four Compact circuits and explains what remains private versus public.
- [ ] The demo shows a real Preprod contract and finalized transaction evidence.
- [ ] The demo shows that XZ Utils 5.2.5 correctly produces an unaffected result rather than a fabricated success.
- [ ] Setup commands work from a clean checkout.
- [ ] The complete judge path fits the final permitted video length.
- [ ] Failure states are explained without exposing raw provider errors or credentials.

## Judging-rubric coverage

### Product leadership

- [x] Real vulnerability-coordination problem is clearly defined.
- [x] Midnight-specific privacy value is explicit.
- [x] Product limitations and next milestones are documented.
- [ ] Final deck includes a concise product roadmap and ownership plan.

### Backend engineering

- [x] Four real Compact circuits enforce the protocol.
- [x] Real wallet, proof, indexer, and Preprod transaction paths exist.
- [x] Errors, retries, indexer lag, and state invalidation are handled.
- [x] Architecture and reproduction instructions are documented.

### Frontend and UX

- [x] Registrar, Certifier, and Member workspaces are operationally separated.
- [x] Recovery-tested encrypted backups gate high-impact actions.
- [x] Status, prerequisites, and honest negative outcomes are visible.
- [ ] Perform one final clean-browser usability pass and record issues before filming.

### Quality assurance

- [x] Compact behavior, packages, providers, scanner, and UI state machines have regression coverage.
- [x] Genuine live evidence is not substituted with mocks.
- [ ] Record the final clean verification output and exact test count used in the submission.
- [ ] Record the final application version/commit SHA in the deck and video description.

### Communication and marketing

- [x] Professional Midnight-focused README.
- [ ] Final pitch deck.
- [ ] Final demo video.
- [ ] One public educational post explaining the privacy problem and Midnight design.
- [ ] Optional Midnight community/Discord progress post that links the public repository.

### Business development and viability

- [x] Initial user groups and trust boundaries are documented.
- [ ] Define the first adopting organization and pilot workflow.
- [ ] Explain the deployment model, governance, and who pays.
- [ ] Add a concise go-to-market and sustainability slide.
- [ ] Identify likely Midnight ecosystem, cybersecurity, CERT, regulator, or software-supply-chain partners.

## Deadline control

The official Midnight page, live AKINDO page, and older rules PDF have displayed inconsistent dates. Do not silently choose one.

- [ ] Open the signed-in AKINDO submission page.
- [ ] Record the live countdown, displayed deadline, and timezone.
- [ ] Confirm any uncertainty in the official community/organizer channel.
- [ ] Set an internal submission deadline at least 24 hours earlier.
- [ ] Confirm the allowed video length, required tags, file formats, and link permissions from the live form.

## Final commands

```sh
npm ci
npm run verify
npm run --silent scan:json > inventory-report.json
node -e "JSON.parse(require('fs').readFileSync('inventory-report.json','utf8')); console.log('VALID JSON')"
rm inventory-report.json
git diff --check
git status --short
git rev-parse HEAD
```

## Known limitations to disclose

- The genuine scan is package-manager evidence, not hardware-backed remote attestation.
- Current policy semantics use exact release tuples rather than general version ranges.
- The 2026-10-14 genuine host was unaffected; no live positive attestation is claimed for that run.
- A new positive live-host run requires a genuinely affected isolated environment and a snapshot certified before policy activation, likely on a fresh contract.
- JavaScript cannot guarantee absolute memory scrubbing despite explicit buffer overwrites.
