# BUILD002 002-E — Stale/concurrency hardening specification candidate

```text
BUILD=BUILD002
STAGE=002-E
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This document defines a contract for
independent canonicalization. It does not authorize implementation.

## 1. Parent authority

Primary authority:

- Path: `docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md`
- Git blob: `589d406f78423367259d07dc759eb3f97fdee349`
- Normalized-LF SHA-256: `4c29606d8ba5a0b15255db1bd1340e62a35a9515f7870ffa012c9553c85c39e2`
- Authoritative stage: `002-E Stale/concurrency hardening`

The primary authority states:

- invariant: dependency changes and `READY -> execution` races serialize at a
  concrete PostgreSQL linearization point with no partial reservation/run;
- scope: lock order, transaction-bound revalidation, and multi-session tests;
- tests: E3 real PostgreSQL sessions plus rollback and duplicate-evaluation
  tests;
- STOP: timestamp-only checks, a stale execution side effect, deadlock-prone
  inconsistent lock order, or an unverifiable winner;
- verification: independent adversarial concurrency review.

Supporting parent objective:

- Path: `docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md`
- Git blob: `bfe82d08adc29b8fe032f5a39c5e24620b1257a8`
- Normalized-LF SHA-256: `b75fdee1266185cd1e7fa197ca2b9222576f3e77d0d15820e9d3f2381f5bc977`

The supporting authority requires exact dependency/version/hash snapshots,
stale invalidation when a material dependency changes, exact
requirement/evaluator/dependency hashes, historical readiness that is not
automatically current, and fail-closed behavior with no delegation operation
for changed, expired, mismatched, missing, or otherwise stale material.

No local `D7` or `C2` alias exists. The canonical stage name is `BUILD002_002E`.
`002-R` remains a separate later stage in the primary sequence.

## 2. Exact invariant and scope

### 2.1 Invariant

For one canonical outcome transaction, every material dependency mutation and
every transition from exact current `READY` to provider admission MUST have a
single, database-observable serialization order. The winning admission MUST be
decided inside one PostgreSQL transaction after transaction-bound
revalidation, MUST leave a complete and reconstructable authority lineage, and
MUST leave no authoritative partial reservation, consumption, or run state on
a stale, losing, rejected, or aborted path.

### 2.2 In scope

- one concrete PostgreSQL linearization fence for a canonical outcome
  transaction;
- a deterministic lock order shared by admission and material dependency
  writers;
- revalidation inside the transaction that establishes the winner;
- atomic rollback of stale, losing, constraint-conflicting, lock-failing, and
  aborted admissions;
- deterministic, database-verifiable winner evidence;
- real PostgreSQL 17 multi-session tests with controlled interleavings;
- preservation of C1 TC01-TC06 and D0-D6 authority semantics.

### 2.3 Explicit exclusions

Provider redesign, provider-result recovery, StateCommit redesign,
multi-region locking, distributed consensus, global or provider exactly-once,
UI, billing, marketplace, RAG, learning, production deployment, remote staging
proof, and all `002-R` implementation are out of scope.

The existing D6 state
`ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN` remains a valid
post-consumption crash-window statement. 002-E MUST NOT relabel it as provider
success, provider failure, rollback, or exactly-once evidence.

## 3. Current transition and transaction map at the base SHA

Every `SupabaseClient.rpc` call below is an independent PostgreSQL transaction.
Every repository readback is a later statement/HTTP operation and is not part
of the write transaction. The provider call occurs after the D6 consumption
transaction and its readback have committed.

| Operation | Reads | Writes | Transaction start/end | Locks | Revalidation | Currentness inputs | Possible concurrent writers |
|---|---|---|---|---|---|---|---|
| `build002_commit_readiness_authority` | tenant, membership, outcome transaction, asset/head, source version, binding, requirement/signal graph | immutable requirements, snapshot, qualifications, readiness, authority commit | one D0 RPC; commit/rollback at RPC return | tenant/membership/transaction/asset/version rows `FOR UPDATE`; graph serialization used by D0 | submitted graph, evaluator, exact snapshot and hashes | transaction semantic hash, source version hash, requirement and signal references, evaluator, validity | membership/status changes, transaction edits, asset-head changes, new signal/requirement evaluation |
| `build002_admit_delegability` | D0 commit, transaction/resource/binding, blueprint/profile, snapshot, readiness, current signal/requirement universe | one immutable delegability admission or idempotent reuse | one D3 RPC | root rows plus commit `FOR UPDATE`; graph tables `SHARE`; snapshot/readiness `FOR SHARE` | exact current material, evaluator identity, current signal/requirement sets, READY and expiry | authority commit, dependency snapshot, evaluator, transaction/source/binding material | D0/evaluation writers, transaction/resource updates, blueprint/profile status changes |
| `build002_grant_execution_authority` | D3 admission, D0 commit, transaction/resource/binding, snapshot/readiness, TaskSpec/field outcome | one immutable ExecutionAuthority or idempotent reuse | one D4 RPC | tenant/membership/admission/transaction/commit/asset/version/binding row locks; graph tables `SHARE`; TaskSpec row `FOR SHARE` | current READY graph, exact source/transaction/binding hashes, evaluator, TaskSpec and capability hash | admission and commit lineage, dependency hash, TaskSpec, source head, expiry | D3 admission, transaction/head/binding changes, signal evaluation, TaskSpec/field-outcome writes |
| `build002_grant_mutation_lease` | D4 authority and full lineage, current graph, exact TaskSpec, intent and patch | one immutable short-lived D5 lease or exact reuse | one D5 RPC | `field_outcomes`, `transaction_patches`, `partial_intents` tables `SHARE`; tenant/membership/D4/transaction/asset/version/admission rows; graph tables `SHARE`; lineage rows `FOR SHARE` | full consequence-time graph, authority hashes, current dependency universe, TaskSpec operation/value/path, expiry | all D4 lineage plus semantic patch/value and source head | all preceding writers, semantic intent/patch writers, Field Beta outcome writers |
| application lease lookup | exact D5 lease rows filtered by identity, TaskSpec/path and `valid_until` | none | separate application read before reserve RPC | no explicit lock | TypeScript hash verification and application-clock expiry filter | D5 row and wall clock | D5 issuer; time passage |
| `build002_reserve_execution_attempt` | D5 lease, full nested D5 graph, TaskSpec, intent/patch binding, existing reservation | immutable D6 reservation, or exact idempotent reuse | one D6 reserve RPC | lease `FOR SHARE`; all nested D5 locks; TaskSpec `FOR SHARE`; existing reservation `FOR SHARE` | nested D5 consequence-time revalidation plus exact provider operation/value binding | D5 lineage, TaskSpec, operation/value/path, lease expiry | dependency writers, D5 issuer, competing reservation sessions |
| reservation readback | D6 reservation | none | separate application read after reserve commit | no explicit lock | TypeScript schema/hash/expiry and requested-lineage equality | persisted reservation | time passage; consumption append |
| `build002_consume_execution_attempt_reservation` | reservation, nested D5 graph, TaskSpec and intent/patch binding, prior consumption | immutable D6 consumption | one D6 consume RPC | reservation `FOR UPDATE`; all nested D5 locks; TaskSpec `FOR SHARE`; unique reservation/attempt constraints | exact attempt identity, reservation hash/expiry, nested D5 currentness, operation/value binding | complete reservation/D5/D4/D3/D0 lineage | material dependency writers, competing consumers |
| consumption readback and provider admission | committed consumption, then gateway lineage equality | no canonical DB write before provider; external provider may have effect | readback is separate; provider is outside PostgreSQL | no dependency lock is held during provider call | TypeScript consumption hash and attempt equality | committed consumption and execution attempt ID | dependency writers after the database winner; process crash |

The supported Field Beta path calls reserve, consume, and provider in that
order. It has one supported provider path and zero known D6 bypasses at the
base SHA. Positive provider-result recovery remains outside C1 and 002-E.

### 3.1 Base-path reachability observations

The supported application call path is fail-closed but does not itself prove a
positive canonical provider admission at the base SHA:

- `PreservationVerificationService` creates the legacy preparation
  `mutation_leases` record, while the D6 repository requires one exact current
  canonical `build002_mutation_leases` row and the visible Field Beta service
  path does not issue D0-D5 authority RPCs before that lookup;
- the service advances the outcome transaction through `PREPARED`, `READY`, and
  `EXECUTING` before invoking the D6 gateway, while the installed D5 issuer
  requires the canonical outcome transaction status to be `PREPARED` during
  consequence-time revalidation.

These observations do not weaken C1's negative safety result: absence of the
required lease or status fails closed before provider invocation. They also do
not authorize 002-E to add positive provider enablement or redesign the status
machine. The 002-E implementation/canonicalization review MUST state whether
its tested canonical admission fixture starts from already-valid D0-D6 lineage
or whether a separately authorized prerequisite closes application reachability.
It MUST NOT claim positive end-to-end provider reachability merely from the
database concurrency matrix.

## 4. Material dependency set

`MUTABLE_AFTER_INITIAL_CHECK` includes append-only changes to a set, status or
head changes, and replacement by a new exact version. Immutable historical
rows can still become non-current when their referenced current material
changes.

| Dependency | Mutable after initial check | Mutator | Current revalidation point | Transactionally bound to D6 reserve/consume now | Race window present |
|---|---|---|---|---|---|
| tenant and membership active status | yes | authority/membership administration | D3, D4, nested D5 | yes, by row locks in each D6 RPC | unproven across inconsistent lock orders |
| outcome transaction status and semantic fields | yes | outcome transaction repository/RPC | D3, D4, nested D5 | yes, by transaction row lock | yes between independent RPCs; rechecked later |
| asset current-version head | yes | canonical asset/version commit path | D3, D4, nested D5 | yes, by asset row lock | yes between independent RPCs; rechecked later |
| exact source asset-version state/hash | row intended immutable; referenced currentness may change | version creation plus asset-head writer | D3, D4, nested D5 | yes | unproven against every writer path |
| transaction requirement binding | authority row intended stable; referenced status/version may change | binding authority | D3, D4, nested D5 | yes | unproven lock-order behavior |
| blueprint/profile/policy version, hash and published status | yes by version/status transition | blueprint/profile publisher | D3, D4, nested D5 | row-share checks only | yes until common writer protocol is proven |
| signal-requirement set and hashes | yes by additive evaluation input | BUILD002 evaluation writer | D3, D4, nested D5 | graph table `SHARE` lock | deadlock/ordering proof absent |
| signal set, content hashes and provenance | yes by additive signal capture | BUILD002 signal writer | D3, D4, nested D5 | graph table `SHARE` lock | deadlock/ordering proof absent |
| dependency snapshot and exact dependency bindings | historical row immutable; new current snapshot can exist | evaluation/commit writer | D3, D4, nested D5 | exact snapshot row plus graph lock | current-snapshot election is not one global winner key |
| qualification/readiness set, evaluator identity and validity | historical rows immutable; new evaluation and time expiry change currentness | evaluator/commit writer and wall clock | D3, D4, nested D5 | exact rows and graph locks | expiry and new-evaluation interleavings require proof |
| readiness authority commit | immutable, but may cease to be current | D0 commit plus later dependency mutation | D3, D4, nested D5 | lineage row locked/read | yes between stages; later stages recheck |
| delegability admission | immutable, but its currentness can be invalidated | D3 admission plus later dependency mutation | D4 and nested D5 | row lock/read | yes between stages; later stages recheck |
| TaskSpec and field-outcome snapshot | intended immutable exact snapshot; field-outcome set can change | Field Beta/spec persistence | D4, D5, D6 reserve and consume | table/row share locks | ordering proof absent |
| operation/value/path binding in partial intent and patch | yes before authority freeze unless writer protocol blocks it | Field Beta semantic persistence | D5 and D6 reserve/consume | D5 table `SHARE` locks | ordering proof absent |
| ExecutionAuthority and its validity/hash | immutable and expiring | D4 issuer and wall clock | nested D5 | `FOR UPDATE` in nested D5 | competing authority keys are not one transaction winner |
| MutationLease and its validity/hash | immutable and expiring | D5 issuer and wall clock | D6 reserve and consume through nested D5 | yes inside each D6 RPC | reservation and consumption are separate transactions |
| ExecutionAttemptReservation and consumption state | reservation immutable/expiring; consumption append-only | D6 reserve/consume | D6 consume | reservation `FOR UPDATE` at consumption | exact duplicate consumption is closed; cross-reservation winner is not |

Material dependency groups: **17**.

## 5. Current linearization assessment

`CURRENT_LINEARIZATION_POINT=PARTIAL`.

The strongest current operation is
`build002_consume_execution_attempt_reservation`: it obtains `FOR UPDATE` on
one reservation, re-enters D5 currentness validation in the same transaction,
and inserts one uniquely constrained consumption before commit. This proves a
single consumer for one exact reservation.

It is not yet the canonical 002-E linearization point because:

1. reserve and consume are separate transactions;
2. no one lock is documented and proven as the first common fence for every
   material dependency writer and every admission path;
3. D3, D4, D5, reserve, and consume acquire shared rows in different orders;
4. uniqueness is strongest per authority/lease/reservation, not one canonical
   winner key across distinct competing attempts for the same transaction and
   exact dependency/TaskSpec/operation binding;
5. the required adversarial PostgreSQL multi-session matrix does not yet exist.

Current effective orders include:

- D3: tenant -> membership -> readiness commit -> transaction -> asset ->
  version -> binding -> blueprint/profile -> graph tables;
- D4: tenant -> membership -> admission -> transaction -> readiness commit ->
  asset -> version -> binding -> graph tables -> TaskSpec;
- D5: semantic tables -> tenant -> membership -> ExecutionAuthority ->
  transaction -> asset -> version -> admission -> readiness commit -> graph
  tables -> binding/blueprint/profile -> TaskSpec -> lease;
- D6 reserve: lease -> nested D5 order -> TaskSpec -> reservation;
- D6 consume: reservation -> nested D5 order -> TaskSpec -> consumption.

These are inconsistent. The current implementation therefore cannot claim
`DEADLOCKS=0` for the canonical 002-E matrix merely from existing successful
single-path and duplicate-consumption tests.

## 6. Required race schedules

For every schedule, “no partial write” means no authoritative winning row from
the losing/rejected/aborted transaction. Complete immutable historical rows
that are explicitly non-winning MAY remain only where this specification says
so and MUST never be interpreted as execution admission.

### RACE-01 — valid readiness, dependency change, reservation

- `INITIAL_STATE`: exact READY lineage and no D6 reservation.
- `SESSION_A`: begins reservation and pauses at the canonical fence.
- `SESSION_B`: changes one exact material dependency.
- `EXPECTED_SERIALIZATION`: if B wins, A revalidates the new state and rejects
  with no reservation; if A wins, its complete reservation is bound to the
  pre-change exact state and B serializes after the recorded A state.
- `CURRENT_RESULT`: partial protection through nested D5 locks/revalidation,
  but no common first fence or multi-session proof.
- `PARTIAL_WRITE_POSSIBLE`: a complete unconsumed reservation can persist after
  a successful reserve RPC; a failed reserve RPC is transactionally rolled back.
- `STALE_EFFECT_POSSIBLE`: not proven absent for every writer interleaving.
- `WINNER_PROVABLE`: not from current state for the dependency-writer race.

### RACE-02 — reservation, dependency change, consumption

- `INITIAL_STATE`: one valid unconsumed reservation.
- `SESSION_A`: begins consumption.
- `SESSION_B`: changes one exact material dependency.
- `EXPECTED_SERIALIZATION`: B-first makes A fail with zero consumption; A-first
  creates exactly one consumption and makes A the database admission winner.
- `CURRENT_RESULT`: reservation `FOR UPDATE` and nested D5 revalidation are
  promising but lack common-writer lock-order proof.
- `PARTIAL_WRITE_POSSIBLE`: failed consumption rolls back; the earlier complete
  reservation remains non-winning historical state.
- `STALE_EFFECT_POSSIBLE`: not proven absent for every writer interleaving.
- `WINNER_PROVABLE`: yes only when one consumption exists; race order against B
  is not fully evidenced.

### RACE-03 — currentness revalidation concurrent with dependency mutation

- `INITIAL_STATE`: current exact graph.
- `SESSION_A`: acquires the admission fence and revalidates.
- `SESSION_B`: acquires the same fence before mutating the dependency.
- `EXPECTED_SERIALIZATION`: one blocks, then observes the committed winner; no
  timing-only decision.
- `CURRENT_RESULT`: overlapping row/table locks exist, but their order differs.
- `PARTIAL_WRITE_POSSIBLE`: PostgreSQL statement failure rolls back the RPC;
  deadlock victim behavior has no canonical test.
- `STALE_EFFECT_POSSIBLE`: not proven absent.
- `WINNER_PROVABLE`: no canonical winner record for this schedule.

### RACE-04 — two competing execution attempts

- `INITIAL_STATE`: one current transaction/TaskSpec/dependency binding, no
  admitted attempt.
- `SESSION_A`: creates/consumes attempt A.
- `SESSION_B`: creates/consumes distinct attempt B for the same canonical
  winner key.
- `EXPECTED_SERIALIZATION`: exactly one consumption/admission winner; the loser
  rejects and leaves no authoritative winner state.
- `CURRENT_RESULT`: one lease maps to one reservation and one reservation to one
  consumption, but distinct authority/lease chains are not proven globally
  single-winner.
- `PARTIAL_WRITE_POSSIBLE`: multiple complete reservations may be possible
  under distinct lineage keys.
- `STALE_EFFECT_POSSIBLE`: duplicate provider admission is not proven absent.
- `WINNER_PROVABLE`: partial, per reservation only.

### RACE-05 — duplicate exact reservation/admission

- `INITIAL_STATE`: one exact authority/lease/operation binding.
- `SESSION_A`: submits the exact request.
- `SESSION_B`: submits the exact duplicate.
- `EXPECTED_SERIALIZATION`: both observe one reservation identity; only one
  consumption succeeds.
- `CURRENT_RESULT`: unique lease/reservation/attempt constraints, idempotent
  reservation reuse, and atomic consumption cover major parts; concurrent
  reservation/evaluation proof remains incomplete.
- `PARTIAL_WRITE_POSSIBLE`: no duplicate row should survive.
- `STALE_EFFECT_POSSIBLE`: no for an exact duplicate only if the canonical
  multi-session proof passes.
- `WINNER_PROVABLE`: one consumption reconstructs the exact winner.

### RACE-06 — rollback after acquiring admission authority

- `INITIAL_STATE`: current lineage and no committed winner.
- `SESSION_A`: acquires all locks, passes revalidation, writes candidate winner
  state, then explicitly rolls back.
- `SESSION_B`: waits and then retries admission.
- `EXPECTED_SERIALIZATION`: A leaves no reservation/consumption winner; B may
  revalidate and win.
- `CURRENT_RESULT`: single-RPC PostgreSQL rollback is atomic, but the staged
  reserve/consume sequence has no authoritative rollback matrix.
- `PARTIAL_WRITE_POSSIBLE`: complete earlier-stage rows can remain; no winner
  row may remain from A.
- `STALE_EFFECT_POSSIBLE`: must be zero.
- `WINNER_PROVABLE`: B only if its committed consumption exists.

### RACE-07 — transaction abort after attempted partial writes

- `INITIAL_STATE`: current lineage.
- `SESSION_A`: inserts or reaches a constraint/trigger failure after internal
  work, then aborts.
- `SESSION_B`: observes canonical state after A aborts.
- `EXPECTED_SERIALIZATION`: A's transaction contributes zero authoritative
  rows and releases locks; B sees a coherent pre-A state.
- `CURRENT_RESULT`: PostgreSQL transaction semantics apply, but explicit D0-D6
  abort and readback assertions are absent for 002-E.
- `PARTIAL_WRITE_POSSIBLE`: not within one correctly scoped RPC transaction;
  multi-RPC predecessor rows are separate complete facts.
- `STALE_EFFECT_POSSIBLE`: must be zero.
- `WINNER_PROVABLE`: none for A; B is reconstructable if it commits.

### RACE-08 — inconsistent lock acquisition order

- `INITIAL_STATE`: two sessions target overlapping canonical lineage.
- `SESSION_A`: follows one current D3/D4-style order.
- `SESSION_B`: follows a current D5/D6-style reverse overlap.
- `EXPECTED_SERIALIZATION`: both use the canonical order; one waits and both
  complete/reject without deadlock or timeout.
- `CURRENT_RESULT`: inconsistent order is present in installed functions.
- `PARTIAL_WRITE_POSSIBLE`: a deadlock victim rolls back its transaction, while
  earlier independently committed stages remain.
- `STALE_EFFECT_POSSIBLE`: no safe conclusion without stress proof.
- `WINNER_PROVABLE`: no, when progress ends in an unclassified timeout/deadlock.

Required race windows: **8**. Canonically closed at the base SHA: **0**.
Existing tests provide supporting subproofs, not the complete 002-E matrix.

## 7. Timestamp and application-read classification

Current time-based checks include readiness `valid_until`, D4 validity, D5
lease validity, D6 reservation validity, D3 `revalidated_at`, application lease
lookup using `.gt(valid_until, now)`, and TypeScript readback checks using
`Date.now()`.

At the base SHA, dependency identity does not rely solely on these timestamps:
D3/D4/D5/D6 also compare exact rows, hashes, current sets, source head, TaskSpec,
operation/value, and lineage; D6 reserve/consume re-enter database D5
revalidation. Therefore `TIMESTAMP_ONLY_CURRENTNESS=NO` for the current exact
dependency decision. Application time/read-before-write checks are supporting
filters only and MUST NOT become admission authority.

002-E MUST STOP if any material dependency is accepted as current solely
because a timestamp is recent, a TTL has not elapsed, an application read was
recent, or wall-clock order appears favorable. Expiry remains an additional
fail-closed condition, not a substitute for serialization and exact hashes.

## 8. Canonical linearization and lock-order requirement

### 8.1 Linearization fence candidate

The candidate concrete fence is the canonical outcome transaction row:

```sql
select 1
from public.outcome_transactions
where owner_tenant_id = <server-derived-tenant>
  and id = <lineage-derived-transaction>
