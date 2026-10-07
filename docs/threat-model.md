# Threat model and claim boundary

## Protected claims

| Claim | Enforcement |
|---|---|
| Only the registrar admits credentials | `admin == deriveAdminKey(adminSecret)` |
| Only the certifier creates inventory commitments | `certifier == deriveCertifierKey(certifierSecret)` |
| Certification precedes policy activation | `certifyInventory` rejects when `policyActive` is true |
| Reporter owns an admitted credential | Credential is recomputed from private member secret and salt |
| Reported inventory was certified | Private tuple must reproduce a stored salted commitment |
| Inventory is in the affected set | Private tuple must reproduce a registered release commitment |
| One report per member/advisory | Advisory-scoped nullifier must be unused |

## Adversaries considered

- An outsider without an admitted credential.
- A member attempting to invent inventory after learning the policy.
- A caller using the wrong registrar or certifier secret.
- A member changing product, version, or snapshot salt after certification.
- A member replaying the same advisory report.

The generated-circuit test exercises each of these negative paths against the compiler-generated contract implementation.

## Explicit non-goals

- The demo does not prove that a real scanner measured a real host.
- It does not provide hardware-backed device identity or remote attestation.
- It does not prove inventory completeness or absence of exposure.
- It does not prove that admitted credentials represent distinct organizations.
- It does not implement general package-manager or NVD version-range semantics.
- It does not persist browser secrets across refreshes or recover interrupted sessions.
- It does not hide that a successful reporter belongs to the small affected policy set.
- It does not provide remediation, disclosure messaging, or production key rotation.

## Demonstration trust assumptions

- The browser runtime and cryptographic randomness are trusted for the controlled demonstration.
- The connected wallet correctly balances and submits finalized Midnight Preprod transactions.
- Registrar, certifier, and member secrets share one browser process for demo convenience, despite being distinct circuit authorities.
- The XZ policy is based on the XZ project and Red Hat statements identifying release tarballs 5.6.0 and 5.6.1.

## Production work required

A production deployment needs independently operated registrar and certifier services, secure key custody, authenticated credential handoff, scanner-to-host binding, durable encrypted private state, recovery and rotation procedures, monitoring, and an audited enrollment policy.
