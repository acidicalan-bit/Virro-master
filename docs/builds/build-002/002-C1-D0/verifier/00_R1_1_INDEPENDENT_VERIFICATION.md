# BUILD 002-C1-D0 R1-1 Independent Verification

## Scope

This verifier branch is based directly on product SHA `0a8145abae1792d6de4c691b2e26d67883e01f53` (tree `3694338b405c15d5dab76715757817ef3b279fef`). It contains no product source, migration, existing-test, dependency, or application edits. The verifier material is isolated to `tests/verifier/`, this report, and the verifier-only workflow.

## Observed And Attacked

The application verifier independently constructs requirement, signal, dependency, qualification, and readiness objects. It exercises a valid graph and these caller-controlled compositions: readiness A with qualification B, wrong signal content hash, duplicate requirement ID, duplicate requirement hash, missing qualification, extra qualification, and stale evaluator identity. Invalid compositions are rejected before the RPC; the valid graph reaches exactly one RPC call.

The PostgreSQL verifier creates a fresh PostgreSQL 17 database, discovers and applies all 31 repository migrations once in lexical order, inspects the deployed RPC definition, and attacks direct marker insertion, every required C0 semantic field, a canonical two-requirement graph and swap, qualification/signal pair binding, historical noncanonical signals, canonical extra signals, real-role RLS visibility including a `REVOKED` tenant, zero-signal non-ready authority, a separate nonexpired READY control, expiry, and execution/state-commit consequences. The final producer run is resolved from the final verifier commit by CI metadata (`FINAL_RUN_RESOLVED_EXTERNALLY=YES`). The dynamically produced migration filename-set hash is `4dd4232bd4b1d89a269d7609a4b7e7a17283b306728c1a7e63339f2c06bd856b`.

## Result Classification

| Boundary | Classification | Evidence |
| --- | --- | --- |
| Application graph binding | PASS | 8/8 independent Vitest tests; invalid graphs make zero RPC calls. |
| Fresh PostgreSQL migration/RPC proof | PASS | PostgreSQL 17, 31 migrations applied once in lexical order; final deployed RPC contains canonical requirement-hash signal scoping. |
| Same-transaction direct marker forge | PASS | Service-role RPC in an open transaction followed by direct marker INSERT was denied by privilege. |
| C0 alternate requirement and relational pair attacks | PASS | Direct RPC rejected alternate C0 requirements and qualification/signal content-pair disagreement. |
| C0 semantic field matrix | PASS | Independently hash-valid semanticType, critical, acceptedProvenance, qualificationRule, and dependencySelectors mutations were each rejected. |
| Canonical two-requirement graph and swap | PASS | R1/R2 positive committed; a hash-valid qualification misbinding was rejected by exact binding. |
| Historical/noncanonical and canonical-extra signal attacks | PASS | Historical noncanonical signal was ignored; an extra canonical signal invalidated the stale candidate. |
| Real-role marker RLS | PASS | Active own member saw markers; foreign principal, revoked membership, and suspended tenant saw zero rows; anon was denied. |
| Zero-signal non-ready authority | PASS | Legitimate `INSUFFICIENT_SIGNAL` authority committed with zero Signals and `PREPARED` transaction. |
| Expired READY boundary | PASS | Expired readiness was rejected before authority marker creation. |
| Execution/state-commit consequences | PASS | Transaction remained `PREPARED`; mutation lease, execution run, verification run, and state-commit deltas remained zero. |
| Two-connection signal, membership, and asset races | NOT_PROVEN | Must be established with explicit lock synchronization in PostgreSQL 17. |
| Revoked-tenant marker read | PASS | Authenticated member saw zero marker rows while tenant status was `REVOKED`; fixture restored to `ACTIVE`. |
| Separate nonexpired READY control | PASS | A readiness valid beyond the database clock produced a marker while the transaction stayed `PREPARED` and execution/state-commit writes stayed zero. |
| Atomic rollback and relational link corruption | NOT_PROVEN | Native execution required. |
| Product immutability | PASS | Product merge-base remains the exact candidate SHA and no product path is changed. |

## Verdict Rule

The verifier must not report `PASS` for attacks that were not executed. The PostgreSQL 17 producer job succeeded, but the following mandatory controls remain unimplemented in this independent suite: two-direction Signal, membership, and Asset-head lock races, qualification-link/readiness-link corruption, and atomic rollback after graph staging. Therefore the strict final status is:

`BUILD002_C1_D0_R1_1_VERIFICATION_BLOCKED`

No product repair, merge, promotion, HTTP endpoint, or C1-D1 work is performed by this branch.
