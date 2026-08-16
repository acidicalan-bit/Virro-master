# Authority Boundary

Design-review classification:

- `LocalRunnerAuthority`: `PRIVATE_AUTHORITY`; class and instance are not exported.
- `#authority` on `RepositoryLocalEvidenceRunner`: `PRIVATE_AUTHORITY`.
- `#records` and `provenanceAuthorityRecordToken`: `PRIVATE_AUTHORITY`.
- `provenanceAuthoritiesByContext`: `PRIVATE_AUTHORITY`; module-local `WeakMap`.
- `evaluationContext()`: `SAFE_SNAPSHOT`; returns only a frozen context ID object.
- `evaluateClaim(...)`: `PUBLIC_OPERATION`; it accepts evidence and a safe snapshot, then resolves provenance internally.
- command definitions and command requirements: existing private registry plus non-authoritative value requirements.
- authority/verifier callback in public context: removed; no public operation accepts one.

`assessProvenance` now performs a private `WeakMap` lookup. A copied context, a context with an injected `authority` property, a proxy, or a caller replacement has no map entry and produces `AUTHORITATIVE_ISSUANCE_RECORD_MISSING`.

The frozen snapshot is defense-in-depth. The primary boundary is that the authority is reachable only through the module-private map and runner private field.
