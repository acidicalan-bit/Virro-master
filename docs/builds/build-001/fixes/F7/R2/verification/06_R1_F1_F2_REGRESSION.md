# R1, F1, and F2 regression

## R1

R1 and R1.1 remain closed. Assurance tests continue to reject wrong subject, control, boundary, environment, criterion semantics/hash, evidence level, self-declared independence, same actor/context, missing participant fields, wrong build, and wrong spec. The R2 diff does not alter or remove the R1.1 verification commit or its documents.

## F1

`pnpm test:sql` passed 7/7 against the real local PGlite/PostgreSQL lane. Atomic commit, rollback, idempotency, stale head, outcome binding, acceptance, verification, and immutable candidate behavior remain valid. Manifest evidence remains `DECLARED_ONLY`; R2 does not promote it.

## F2

`pnpm test:application` passed 9/9 against the actual legacy precision-edit handler boundary. Authentication, tenant/resource isolation, downstream canonical reachability, and no-write behavior remain closed. Manifest evidence remains `DECLARED_ONLY`; R2 does not promote it.

`pnpm test:model` also passed 30/30 across the BUILD 001 authority, cross-tenant, and atomic failure matrices.
