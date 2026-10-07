# CommonVeil — confidential exposure coordination

CommonVeil is progressing through measured Midnight Preprod milestones. CV-004 binds the affected-product/version proof to a private inventory snapshot committed before the affected-release policy is activated.

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

Open `http://localhost:3000` in Chrome with a funded Connector v4 wallet on Preprod. The CV-004 surface connects the wallet, deploys the contract, admits an opaque member credential, commits controlled private inventory before policy activation, registers the exact CVE-2024-3094 policy for XZ Utils 5.6.0 and 5.6.1, then proves the earlier snapshot matches that policy. Transaction identifiers shown by the page come directly from finalized transactions submitted by the connected wallet.

The connector prefers the wallet's proving provider, which lets 1AM prove in-browser. If the wallet does not expose a prover, it uses the wallet-configured prover URI or the local server at `http://localhost:6300`.

## Security boundary

The member secret, salts, product, and version are private circuit inputs. The ledger contains opaque member credentials, salted inventory commitments, registered release commitments, advisory-scoped nullifiers, and the accepted counter. CV-004 proves the exposure input matches a pre-policy commitment, but does not yet prove that a trusted scanner or device supplied that inventory.

Never upload wallet seeds, mnemonics, private inventory, or private state. A Preprod wallet must be funded and registered for DUST locally before deployment.

## Status

CV-001 through CV-004 are complete. CV-004 compiled, passed its generated-circuit test and production build, and finalized deployment, enrollment, a pre-policy inventory commitment, two exact affected-release registrations, and one private committed-exposure proof on Midnight Preprod. Genuine finalized transaction IDs and measured results are recorded in `docs/status.md`; no transaction ID is invented.

## Current contract requirements

CV-004 uses an admitted credential commitment, a salted pre-policy inventory commitment, exact registrar-approved affected release commitments, and an advisory-scoped nullifier. The registrar controls credential issuance in the demonstration; claims of distinct organizations still require an external enrollment policy.

A proof over freely chosen inventory inputs proves only the predicate over those inputs. Binding to a previously committed inventory is required before claiming historical inventory assurance. Authenticity and completeness still require a separate trust model.

Both commitment membership and the affected-release predicate are constrained inside Compact, not merely computed by TypeScript. Local no-match is not a verified non-exposure proof. Trusted inventory provenance, general version-range semantics, and remediation are deferred.

CV-003 policy sources: https://tukaani.org/xz-backdoor/ and https://access.redhat.com/security/cve/cve-2024-3094

Official references: https://docs.midnight.network/relnotes/support-matrix and https://docs.midnight.network/guides/deploy-and-operate