for update;
```

Every admission transaction and every writer that can change material state
for that outcome transaction MUST participate in this fence before its
authoritative read or write. Discovery reads used to derive the tenant or
transaction are non-authoritative hints and MUST be repeated or verified after
the fence is acquired.

The winner linearizes when the fenced transaction has completed all required
revalidation and performs the unique consumption/admission write. Commit makes
the winner visible; rollback produces no winner.

### 8.2 Canonical lock-order candidate

All participating paths MUST use this root-to-lineage order and MUST skip
irrelevant objects without reordering the remaining objects:

1. tenant row;
2. membership row;
3. canonical outcome transaction row — common linearization fence;
4. required mutable-universe table locks, if table locks remain necessary, in
   this exact order: `field_outcomes`, `partial_intents`,
   `transaction_patches`, `build002_signal_requirements`, `build002_signals`,
   `build002_dependency_snapshots`, `build002_signal_qualifications`,
   `build002_delegation_readiness`;
5. asset row, then exact source asset-version row;
6. transaction requirement binding, then exact blueprint/profile rows;
7. exact dependency snapshot, requirement/signal/qualification/readiness rows;
8. readiness authority commit;
9. delegability admission;
10. ExecutionAuthority;
11. exact TaskSpec/field-outcome and intent/patch rows;
12. MutationLease;
13. ExecutionAttemptReservation;
14. unique ReservationConsumption/admission write.

Reason: this follows stable ownership from tenant to transaction/resource,
freezes mutable dependency universes before lineage artifacts, and reaches the
attempt only after every parent authority is current. It removes the observed
commit/transaction, admission/transaction, authority/admission, and
reservation/authority inversions. The implementation review MUST prove that
all material writer paths either adopt this order or are immutable/non-mutating
by enforceable database contract.

No implementation may claim success while two participating paths acquire any
overlapping locks in reverse order.

## 9. Transaction-bound revalidation

Pre-transaction checks MAY reject early but MUST NOT authorize admission.

| Property | Checked before transaction now | Checked inside current reserve/consume transaction | May change concurrently | Must revalidate in winner transaction |
|---|---|---|---|---|
| tenant/membership active and exact identity | sometimes | yes through nested D5 | yes | yes |
| transaction PREPARED/eligible state and semantic hash | application context exists | yes through nested D5 | yes | yes |
| asset head and exact source-version hash | yes | yes | yes | yes |
| binding/blueprint/profile exact versions and hashes | earlier stages | yes | yes | yes |
| exact requirement and signal universe | earlier evaluation | yes | yes by appended rows | yes |
| snapshot, qualification and READY/evaluator identity | yes | yes | yes by later evaluation/expiry | yes |
| readiness authority commit lineage | yes | yes | historical row immutable, currentness changes | yes |
| delegability admission hash/currentness | yes | yes | currentness changes with dependencies | yes |
| ExecutionAuthority hash, scope and expiry | yes | yes | expiry/currentness changes | yes |
| TaskSpec/source/capability and operation/value/path | yes | yes | field/patch set may change | yes |
| MutationLease hash, scope and expiry | application lookup | yes | expiry changes | yes |
| reservation identity/hash/expiry/unconsumed state | application readback | yes at consumption | yes by consumption/expiry | yes |
| canonical winner-key vacancy | incomplete | only per existing uniqueness keys | yes by competitor | yes, with one canonical key |

The successful winner transaction MUST hold the fence and required locks until
its reservation/consumption state commits. Revalidation failure MUST raise and
roll back rather than return a partially successful object.

## 10. Rollback and no-partial-state semantics

### 10.1 Complete non-winning historical state

An immutable reservation that committed successfully but has no consumption is
a complete `RESERVED_NOT_ADMITTED` fact, not an execution winner. It MAY remain
only if it is cryptographically complete, non-capability-bearing by itself,
and impossible to consume after any material currentness failure. It MUST NOT
be reported as an execution run, provider invocation, or winner.

Preparation artifacts created before the BUILD002 authority transition — such
as project/asset/source setup, outcome transaction, intent and patch rows — are
not winner evidence. 002-E does not redesign or asynchronously clean them.

### 10.2 Forbidden partial state

The following are forbidden:

- a reservation row from an RPC that returned rejection or rolled back;
- a consumption row from a stale, losing, rejected, lock-failing, or aborted
  admission transaction;
- multiple consumption winners for one canonical winner key;
- an execution/provider admission inferred from reservation alone;
- a winner row whose D0-D6 lineage or exact dependency/TaskSpec/operation
  binding cannot be reconstructed;
- asynchronous cleanup used to make a rejected transaction appear atomic.

### 10.3 Failure behavior

| Failure | Required behavior |
|---|---|
| stale dependency | raise inside the fenced transaction; zero winner write |
| lost concurrency race | deterministic conflict/rejection after observing the winner; zero loser winner-state |
| constraint conflict | read and validate the exact committed winner only when the request is an exact duplicate; otherwise reject and roll back |
| transaction abort | all writes and capability GUCs in that transaction roll back |
| lock failure/deadlock detection | test failure and implementation STOP; never classify as a safe loser |
| revalidation failure | roll back synchronously; no cleanup queue |

`POST_CONSUMPTION_PRE_PROVIDER` process failure remains the D6
provider-outcome-unknown state. It is a committed admission winner, not a
partial database transaction and not evidence of provider exactly-once.

## 11. Winner verifiability

The canonical winner key is:

```text
owner_tenant_id
+ outcome_transaction_id
+ current_dependency_snapshot_hash
+ task_spec_hash
+ provider_target_path
+ operation_binding_hash
```

The implementation MUST enforce or otherwise prove at the linearization point
that at most one successful admission exists for this key. A retry of the
exact same attempt may observe the same immutable winner; a distinct attempt
for the same key MUST lose.

Winner evidence MUST reconstruct, using canonical database state:

```text
ReservationConsumption.execution_attempt_id
  == ExecutionAttemptReservation.execution_attempt_id
  -> MutationLease
  -> ExecutionAuthority
  -> DelegabilityAdmission
  -> ReadinessAuthorityCommit
  -> exact READY + dependency snapshot
  -> exact TaskSpec + operation/value/path binding
