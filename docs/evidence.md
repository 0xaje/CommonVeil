# Verified Midnight Preprod evidence

This index contains the final CV-005 demonstration only. Every identifier below was returned from a transaction submitted through the connected wallet and captured by the DApp. Earlier milestone evidence remains in [status.md](status.md).

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

## CV-006 through CV-011 Operational Status

Preprod operational build with locally verified workflows; final live end-to-end policy and attestation validation remains pending network availability.

- **Automated Compact Execution Evidence**: Full end-to-end multi-role workflows and circuit execution (admission, inventory certification, policy registration, and private attestation) are tested and verified locally using authentic Compact circuit execution.
- **Prior Genuine Preprod Evidence**: The deployment, admission, certification, policy registration, and private attestation transactions listed above represent genuine finalized transactions on Midnight Preprod from milestone CV-005.
- **Pending Live Transactions**: Live on-chain execution of the multi-role split workflows (CV-008 through CV-011) remains pending until the Midnight Preprod indexer returns to availability.
- **Genuine Host Measurement**: Scanning the host machine yields `xz-utils 5.2.5`, which correctly and honestly evaluates as unaffected by `CVE-2024-3094`.
