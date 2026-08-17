# Mismatch and Historical Controls

Focused `criterion-machine-evidence` results: 17/17 passed.

Passed negative controls include verifier version mismatch, verifier-definition hash mismatch, policy-definition hash mismatch, unknown/caller-spoofed identifiers and hashes, missing binding, and historical label-only evidence. Each returned `INCOMPLETE`; a legitimate criterion failure remained `FAILED`.

Same-label/different-semantics fingerprints differ when the changed field is inside the material object. Different labels remain distinct because identity/version are compared independently of hashes. A public binding snapshot does not provide F7 provenance or independence.

The decisive unbound-material control is documented in `00_F6_VERIFICATION_SUMMARY.md`: four required global assertions can fail while the three mapped criteria qualify.
