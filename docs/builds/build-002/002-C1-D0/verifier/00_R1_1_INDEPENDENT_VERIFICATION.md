# BUILD 002-C1-D0 R1-1 Independent Verification

## Scope

This verifier branch is based directly on product SHA `0a8145abae1792d6de4c691b2e26d67883e01f53` (tree `3694338b405c15d5dab76715757817ef3b279fef`). It contains no product source, migration, existing-test, dependency, or application edits. The verifier material is isolated to `tests/verifier/`, this report, and the verifier-only workflow.

## Observed And Attacked

The application verifier independently constructs requirement, signal, dependency, qualification, and readiness objects. It exercises a valid graph and these caller-controlled compositions: readiness A with qualification B, wrong signal content hash, duplicate requirement ID, duplicate requirement hash, missing qualification, extra qualification, and stale evaluator identity. Invalid compositions are rejected before the RPC; the valid graph reaches exactly one RPC call.

The PostgreSQL verifier creates a fresh database, applies every repository migration once in lexical order, inspects the deployed RPC definition, and attacks direct marker insertion, alternate C0 requirements, qualification/signal pair binding, historical noncanonical signals, canonical extra signals, and execution/state-commit consequences. Its native job is the required evidence source for those checks.

## Result Classification

| Boundary | Classification | Evidence |
| --- | --- | --- |
| Application graph binding | PASS | 8/8 independent Vitest tests; invalid graphs make zero RPC calls. |
| Fresh PostgreSQL migration/RPC proof | NOT_PROVEN locally | No PostgreSQL 17 server is installed on the verifier host; the isolated workflow is required. |
| Two-connection signal, membership, and asset races | NOT_PROVEN | Must be established with explicit lock synchronization in PostgreSQL 17. |
| Authenticated/foreign/revoked/inactive/anon marker reads | NOT_PROVEN | Requires actual PostgreSQL roles and RLS, not policy text inspection. |
| Atomic rollback, expiry, zero-signal, and non-ready authority | NOT_PROVEN | Native execution required. |
| Product immutability | PASS | Product merge-base remains the exact candidate SHA and no product path is changed. |

## Verdict Rule

The verifier must not report `PASS` from skipped native tests. Until the PostgreSQL 17 job executes successfully and every required attack is classified from its producer output, the final status is:

`BUILD002_C1_D0_R1_1_VERIFICATION_BLOCKED`

No product repair, merge, promotion, HTTP endpoint, or C1-D1 work is performed by this branch.
