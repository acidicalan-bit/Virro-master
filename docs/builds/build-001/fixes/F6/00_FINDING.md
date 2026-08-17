# BUILD 001-F6 Finding

## Finding

Durable criterion evidence identified a verifier by display labels (`name`, `version`, and `policyVersion`) only. The qualification path did not bind those labels to the material verifier algorithm or policy mapping. A historical or caller-created record could therefore carry current-looking labels while being produced under different semantics.

## Pre-patch condition

`deriveMachineSameSpecFromDurableEvidence` checked the three labels and lineage/artifact fields, but it had no verifier-definition fingerprint or policy-definition fingerprint. `details` was not an authoritative definition source.

## Security impact

Historical evidence could acquire newer meaning without explicit re-verification. This was a semantic binding gap, separate from F7's authoritative issuance/provenance decision and from R2.1 command binding.
