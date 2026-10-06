# Commonveil — CV-001 foundation

Confidential exposure coordination on Midnight. This milestone is deliberately only a private-preimage commitment circuit. It does not yet prove vulnerability exposure, inventory authenticity, anonymous membership, or organizational uniqueness.

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

## Security boundary

The secret and salt are private circuit inputs. Only their salted commitment and a counter are public. Reusing the commitment is rejected. Changing the salt creates another commitment: this is not Sybil resistance.

Never upload wallet seeds, mnemonics, private inventory, or private state. A Preprod wallet must be funded and registered for DUST locally before deployment.

## Status

See docs/status.md for measured outcomes. CV-001 is incomplete until a genuine proof and finalized Preprod call have been recorded. No transaction ID is invented.

## Next contract requirements

Use an admitted credential membership proof and advisory-scoped nullifier. Public membership lookup keyed by a participant commitment may link exposure to registration; anonymity must be demonstrated, not assumed. A registrar controls credential issuance in the demonstration; claims of distinct organizations require an external enrollment policy.

A proof over freely chosen inventory inputs proves only the predicate over those inputs. Binding to a previously committed inventory is required before claiming historical inventory assurance. Authenticity and completeness still require a separate trust model.

The exposed predicate must be constrained inside Compact, not merely computed by a TypeScript witness. Start with one exact affected product/version, not general NVD version-range semantics. Local no-match is not a verified non-exposure proof. Remediation is deferred.

Official references: https://docs.midnight.network/relnotes/support-matrix and https://docs.midnight.network/guides/deploy-and-operate
