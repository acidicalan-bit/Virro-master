# Global Versus Criterion Requirements

## Criterion-mapped requirements

- `EDIT_REGION_HAS_CHANGE` maps to `REQUESTED_EDIT_HAS_CHANGE`.
- `SOURCE_IMMUTABLE` and `PROVENANCE_VALID` contribute to `SOURCE_VERSION_MATCHES`.
- `SAME_TASK_SPEC` remains the policy/system gate.

## Global verifier requirements

- `DIMENSIONS_MATCH`
- `RAW_CANDIDATE_EXISTS`
- `PRESERVED_CANDIDATE_EXISTS`
- `LOCKED_OUTSIDE_EXACTLY_PRESERVED`

All seven assertions remain required for global machine status. Criterion completeness and global assertion completeness are conjunctive; criterion mapping does not substitute for global verification.