```

The winner is the one committed consumption/admission row for the canonical
key. A missing or ambiguous join, two winner rows, a reservation without
consumption, a timeout, or a deadlock is not a verifiable winner.

Target property:
`CONCURRENCY_WINNER_DETERMINISTIC_AND_VERIFIABLE=YES`.

At the base SHA the result is `PARTIAL`: one exact reservation has at most one
consumption, but distinct lineage chains do not yet prove one canonical winner
for the full key.

## 12. Real PostgreSQL multi-session adversarial matrix

Mocks and in-memory concurrency are supporting only. Canonical evidence MUST
run on PostgreSQL 17 with at least two independent client sessions and explicit
barriers that force the intended interleaving. Sleep-only tests are
insufficient. Every test MUST assert final database state and close all clients
and transactions.

| ID | Required interleaving and assertions |
|---|---|
| E01 | stale dependency versus reservation: each winner order, zero stale reservation on dependency-first |
| E02 | stale dependency versus consumption: dependency-first rejects with zero consumption; admission-first yields one reconstructable winner |
| E03 | simultaneous admissible distinct attempts for one canonical key: one success, one deterministic loser |
| E04 | exact duplicate attempt/reservation: stable reservation identity and at most one consumption |
| E05 | deterministic lock-order stress across all overlapping writer/admission paths; repeated rounds, `DEADLOCKS=0`, `TIMEOUTS=0` |
| E06 | loser rollback after locks and attempted write; zero loser winner-state |
| E07 | explicit transaction abort after internal write point; zero transaction residue |
| E08 | no partial reservation for rejected/stale/constraint-failing reserve paths |
| E09 | no partial consumption/admission and zero executor/provider/effect/state-commit spies for rejected/losing paths |
| E10 | reconstruct the sole winner through consumption -> reservation -> D5 -> D4 -> D3 -> D0 -> readiness/snapshot/TaskSpec and prove exact hashes |

The matrix MUST distinguish a deterministic loser from a deadlock victim,
statement timeout, test timeout, network failure, or indeterminate result.

## 13. Requirements and parent traceability

| Requirement | Normative requirement | Parent trace |
|---|---|---|
| 002E-R01 | Establish one concrete PostgreSQL linearization fence and a database-visible commit point for the admission winner. | sequence invariant: “concrete PostgreSQL linearization point” |
| 002E-R02 | Require every material dependency writer and admission path to serialize through that fence. | sequence invariant: dependency changes and READY-to-execution races serialize; recommendation stale invalidation |
| 002E-R03 | Apply one deterministic root-to-lineage-to-attempt lock order to every overlapping path. | sequence scope “lock order”; STOP inconsistent deadlock-prone order |
| 002E-R04 | Revalidate all concurrently mutable currentness material inside the transaction that writes the winner. | sequence scope “transaction-bound revalidation”; recommendation exact hashes/currentness |
| 002E-R05 | Reject dependency-first/stale schedules with zero provider admission and zero downstream consequence. | sequence STOP stale execution side effect; recommendation fail closed/no delegation |
| 002E-R06 | Leave no authoritative partial reservation, consumption, admission, or run for rejected/losing/aborted transactions. | sequence invariant no partial reservation/run; rollback tests |
| 002E-R07 | Enforce one deterministic winner for the canonical winner key and reconstruct it from canonical lineage. | sequence STOP unverifiable winner; duplicate evaluation tests |
| 002E-R08 | Roll back stale, losing, constraint-conflicting, lock-failing, revalidation-failing, and explicitly aborted transactions synchronously. | sequence rollback tests and no partial reservation/run |
| 002E-R09 | Prove E01-E10 with real PostgreSQL 17 independent sessions, `DEADLOCKS=0`, and `TIMEOUTS=0`. | sequence E3 real PostgreSQL sessions and independent adversarial review |
| 002E-R10 | Preserve C1 TC01-TC06, D0-D6 authority/hash/ACL semantics, D5 immutability, exact attempt identity, single consumption, and zero rejected-path consequences. | additive sequence and stop-at-first-failed-invariant governance; recommendation existing invariants must not regress |

Requirements: **10**. Parent-traceable: **10**. Untraceable: **0**.

## 14. Regression preservation and scope guard

Any future implementation MUST preserve and reprove:

- TC01 server-owned immutable non-capability readiness;
- TC02 exact current READY and fail-closed stale behavior;
- TC03 separate mandatory ExecutionAuthority;
- TC04 the single shared Field Beta gate with zero bypasses;
- TC05 server-owned exact execution-attempt lineage;
- TC06 zero consumption/executor/provider/effect/StateCommit for every rejected
  admission;
- D5 immutable exact mutation lease semantics and hash parity;
- D6 one consumption per exact reservation and blind-replay rejection;
- RPC/table ACLs with no ordinary-role forgery;
- all D0-D6 PostgreSQL and full regression gates.

002-E MUST NOT turn readiness, reservation, timestamps, locks, or winner
evidence into a new independent capability. It MUST NOT rewrite existing
authority history or weaken D6's explicit post-consumption unknown-outcome
state.

## 15. STOP and success criteria

### STOP

Stop implementation or verification if any of these occurs:

- a material dependency decision is timestamp-only or application-read-only;
- a stale or losing session reaches provider admission or any downstream
  consequence;
- any participating path uses a reverse overlapping lock order;
- any canonical adversarial test deadlocks or times out;
- more than one consumption winner exists for the canonical key;
- the database winner cannot be reconstructed unambiguously;
- a rejected/aborted transaction leaves authoritative partial state;
- C1 TC01-TC06, D0-D6, D5 immutability, exact lineage, hash parity, or ACLs
  regress;
- scope expands into an explicit exclusion or into `002-R`.

### Success

002-E implementation may be considered complete only when an independently
reviewed candidate proves all 002E-R01 through R10, E01 through E10 pass on
real PostgreSQL 17, `DEADLOCKS=0`, `TIMEOUTS=0`, all loser/rejection consequence
counts are zero, one winner is reconstructable from exact canonical lineage,
and all C1/D0-D6/full-regression gates remain green.

This R1 document does not satisfy those implementation gates and does not
authorize implementation. A separate independent canonicalization review is
required first.

```text
D7_CREATED=NO
C2_CREATED=NO
LOCAL_STAGE_ALIAS=NONE
002_R_IMPLEMENTATION_INSIDE_002E=NO
REMOTE_STAGING_REQUIRED_TO_AUTHOR_002E_SPEC=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
```
