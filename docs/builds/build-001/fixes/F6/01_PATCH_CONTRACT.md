# BUILD 001-F6 Patch Contract

## In scope

- Bind Precision Edit criterion evidence to the repository-authoritative verifier and policy definitions.
- Persist the binding in criterion-evidence JSONB and in verification-run details.
- Fail closed for missing, unknown, stale, or mismatched bindings.
- Preserve F1, F2, F4, F5, F7, R1 semantic admissibility, R2 provenance, R2.1 command binding, artifact/receipt integrity, and dirty-tree handling.

## Out of scope

No runtime application behavior, Supabase/RLS semantics, F3, F6 unrelated work, F7 authority redesign, E4 staging, signatures/HMAC, new infrastructure, or migration was added.

## Compatibility rule

The verifier schema keeps the new binding fields optional so old rows remain readable. Qualification requires all binding fields; an unbound legacy row is `INCOMPLETE` and must be re-verified rather than silently upgraded.
