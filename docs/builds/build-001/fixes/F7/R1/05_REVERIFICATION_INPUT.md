# BUILD 001-F7-R1 - Reverification input

## Candidate relationship

Verify that the R1 result commit descends directly from:

`2b6196a382565267069f836f878a82d80df9f223`

Reject merges, rebases or product changes outside the documented diff.

## Required attacks

1. E5 unrelated workflow cannot prove E4 RLS.
2. E4 Storage cannot prove E4 RLS.
3. E3 PostgreSQL trigger cannot prove E3 HTTP authentication.
4. E5 unrelated workflow cannot prove E3 atomicity.
5. Old receipt cannot prove a changed control under the same criterion ID.
6. Old receipt cannot prove a changed boundary under the same criterion ID.
7. A claim with changed semantics and stale hash is schema-invalid.
8. Multiple weak receipts do not aggregate.
9. Incompatible FAIL returns NOT_PROVEN, not FAILED.

## Positive controls

- F1 PGlite/PostgreSQL atomic commit E3 remains PROVEN.
- F2 actual Next.js route isolation E2 remains PROVEN.
- A higher class may qualify only with explicitly accepted environment and exact subject/control/boundary.

## Commands

```text
pnpm assurance:check
pnpm test:assurance
pnpm test:sql
pnpm test:model
pnpm test:application
pnpm test:security
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Still open

Do not treat R1 as closing receipt authenticity/provenance, stale manifest `resultSha`, Windows EOL sensitivity, remote E4 gaps, CI action pinning or F3-F6. Do not return `F7_VERIFIED` from this remediation review.
