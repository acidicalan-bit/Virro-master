# Qualification Semantics

Qualification now performs both checks:

1. Every required criterion has exactly one compatible, lineage-bound evidence record with the complete verifier/policy binding.
2. Every required verifier assertion has exactly one executed result in that binding.

If a required assertion result is missing, malformed, duplicated, or has an unknown required set, the result is `INCOMPLETE`. If a complete authoritative result contains `passed: false`, the result is `FAILED`. Only all-global-pass plus all-criterion-pass can return `PASSED`.

Same-Spec, provenance, and independence remain separate F7 requirements. A valid TaskSpec or fingerprint cannot repair a failed or unproven global assertion.
