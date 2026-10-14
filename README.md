# CommonVeil — confidential exposure coordination

CommonVeil is a multi-role Midnight application for coordinating vulnerability exposure without publishing a member identity or private inventory. The latest operational run separates Registrar, Certifier, and Member workspaces and carries a genuine host measurement through admission, pre-policy certification, policy activation, and private Member evaluation.

## What the protocol proves

- A registrar admitted the reporting credential.
- An authorized certifier committed the private inventory before policy activation.
- The same private product/version belongs to the exact registered affected set.
- The member has not already reported for that advisory.
- The accepted count can increase without publishing member identity or inventory value.

The earlier CV-005 reference flow is verified by six genuine Midnight Preprod transactions. The 2026-10-14 operational run additionally records a genuine `live-host-scan` of XZ Utils 5.2.5 and an honest negative evaluation against a registered 5.6.0 affected-release policy. See [docs/evidence.md](docs/evidence.md).

## Run in Linux or WSL

Install Compact through the official Midnight installer. Pin compiler 0.31.1 with `compact update 0.31.1`. Node 22+ and Docker are required.

```sh
npm ci
npm run verify
docker run --rm -p 127.0.0.1:6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
```

Compilation must generate contract, keys and zkir directories without skip flags. The tests execute the actual generated Compact circuit locally; they are not a network proof or a substitute for deployment.

## Browser Preprod milestone

After compiling and starting the proof server:

```sh
npm run dev
```

Open `http://localhost:3000` in Chrome with a funded Connector v4 wallet on Preprod. The CV-005 surface connects the wallet, deploys independent registrar and certifier public keys, admits an opaque member credential, has the authorized certifier commit controlled private inventory before policy activation, registers the exact CVE-2024-3094 policy for XZ Utils 5.6.0 and 5.6.1, then proves the certified snapshot matches that policy. Transaction identifiers shown by the page come directly from finalized transactions submitted by the connected wallet.

The connector prefers the wallet's proving provider, which lets 1AM prove in-browser. If the wallet does not expose a prover, it uses the wallet-configured prover URI or the local server at `http://localhost:6300`.

## Live inventory measurement

Run the scanner inside the Linux or WSL environment whose package inventory you want to inspect:

```sh
npm run scan
```

The command queries the host package manager and then the installed `xz` binary. It emits a JSON report marked `live-host-scan`, including the observed package version, a one-way host fingerprint, the exact-policy assessment, and a SHA-256 measurement digest. It understands Debian/Ubuntu `+really` rollback versions so a patched `5.6.1+really5.4.5` package is not falsely reported as affected. If XZ cannot be detected, it exits with code `2` and does not invent a version or create an exposure claim.

The scanner is real host measurement, but it is not yet hardware attestation: a production certifier must authenticate the scanner and bind its signed output to the member credential before calling `certifyInventory`. The browser's affected-version selector remains an explicitly controlled protocol test vector and must not be described as a scan of the host.

## Security boundary

The registrar, certifier, and member secrets plus snapshot salts, product, and version are private circuit inputs. The ledger contains derived role keys, opaque member credentials, salted certified-inventory commitments, registered release commitments, advisory-scoped nullifiers, and the accepted counter. CV-005 enforces certifier authorization in Compact, but the demo generates all roles in one browser and does not yet integrate an independent production scanner or device root of trust.

Never upload wallet seeds, mnemonics, private inventory, or private state. A Preprod wallet must be funded and registered for DUST locally before deployment.

## Status

CV-001 through CV-005 established the verified on-chain Preprod cryptographic baseline. CV-006 through CV-011 complete the multi-role operational protocol across Registrar, Certifier, and Member.

The multi-role operational workflow has now been exercised on Midnight Preprod through deployment, Member admission, authorized inventory certification, affected-release registration, policy activation, encrypted snapshot handoff, read-only admission verification, and final Member evaluation. The genuine host was not affected, so CommonVeil correctly blocked attestation and requested no attestation transaction.

Automated Compact execution validates the positive and negative protocol paths locally without network dependency. Earlier genuine positive Preprod evidence (CV-001 through CV-005) remains preserved separately from the 2026-10-14 genuine negative operational run.

Honest scanning: scanning the genuine host measures `xz-utils 5.2.5`, which is honestly evaluated as outside the registered `CVE-2024-3094` affected-release set (5.6.0 and 5.6.1). CommonVeil does not fabricate a positive exposure claim for `xz-utils 5.2.5`.

## Current contract requirements

CV-005 uses separate registrar and certifier keys, an admitted credential commitment, a salted certifier-originated pre-policy inventory commitment, exact registrar-approved affected release commitments, and an advisory-scoped nullifier. Claims of distinct organizations still require an external enrollment policy.

The proof establishes that an authorized certifier key committed the exact private input before policy activation. Production-grade measurement authenticity, scanner isolation, key custody, and inventory completeness still require a separate operational trust model.

Both commitment membership and the affected-release predicate are constrained inside Compact, not merely computed by TypeScript. Local no-match is not a verified non-exposure proof. Trusted inventory provenance, general version-range semantics, and remediation are deferred.

CV-003 policy sources: https://tukaani.org/xz-backdoor/ and https://access.redhat.com/security/cve/cve-2024-3094

Official references: https://docs.midnight.network/relnotes/support-matrix and https://docs.midnight.network/guides/deploy-and-operate

## Documentation

- [Architecture and circuit flow](docs/architecture.md)
- [Threat model and claim boundary](docs/threat-model.md)
- [Verified Preprod evidence](docs/evidence.md)
- [2026-10-14 operational evidence](docs/evidence/live-preprod-2026-10-14/README.md)
- [Judge demo runbook](docs/demo-runbook.md)
- [Measured milestone history](docs/status.md)
- [Submission checklist](docs/submission-checklist.md)
