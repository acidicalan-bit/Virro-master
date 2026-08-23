# Admission Artifact

`DelegabilityAdmission` is immutable, schema version
`build002-delegability-admission-v0.1`, and contains `CURRENT` plus `READY`
only. It is scoped to `DELEGABILITY_ONLY`; `executionAuthorityGranted` and
`executionStarted` are always false. Every result carries
`FRESH_SERIALIZED_RECHECK_REQUIRED_BEFORE_EXECUTION`. Denials create no row.
