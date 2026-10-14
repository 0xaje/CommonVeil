# Verified Midnight Preprod evidence

This index separates two genuine Preprod evidence sets. Do not combine their identifiers: the table below is the earlier CV-005 positive reference run, while the [2026-10-14 operational run](evidence/live-preprod-2026-10-14/README.md) used a different contract and produced an honest unaffected result.

| Operation | Finalized transaction ID |
|---|---|
| Registrar-and-certifier-bound deployment | `0044682865b940b3054c6fb1f065f4d19acc2627daa543dff4aaedbc88e8bcaf9c` |
| Opaque member admission | `00ed9c0173c6dfa599c494f5cef901ea999e034c1e0d615cf658289ff7cc8af0ec` |
| Authorized inventory certification | `00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b` |
| XZ Utils 5.6.0 policy registration | `00ddf48a2547cce14bb422981a1ebb69e7a7e94f275e2ba9b24ac6de8d555d58ea` |
| XZ Utils 5.6.1 policy registration | `00e7b17f940d9a156286ecfda8e222aa8604886774ca0c92a4f159457752591887` |
| Private certified affected-release proof | `009c158f65b339b14130f7fc41fddc1735fad1acded068fcc429e23e6ec716ad47` |

Measured public result after finalization:

- accepted reports: `1`;
- used nullifiers: `1`; and
- inventory value displayed as `Not published`.

These transactions demonstrate protocol behavior on Preprod. The controlled XZ Utils 5.6.1 input is not a claim that the test computer was exposed.

## Multi-role operational evidence — 2026-10-14

The separate Registrar, Certifier, and Member workflow was executed against contract `b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b`. The genuine host scan measured `pkg:generic/xz-utils` 5.2.5 with `live-host-scan` provenance. The Member was admitted, the snapshot was certified before policy activation, and the 5.6.0 policy was registered. The Member then verified all prerequisites and received the correct unaffected result.

No attestation transaction exists for this run: 5.2.5 is outside the registered 5.6.0 affected-release set. This is a successful negative protocol outcome, not a failed transaction. Full transaction identifiers that were not retained in the supplied evidence are explicitly marked `not captured` in the run manifest.
