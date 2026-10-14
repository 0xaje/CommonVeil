# Midnight Buildathon submission draft

> Status: working submission copy. Replace every bracketed placeholder with a verified public value before submitting. Do not invent a link, user, transaction, metric, or partnership.

## Project

**CommonVeil — Confidential vulnerability exposure coordination on Midnight**

CommonVeil lets an organization prove that a previously certified private software inventory contains a registrar-approved affected release without publishing the organization’s identity, complete inventory, or exact installed version.

## Problem

Critical-vulnerability coordination forces organizations into a damaging choice. Public disclosure can reveal identity and sensitive software inventory to attackers, while an unverifiable private claim gives coordinators no reliable basis for aggregate response.

CommonVeil separates the private fact from the public outcome. A Registrar admits opaque credentials and publishes affected releases. An independent Certifier commits private inventory evidence before policy activation. A Member later proves in zero knowledge that the certified private inventory matches an affected release. Observers see policy state, scoped nullifiers, and an aggregate accepted count—not the Member’s raw inventory.

## Why Midnight

Midnight is the protocol layer, not a payment add-on. Four Compact circuits enforce:

- Registrar-authorized opaque Member admission;
- Certifier-authorized pre-policy inventory commitments;
- Registrar-authorized affected-release registration and policy activation; and
- private affected-release attestations with advisory-scoped replay prevention.

Product and version values remain private circuit inputs. Midnight lets the contract verify their relationship to public policy without publishing them.

## What works today

- Registrar, Certifier, and Member operational workspaces.
- 1AM wallet connection and operator-approved Midnight Preprod transactions.
- Genuine contract deployment, Member admission, inventory certification, policy activation, and private attestation reference evidence.
- Genuine Linux/WSL host inventory scanning with explicit `live-host-scan` provenance.
- Encrypted AES-256-GCM role packages with recovery testing before high-impact actions.
- Verified contract attachment, role-key preflights, retry-safe indexer handling, and sanitized failures.
- A genuine XZ Utils 5.2.5 host result correctly evaluated as outside the registered 5.6.0 affected policy, producing no attestation transaction.

## Current-wave progress

During this wave, CommonVeil advanced from a compact protocol demonstration into a role-separated operational product:

1. Added independent Registrar, Certifier, and Member workspaces.
2. Added validated role packages and authenticated encrypted backup envelopes.
3. Added downloaded-backup recovery testing and lifecycle invalidation.
4. Added verified contract inspection and attachment.
5. Added real CommonVeil deployment with an independent Certifier public key.
6. Added Registrar-controlled Member admission.
7. Added genuine host inventory scanning and privacy-bounded certification requests.
8. Added Certifier-authorized pre-policy inventory certification.
9. Added Registrar affected-release registration and policy activation.
10. Added Member private affected-release evaluation and attestation.
11. Added Blockfrost Preprod indexer override support after endpoint migration.
12. Added operational Preprod evidence, honest negative-result evidence, threat modeling, package boundaries, and a judge runbook.
13. Added extensive regression coverage across Compact execution, cryptographic packages, providers, scanner normalization, and UI state machines.
14. Merged the complete operational product into the default `main` branch and upgraded the repository presentation.

## Privacy boundary

### Private or encrypted

- organizational identity;
- Member, Registrar, and Certifier secrets;
- Member salt and snapshot salt;
- complete host inventory;
- exact installed product/version during attestation;
- backup passwords and package plaintext.

### Public on Midnight

- secret-derived Registrar and Certifier keys;
- opaque admitted credentials;
- salted inventory commitments;
- affected-release commitments;
- policy activation;
- advisory-scoped used nullifiers;
- aggregate accepted count.

## Genuine evidence

### Controlled positive protocol reference

A genuine Preprod reference run completed deployment, admission, certification, policy registration, and private attestation with finalized transaction identifiers recorded in [the evidence index](evidence.md). The controlled affected version exists only to demonstrate the positive protocol path and is not described as the host’s real inventory.

### Genuine host outcome

On 2026-10-14, the scanner measured:

- product: `pkg:generic/xz-utils`;
- raw version: `5.2.5-2ubuntu1.1`;
- normalized version: `5.2.5`;
- provenance: `live-host-scan`;
- result: outside the registered XZ Utils 5.6.0 affected set.

CommonVeil did not alter the measurement or manufacture a successful exposure claim. It correctly requested no attestation transaction.

## Users

- cybersecurity teams that need private exposure reporting;
- sector coordinators and CERT-style response organizations;
- regulated organizations that cannot publish infrastructure inventories;
- software vendors coordinating customer remediation;
- auditors and observers who need credible aggregate response data without participant deanonymization.

## Adoption path

1. Pilot with one coordinator, one independent inventory Certifier, and a small group of participating organizations.
2. Integrate signed scanner output or a device/organizational attestation root.
3. Establish role-key custody, enrollment, revocation, and policy-governance procedures.
4. Extend exact-release policies to independently reviewed version-range semantics.
5. Deploy organization-operated Certifier services and monitoring for wallet, prover, indexer, and network upgrades.

A sustainable deployment can be offered as managed coordination infrastructure or organization-operated software, with setup, governance, support, and compliance integrations as the commercial layer. The privacy protocol should remain auditable and open.

## Technical validation

```sh
npm ci
npm run verify
npm run --silent scan:json > inventory-report.json
```

The verification pipeline checks the required tools, compiles all four Compact circuits, runs the automated suites, type-checks the application, and builds the production bundle. Local automated tests are not presented as live-network evidence; Preprod claims are documented separately.

## Judge path

1. Read the 30-second protocol view in the main README.
2. Review the four Compact circuit responsibilities.
3. Inspect the positive reference transactions and separate genuine-host evidence.
4. Run `npm run verify`.
5. Start the proof server and application using the README.
6. Open each role workspace and inspect its recovery, authorization, and attachment gates.
7. Follow [the judge runbook](demo-runbook.md).
8. Confirm the genuine 5.2.5 result remains unaffected and produces no transaction.

## Limitations

- Scanner provenance is not yet hardware-backed or cryptographically authenticated by a remote device.
- Exact release tuples are supported; general semantic version ranges are not.
- Browser role separation demonstrates protocol authorization but does not prove legal organizational independence.
- JavaScript memory overwrite is best-effort and cannot guarantee garbage-collected memory erasure.
- The genuine 2026-10-14 host run is a successful negative result, not a live positive exposure claim.

## Submission links

- Repository: https://github.com/0xaje/CommonVeil
- Demo application: **[PENDING — add verified public URL or state local-only]**
- Demo video: **[PENDING — add public judge-accessible URL]**
- Pitch deck: https://github.com/0xaje/CommonVeil/blob/main/docs/pitch/CommonVeil-Midnight-Buildathon-Deck.pptx
- Architecture: [architecture.md](architecture.md)
- Evidence: [evidence.md](evidence.md)
- Judge runbook: [demo-runbook.md](demo-runbook.md)

## Team

- **[PENDING — entrant name, role, and individually registered team members]**

## Final form checks

- [ ] Repository topic `midnightntwrk` is visible.
- [ ] Apache 2.0 license is visible.
- [ ] Deck and video permissions allow anonymous viewing.
- [ ] Current-wave progress is pasted without unsupported claims.
- [ ] Deadline and timezone are confirmed from the live signed-in form.
- [ ] Submission is completed personally by an entrant.
