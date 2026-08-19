# Execution Choke Point and Downstream Binding

## Choke point

The supported provider side effect is reached from
`FieldBetaService.run -> FieldBaseExperimentRunner.runExperiment ->
PreservationVerificationService.runExperiment -> executor.execute`.
The BUILD 002 gate must run immediately before `executor.execute`, after the
TaskSpec, source, transaction, authority and signal subject are fixed.

There must be one server-owned operation such as
`reserveDelegatedExecution(...)`. It performs all of the following in one
PostgreSQL transaction:

1. lock the `OutcomeTransaction` subject and material signal/dependency rows;
2. re-resolve current tenant/subject/spec identity;
3. recompute the requirement, qualification and dependency hashes;
4. require a current immutable `READY` snapshot;
5. require exact `ExecutionAuthority` and mutation-lease scope;
6. insert the readiness-execution reservation with exact IDs/hashes;
7. transition the transaction to the existing execution state;
8. commit before allowing any provider/executor call.

Any failure rolls back the reservation and produces zero executor/provider
invocations.

## Linearization

The insertion of the reservation under the subject/dependency locks is the
`READINESS_EXECUTION_LINEARIZATION_POINT`. A dependency write that obtains the
lock first commits before the reservation and causes a hash mismatch/denial. A
reservation that commits first authorizes the execution start; a later signal
change is serialized behind that point and invalidates future readiness, while
the already-authorized execution remains auditable and still requires normal
F1/F4 commit reauthorization.

Timestamps alone are not authority. A transaction-bound exact-hash compare and
row locks are mandatory. Holding a database transaction open across a provider
call is not required; the reservation is the durable decision before the side
effect.

## Binding

The minimum durable binding is an additive immutable
`readiness_execution_bindings` record (or equivalent additive columns with the
same guarantees) containing:

- binding ID and tenant root;
- `readinessId`, assessment hash and dependency hash;
- exact `OutcomeTransaction` subject ID/version;
- TaskSpec/blueprint/source hashes;
- reservation/linearization timestamp and server sequence;
- execution-run ID once the run record is created;
- no caller-provided fields.

The reservation must be created before the provider call. The subsequent
`ExecutionRun` and evidence rows reference the binding and preserve its exact
hashes. A missing, foreign, mutated or mismatched binding prevents verification
and canonical commit.

## Authority separation

The binding is evidence of crossing the readiness gate, not a capability token.
It does not grant tenant access, executor selection, Storage access, mutation
rights, OWNER status or StateCommit rights. Existing `ExecutionAuthority`,
tenant-scoped factories, F7 evidence integrity, and the F1/F4 commit RPC remain
authoritative.
