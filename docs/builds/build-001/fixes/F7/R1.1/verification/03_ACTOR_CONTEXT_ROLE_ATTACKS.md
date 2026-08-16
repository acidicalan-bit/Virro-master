# BUILD 001-F7-R1.1-V - Actor, context, and role attacks

## Actor and context separation

- same actor and same context -> `NOT_PROVEN`;
- same actor and distinct contexts -> `NOT_PROVEN`;
- distinct actors and same context -> `NOT_PROVEN`.

## Missing data

Null executor/verifier bindings, actor IDs, and context IDs each produced `NOT_PROVEN`. Empty actor/context strings were rejected by the strict schema. No absence became a wildcard.

## Role typing

Executor-as-verification, verifier-as-execution, both execution, both verification, null roles, and an automated gate used for a strictly independent criterion all failed to qualify. Unknown roles were rejected by the strict schema.

## R2 boundary observed

Actor and context IDs are receipt strings, not authenticated principals or execution records. Case-variant values such as `actor:a`/`ACTOR:A` and `context:x`/`CONTEXT:X` are treated as distinct and can produce structural independence. Under the requested boundary this is `PROVENANCE_AUTHENTICITY = OPEN`, not an R1.1 failure: the evaluator never claims that either value is authenticated or that both resolve to the same external identity/context. Canonicalization and authoritative identity/context resolution belong to F7-R2.
