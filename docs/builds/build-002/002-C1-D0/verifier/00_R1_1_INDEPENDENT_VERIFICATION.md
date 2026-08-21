# BUILD 002-C1-D0 R1-1 Independent Verification

## Scope

This verifier branch is based directly on product SHA `0a8145abae1792d6de4c691b2e26d67883e01f53` (tree `3694338b405c15d5dab76715757817ef3b279fef`). It contains no product source, migration, existing-test, dependency, or application edits. The verifier material is isolated to `tests/verifier/`, this report, and the verifier-only workflow.

## Observed And Attacked

The application verifier independently constructs requirement, signal, dependency, qualification, and readiness objects. It exercises a valid graph and these caller-controlled compositions: readiness A with qualification B, wrong signal content hash, duplicate requirement ID, duplicate requirement hash, missing qualification, extra qualification, and stale evaluator identity. Invalid compositions are rejected before the RPC; the valid graph reaches exactly one RPC call.

The PostgreSQL verifier creates a fresh PostgreSQL 17 database, discovers and applies all 31 repository migrations once in lexical order, inspects the deployed RPC definition, and attacks direct marker insertion, every required C0 semantic field, a canonical two-requirement graph and swap, qualification/signal pair binding, historical noncanonical signals, canonical extra signals, real-role RLS visibility including a `REVOKED` tenant, zero-signal non-ready authority, a separate nonexpired READY control, expiry, execution/state-commit consequences, all six qualification/readiness link-corruption variants, a late verifier-only marker failure, and six synchronized TOCTOU races. Each D0-first race uses four genuine PostgreSQL connections (A/B/C/O), backend PIDs, `pg_blocking_pids`, `pg_stat_activity`, `pg_locks`, and bounded timeouts. The final producer run is resolved from the final verifier commit by CI metadata (`FINAL_RUN_RESOLVED_EXTERNALLY=YES`). The dynamically produced migration filename-set hash is `4dd4232bd4b1d89a269d7609a4b7e7a17283b306728c1a7e63339f2c06bd856b`.

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
| Signal change-first | PASS | Committed canonical S2 before the stale D0 candidate; RPC rejected `READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED` and marker delta was zero. |
| Signal D0-first | PASS | Observer proved `A` blocked by `C` on Asset and mutator `B` blocked by `A` on the transaction boundary; release order completed `B -> A -> C`, D0 marker committed before S2. |
| Membership revocation-first | PASS | Committed `ACTIVE -> REVOKED` before the stale D0 candidate; RPC rejected `READINESS_AUTHORITY_MEMBERSHIP_INVALID` and marker delta was zero. |
| Membership D0-first | PASS | Observer proved `A` blocked by `C` on OutcomeTransaction and revocation `B` blocked by `A` on Membership; release order completed `B -> A -> C`, marker committed before revocation. |
| Asset-head change-first | PASS | Committed head `A -> B` before the stale D0 candidate; RPC rejected `SOURCE_ASSET_HEAD_CHANGED` and marker delta was zero. |
| Asset-head D0-first | PASS | Observer proved `A` blocked by `C` on AssetVersion and head mutator `B` blocked by `A` on Asset; release order completed `B -> A -> C`, marker committed before the head change. |
| Post-commit currentness boundary | PASS | Every D0-first case records that a later Signal, Membership, or Asset mutation requires C1-D1 current-state revalidation; no permanent authority is claimed. |
| Revoked-tenant marker read | PASS | Authenticated member saw zero marker rows while tenant status was `REVOKED`; fixture restored to `ACTIVE`. |
| Separate nonexpired READY control | PASS | A readiness valid beyond the database clock produced a marker while the transaction stayed `PREPARED` and execution/state-commit writes stayed zero. |
| Qualification-link corruption | PASS | Wrong hash, missing, and extra persisted `build002_qualification_signals` links were rejected at the authority boundary; marker delta remained zero. |
| Readiness-link corruption | PASS | Wrong hash, missing, and extra persisted `build002_readiness_qualifications` links were rejected at the authority boundary; marker delta remained zero. |
| Late atomic rollback | PASS | An ephemeral `AFTER INSERT` marker trigger raised `V3A_FORCED_MARKER_FAILURE`; every graph-table primary-key/content snapshot returned unchanged with `NEW_ROW_DELTA=0`. |
| Historical-row survival | PASS | The pre-existing canonical transaction graph was byte-for-byte unchanged after the forced rollback. |
| Product immutability | PASS | Product merge-base remains the exact candidate SHA and no product path is changed. |

## Verdict Rule

The verifier must not report `PASS` for attacks that were not executed. The final PostgreSQL 17 producer job executed all six synchronized race directions and the prior V3-A controls. Qualification/readiness link corruption, late atomic rollback, and historical-row survival remain independently proven. Therefore the strict final status is:

`BUILD002_C1_D0_R1_1_VERIFIED`

No product repair, merge, promotion, HTTP endpoint, or C1-D1 work is performed by this branch.
