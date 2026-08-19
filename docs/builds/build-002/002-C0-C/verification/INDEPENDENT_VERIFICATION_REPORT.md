# BUILD 002-C0-C Independent Verification

## Scope

Verifier branch: `verify/build002-c0-c-r1-independent`  
Product candidate: `505a6ab81062d6260db66990cbf3fc17804e5fad`  
Product branch: `build/build002-c0-c-transaction-requirement-binding`

The verifier branch was created directly from the product candidate before
adding this report. No product source, migration, workflow, dependency, or
test implementation was changed.

## Blocking condition

This environment has no PostgreSQL 17 client/server, `pg_ctl`, `initdb`, or
Docker runtime, and no disposable PostgreSQL connection URL was supplied.
Consequently the required independent native gate cannot be executed:

* fresh disposable PostgreSQL 17 database;
* lexical application of all 29 migrations exactly once;
* catalog and ACL introspection;
* raw RPC, exact-address attack, concurrent-session, immutability, and
  parent-delete controls.

The existing product CI result is not substituted for this independent gate.
No sequential in-process or PGlite result is treated as PostgreSQL
multi-session evidence.

## Local checks

The candidate branch was confirmed clean at the required product SHA before
the verifier artifact was added. Existing local C0-C repository tests and
TypeScript checks may be run as regression evidence, but they do not close the
native gate above.

Observed local regression results:

* C0-C repository: 14/14 passed;
* SQL: 15/15 passed;
* model: 32/32 passed;
* application: 9/9 passed;
* TypeScript, ESLint, assurance manifest, and production build: passed;
* full Vitest: 54 files passed, 3 failed, 8 skipped; 613 passed, 9 failed,
  40 skipped. The failures are existing F7 fixture timeouts and Windows
  temporary-directory `EPERM` cleanup errors, so this verifier does not
  reinterpret that run as a product pass.

## Product immutability

`PRODUCT_DIFF_FROM_505A6AB` is `NONE` when verifier-owned files are excluded.
`main` remains `5ca44b2358e4f62abfd4de879fce2f555229b379`; PR #14 remains open
with product head `505a6ab81062d6260db66990cbf3fc17804e5fad`.

## Verdict

`BUILD002_C0_C_INDEPENDENT_VERIFICATION_BLOCKED`

The product candidate is not modified or promoted by this verifier run. A
fresh PostgreSQL 17 execution environment and a clean full-regression runtime
are required before an independent PASS/FAIL decision can be issued.
