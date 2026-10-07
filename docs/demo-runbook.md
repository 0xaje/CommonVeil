# Judge demo runbook

## Prerequisites

- Ubuntu or WSL2
- Node.js 22 or newer
- Compact compiler 0.31.1
- Docker with the 8.1.0 proof server
- Chrome with a funded Connector v4 wallet on Midnight Preprod

Never enter or share a wallet seed, mnemonic, or private key in this repository or demo page.

## Verify the repository

```sh
npm ci
npm run verify
```

Expected compiler circuits:

- `attest` — k=15, 19,049 rows
- `certifyInventory` — k=14, 9,061 rows
- `registerAffectedRelease` — k=13, 6,872 rows
- `registerMember` — k=13, 2,605 rows

The generated-circuit test must report one pass and zero failures.

## Start proving and the DApp

```sh
docker run -d --name commonveil-proof-server -p 127.0.0.1:6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
curl http://localhost:6300/health
npm run dev
```

If the named container already exists, start it with `docker start commonveil-proof-server` instead of creating another one.

Open `http://localhost:3000` and keep the wallet unlocked during each operation.

## Live flow

1. Connect the Preprod wallet.
2. Deploy CV-005 with distinct derived registrar and certifier keys.
3. Admit the demo member's opaque credential.
4. Select XZ Utils 5.6.1 and certify the private snapshot.
5. Enter exactly `CVE-2024-3094` and register the exact policy. Approve both release-registration transactions.
6. Generate and submit the private certified-exposure proof.

The successful final view must show `Verified`, accepted reports `1`, used nullifiers `1`, inventory value `Not published`, and six transaction identifiers.

## What to say during the demo

“CommonVeil lets an admitted organization prove that an authorized pre-policy inventory snapshot falls within an exact affected-release set. Midnight verifies membership, certification timing, affected-version matching, and duplicate prevention without publishing the organization or its inventory value. This Preprod demo uses distinct role secrets in one browser; production scanner isolation and hardware-backed measurement remain explicit future work.”
