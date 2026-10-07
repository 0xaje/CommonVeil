# CommonVeil — confidential exposure coordination

CommonVeil is progressing through measured Midnight Preprod milestones. CV-005 adds a cryptographically separate authorized certifier that must originate the private inventory commitment before the affected-release policy activates.

## Run in Linux or WSL

Install Compact through the official Midnight installer. Pin compiler 0.31.1 with `compact update 0.31.1`. Node 22+ and Docker are required.

```sh
npm ci
npm run doctor
npm run compile
npm test
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

## Security boundary

The registrar, certifier, and member secrets plus snapshot salts, product, and version are private circuit inputs. The ledger contains derived role keys, opaque member credentials, salted certified-inventory commitments, registered release commitments, advisory-scoped nullifiers, and the accepted counter. CV-005 enforces certifier authorization in Compact, but the demo generates all roles in one browser and does not yet integrate an independent production scanner or device root of trust.

Never upload wallet seeds, mnemonics, private inventory, or private state. A Preprod wallet must be funded and registered for DUST locally before deployment.

## Status

CV-001 through CV-004 are complete. CV-005 source and negative-path tests are ready for compilation and Preprod verification. Genuine finalized transaction IDs and measured results are recorded in `docs/status.md`; no transaction ID is invented.

## Current contract requirements

CV-005 uses separate registrar and certifier keys, an admitted credential commitment, a salted certifier-originated pre-policy inventory commitment, exact registrar-approved affected release commitments, and an advisory-scoped nullifier. Claims of distinct organizations still require an external enrollment policy.

The proof establishes that an authorized certifier key committed the exact private input before policy activation. Production-grade measurement authenticity, scanner isolation, key custody, and inventory completeness still require a separate operational trust model.

Both commitment membership and the affected-release predicate are constrained inside Compact, not merely computed by TypeScript. Local no-match is not a verified non-exposure proof. Trusted inventory provenance, general version-range semantics, and remediation are deferred.

CV-003 policy sources: https://tukaani.org/xz-backdoor/ and https://access.redhat.com/security/cve/cve-2024-3094

Official references: https://docs.midnight.network/relnotes/support-matrix and https://docs.midnight.network/guides/deploy-and-operate
