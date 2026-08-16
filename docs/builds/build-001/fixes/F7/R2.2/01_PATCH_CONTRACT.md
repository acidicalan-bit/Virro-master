# R2.2 Patch Contract

The patch is limited to `src/assurance/development-evidence.mts`, focused assurance tests, and this documentation directory.

Required invariants:

- `ProvenanceEvaluationContext` contains no authority object or verifier callback.
- The public context is a frozen `{ contextId }` snapshot only.
- A module-private `WeakMap` maps the exact snapshot object to the private authority.
- Evaluation resolves the authority internally and fails closed for absent or caller-created contexts.
- `LocalRunnerAuthority`, its issuance records, command registry and issuance token remain private.
- R2.1 command-definition/hash binding and all existing provenance checks remain unchanged.

No cryptographic signature, infrastructure service, callback trust, application change, Supabase change, or F3-F6 work is permitted.
