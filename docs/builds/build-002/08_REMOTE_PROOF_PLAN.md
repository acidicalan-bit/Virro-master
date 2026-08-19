# BUILD 002 Remote Proof Plan

## Evidence levels

| Criterion | Minimum evidence |
| --- | --- |
| Pure qualification/state semantics | E1 deterministic domain tests |
| Authenticated API derives tenant/subject and rejects caller authority fields | E2 application/API tests |
| Persistence, FK lineage, RLS, service-role scope and lock linearization | E3 native/local multi-session PostgreSQL |
| Deployed Auth/RLS/RPC/storage and real executor non-invocation | E4 remote staging with disposable fixtures |

No E1/E2 result may satisfy an E3/E4 claim. F7 assurance metadata and
criterion-definition hashes are reused; no competing assurance framework is
introduced.

## Remote staging scenarios

1. Authenticate two disposable tenants and prove each can read only its own
   requirements, signals, qualifications and readiness.
2. Submit raw signal material; verify server-owned tenant, subject and
   provenance, and reject caller `CONFIRMED`/`READY` fields.
3. Evaluate critical missing, unknown, incompatible and contradictory signals;
   verify non-ready state and zero executor invocation.
4. Create an unchanged exact-snapshot READY path and verify one execution
   binding, one executor call and complete evidence lineage.
5. Change a dependency/source/signal after READY; verify current lookup is
   STALE/non-current and the execution gate has zero side effects.
6. Attempt foreign readiness, subject, signal, dependency and forged tenant
   identifiers; verify RLS/server denial.
7. Prove service-role repository creation always has trusted tenant scope.
8. Run a genuine two-session PostgreSQL race: session A evaluates/attempts
   reservation while session B changes a material signal/dependency. Record
   lock order, winning linearization point, committed rows and zero partial
   state for the loser.
9. Prove stale readiness cannot invoke the OpenAI or controlled executor; use a
   disposable stub/spy and no paid provider call.

Remote evidence must include authenticated principal/tenant IDs, transaction
IDs, exact hashes, SQL transaction/session identifiers, executor invocation
counter, and cleanup proof. No production credentials or external targets are
allowed.
