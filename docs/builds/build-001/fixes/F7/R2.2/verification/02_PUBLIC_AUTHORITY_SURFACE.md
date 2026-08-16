# Public Authority Surface

Repository-wide export and return-path review found no public export of `LocalRunnerAuthority`, its issuance registry, command registry, private token, verifier callback, or `provenanceAuthoritiesByContext`.

Relevant classifications:

- `LocalRunnerAuthority`, `#authority`, `#records`, and the issuance token: `PRIVATE_AUTHORITY`.
- `provenanceAuthoritiesByContext`: `PRIVATE_AUTHORITY`.
- `evaluationContext()`: `SAFE_SNAPSHOT`; returns only frozen `{ contextId }`.
- `evaluateClaim(...)`: `PUBLIC_OPERATION`; it resolves authority internally and accepts no authority-bearing callback.
- command requirements: `PUBLIC_OPERATION` value data only; the registry remains private.

`assessProvenance` performs the private map lookup and fails closed with `AUTHORITATIVE_ISSUANCE_RECORD_MISSING` when the exact internally-issued object is absent. No `UNNECESSARY_EXPOSURE` was found.
