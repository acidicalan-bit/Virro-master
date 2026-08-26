# BUILD002 002-E — pinned-isolation concurrency hardening specification R3

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R3
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R2=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This document is a design-proof
candidate for later independent canonicalization. It does not authorize an
implementation.

R1 (`8ba2f7877dcfabfa471c82bfc81c12fffdf41518`) and R2
(`30f4da7e3bb47a6674c3ae7ed4f3d388671d2c39`) were not canonicalized, are not
ancestors of this candidate, and are evidence/findings only. This document does
not replace any canonical 002-E specification; R2 never acquired canonical
authority.

## 1. Authority, inherited invariant, and scope

Primary authority:

- path: `docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md`;
- historical commit: `2057ffeb4b63e878379da2e25c2252be2707a125`;
- Git blob: `589d406f78423367259d07dc759eb3f97fdee349`;
- raw-Git-bytes and normalized-LF SHA-256:
  `4c29606d8ba5a0b15255db1bd1340e62a35a9515f7870ffa012c9553c85c39e2`.

Supporting objective:

- path: `docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md`;
- historical commit: `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`;
- Git blob: `bfe82d08adc29b8fe032f5a39c5e24620b1257a8`;
- raw-Git-bytes and normalized-LF SHA-256:
  `b75fdee1266185cd1e7fa197ca2b9222576f3e77d0d15820e9d3f2381f5bc977`.

The inherited 002-E invariant is exactly:

```text
dependency changes
+ READY -> execution-admission races
serialize at a concrete PostgreSQL linearization point
with no partial reservation/run
```

002-E owns only BUILD002 material-currentness serialization, transaction-bound
revalidation, technical database transaction restart, and the PostgreSQL proof
of those properties. It does not own provider/business retry eligibility,
provider recovery, or a stronger attempt-cardinality rule.

## 2. Preserved retry-neutral D5/D6 semantics

For a material dependency mutation `D` and admission `A`, the database MUST
commit one of `D -> A` or `A -> D`. It MUST NOT manufacture a permanent winner
across distinct attempts.

Two distinct `execution_attempt_id` values may receive different serialization
revisions and each result remains governed by existing authority. A higher
revision is neither invalidity nor permission. An exact duplicate remains the
same reservation/attempt replay and D6 permits at most one consumption.

The installed exact operation binding remains canonical JSON over:

```text
operation
operationValue
providerTargetPath
taskSpecHash
```

```text
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
NEW_PERMANENT_ATTEMPT_UNIQUENESS_CREATED=NO
002E_DEFINES_RETRY_POLICY=NO
002E_RESTRICTS_FUTURE_VALID_RETRY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
DISTINCT_ATTEMPTS_FORCED_SINGLE_WINNER_BY_002E=NO
EXACT_DUPLICATE_SINGLE_CONSUMPTION=YES
OPERATION_BINDING_INCLUDES_EXACT_VALUE=YES
SERIALIZATION_REVISION_IS_UNIQUENESS_PERMISSION=NO
SERIALIZATION_REVISION_IS_RETRY_PERMISSION=NO
```

## 3. Canonical isolation and visibility contract

### 3.1 One repository-controlled level

Every participating 002-E operation uses PostgreSQL `READ COMMITTED`. This is a
protocol requirement, not an environmental assumption. Database, role,
session, pooler, or deployment defaults cannot establish the claim.

For every PostgREST/Supabase participating RPC, the future repository migration
MUST attach the supported PostgREST request-transaction function setting
materially equivalent to:

```sql
SET default_transaction_isolation = 'read committed'
```

This requirement relies specifically on the PostgREST function transaction
contract. It does not claim that an ordinary PostgreSQL `CREATE FUNCTION ...
SET` statement changes an arbitrary transaction that has already started.

The first database-state assertion in every participating admission RPC MUST
be:

```sql
current_setting('transaction_isolation') = 'read committed'
```

Only argument shape checks that read no authority may precede it. A mismatch
raises/fails closed before discovery, fence bootstrap/acquisition, reservation,
consumption, admission evidence, or other authoritative mutation.

Direct/native PostgreSQL callers and E3 sessions MUST explicitly begin with
`BEGIN ISOLATION LEVEL READ COMMITTED`, or prove an independently equivalent
connection contract, and MUST pass the same runtime assertion.

Under `READ COMMITTED`, discovery reads are hints. After a conflicting writer
commits and releases a fence, the authoritative statements executed by the
waiting transaction obtain new statement snapshots. Therefore all 17 classes
are reread after all fences are held; no pre-fence value can authorize.

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
ISOLATION_ENVIRONMENTAL_ASSUMPTION_ALLOWED=NO
POSTGREST_RPC_READ_COMMITTED_PIN_REQUIRED=YES
RPC_RUNTIME_ISOLATION_GUARD=YES
WRONG_ISOLATION_RESULT=REJECT_BEFORE_AUTHORITATIVE_MUTATION
DIRECT_POSTGRES_ISOLATION_EXPLICIT=YES
NATIVE_TEST_ISOLATION_ASSERTED=YES
VISIBILITY_CONTRACT_PROVEN=YES
```

### 3.2 Technical restart is not provider/business retry

If an admission database transaction receives SQLSTATE `40001` before any
committed admission or provider effect, the entire database admission operation
rolls back and starts again at fresh discovery. It cannot reuse its prior fence
set, snapshot, revalidation, locks, or tentative evidence.

A technical restart may reuse the same logical exact execution attempt only if
existing D6 authority permits it and no consumption committed. This
specification defines neither retry count nor eligibility. Provider invocation
occurs only after a committed D6 admission response, so it is never inside the
restarted transaction.

SQLSTATE `40P01`, lock timeout, and statement timeout are failures, not
successful losers and not evidence that the graph is valid. Verification
requires zero occurrences; automatic retry cannot turn one into success.

```text
SERIALIZATION_FAILURE_FULL_RESTART=YES
SERIALIZATION_FAILURE_RESUME_ALLOWED=NO
RESTART_REUSES_STALE_DISCOVERY=NO
DEADLOCK_AUTOREPAIR_COUNTS_AS_SUCCESS=NO
TIMEOUT_AUTOREPAIR_COUNTS_AS_SUCCESS=NO
```

## 4. Canonical material fence and non-authority evidence

### 4.1 Exact fence row

The future narrow `CanonicalMaterialFence` concept is a durable row keyed by:

```text
(fence_kind, identity_schema_version, canonical_scope_identity)
```

`canonical_scope_identity` is exact typed canonical `jsonb`, not a truncated
or caller-trusted hash. Each kind enforces its exact keys, JSON types, UUID and
integer forms, full lowercase canonical hashes where applicable, and absence of
extra keys. Hashes are identity components only where existing authority
already defines that full hash as exact identity.

Each row contains at least two independent, nonnegative transactional counters:

- `material_revision`: changes only when authoritative material represented by
  that fence changes;
- `serialization_revision`: changes for each committed material mutation or
  admission decision serialized on that fence.

Neither counter is authority or a capability.

### 4.2 Transactional mutation protocol

A material writer MUST, in one transaction:

1. pass the isolation guard;
2. discover and acquire its complete exact fence set in total order;
3. rederive/revalidate under the held fences;
4. increment `material_revision` on every fence whose represented material it
   changes;
5. increment `serialization_revision` on every required common ordering fence;
6. perform the authoritative material mutation;
7. append one `MaterialFenceMutationEvidence` row per advanced ordering fence;
8. commit all changes atomically.

Rollback removes the revision increments, mutation, and evidence together. A
PostgreSQL sequence is forbidden as commit-order proof because sequence values
can survive rollback.

Mutation evidence binds the exact fence identity, prior/new material revision,
assigned serialization revision, mutation kind, exact canonical resource or
mutation identity, and existing authority lineage where applicable. It is not
a generic event bus, audit platform, or capability.

### 4.3 Transactional admission-decision protocol

While all required fences remain held, an admission decision increments each
required fence's `serialization_revision` exactly once and appends an
`ExecutionAdmissionSerializationEvidence` row for each fence. Each row binds:

- exact fence identity;
- observed `material_revision` and assigned `serialization_revision`;
- expected/historical material lineage used by the currentness comparison;
- decision `ADMITTED` or `REJECTED_STALE` and exact non-authoritative reason;
- `execution_attempt_id`, `reservation_id`, MutationLease,
  ExecutionAuthority, TaskSpec hash, and exact operation binding where
  applicable;
- one decision-group identity shared by all fence rows for that decision.

For `ADMITTED`, evidence and canonical D6 consumption/admission commit in the
same transaction. For a durably recorded `REJECTED_STALE`, the protected RPC
returns a structured rejected result so the request transaction may commit only
the revision/evidence rows; it creates no reservation, consumption, execution
admission, provider effect, run, or StateCommit. Raising an exception after the
insert would roll the evidence back and is not the durable-rejection path.
Unexpected aborts may leave no rejection evidence; only committed decisions are
required to be reconstructable.

Evidence can explain a decision but can never grant execution, retry,
readiness, or authority.

```text
MATERIAL_FENCE_HAS_MATERIAL_REVISION=YES
MATERIAL_FENCE_HAS_SERIALIZATION_REVISION=YES
MATERIAL_REVISION_INCREMENT_ATOMIC_WITH_MUTATION=YES
SERIALIZATION_REVISION_MONOTONIC_PER_FENCE=YES
SERIALIZATION_REVISION_TRANSACTIONAL=YES
MUTATION_EVIDENCE_IS_CAPABILITY=NO
ADMISSION_EVIDENCE_IS_CAPABILITY=NO
REJECTION_EVIDENCE_COUNTS_AS_AUTHORITY_STATE=NO
```

### 4.4 Exact durable reconstruction algorithm

E10 reconstructs order using only committed BUILD002 fence/evidence and
canonical D6 rows:

1. Resolve the exact decision/mutation identities and their evidence groups.
2. Intersect their exact fence primary keys; at least one common key is required
   for a material dependency/admission race.
3. On each common fence compare `serialization_revision`. The lower committed
   value is earlier. All common fences MUST agree or verification fails.
4. For mutation evidence verify `previous_material_revision ->
   new_material_revision`, the matching committed material mutation, and the
   fence's continuous evidence lineage.
5. For admission evidence verify its observed material revision and exact
   lineage. For `ADMITTED`, also traverse consumption -> reservation -> D5 ->
   D4 -> D3 -> D0 -> readiness/dependency/TaskSpec/operation binding. For
   `REJECTED_STALE`, verify zero authoritative/downstream rows from that
   decision.

`D -> A`: mutation evidence records `r -> r+1` at `sD`; the later rejected
decision observes `r+1` at `sA`, and `sD < sA` on a common fence.

`A -> D`: admitted evidence observes `r` and commits D6 consumption at `sA`;
the later mutation records `r -> r+1` at `sD`, and `sA < sD`. The later change
does not retroactively invalidate the historical admission.

The proof does not consult timestamps, `pg_xact_commit_timestamp`, WAL, lock
wait state, barriers, sleeps, test logs, or external logs.

```text
DEPENDENCY_FIRST_ORDER_DURABLY_RECONSTRUCTABLE=YES
ADMISSION_FIRST_ORDER_DURABLY_RECONSTRUCTABLE=YES
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES
TRACK_COMMIT_TIMESTAMP_REQUIRED=NO
WALL_CLOCK_ORDER_REQUIRED=NO
LOCK_WAIT_HISTORY_REQUIRED=NO
```

## 5. Fence identities and total order

| Rank | Fence kind | Exact canonical scope identity |
|---:|---|---|
| 10 | `TENANT_AUTHORITY` | `{ownerTenantId}` |
| 20 | `MEMBERSHIP_AUTHORITY` | `{ownerTenantId, membershipId}` |
| 30 | `OUTCOME_TRANSACTION` | `{ownerTenantId, outcomeTransactionId}` |
| 40 | `ASSET_HEAD` | `{ownerTenantId, assetId}` |
| 50 | `SOURCE_ASSET_VERSION` | `{ownerTenantId, assetId, sourceAssetVersionId}` |
| 60 | `TRANSACTION_REQUIREMENT_BINDING` | `{ownerTenantId, outcomeTransactionId}` |
| 70 | `BLUEPRINT_FAMILY` | `{blueprintId}` |
| 80 | `REQUIREMENT_PROFILE_FAMILY` | `{requirementProfileId}` |
| 90 | `SIGNAL_REQUIREMENT_UNIVERSE` | `{ownerTenantId, outcomeTransactionId}` |
| 100 | `SIGNAL_UNIVERSE` | `{ownerTenantId, outcomeTransactionId}` |
| 110 | `READINESS_EVALUATION_UNIVERSE` | `{ownerTenantId, outcomeTransactionId}` |
| 120 | `READINESS_AUTHORITY_UNIVERSE` | `{ownerTenantId, outcomeTransactionId}` |
| 130 | `DELEGABILITY_ADMISSION_SCOPE` | `{ownerTenantId, authorityCommitId, principalId, membershipId, currentDependencySnapshotHash}` |
| 140 | `TASKSPEC_FIELD_OUTCOME_UNIVERSE` | `{ownerTenantId, outcomeTransactionId}` |
| 150 | `INTENT_PATCH_UNIVERSE` | `{ownerTenantId, outcomeTransactionId}` |
| 160 | `EXECUTION_AUTHORITY_SCOPE` | `{ownerTenantId, delegabilityAdmissionId, taskSpecId, taskSpecHash}` |
| 170 | `MUTATION_LEASE_SCOPE` | `{ownerTenantId, executionAuthorityId, targetPath, category}` |
| 180 | `EXECUTION_ATTEMPT_SCOPE` | `{ownerTenantId, mutationLeaseId}` |

The stored tuple order is `(fence_kind_rank, canonical_scope_identity)` using
the database's defined canonical `jsonb` comparison. Family ranks 70/80 omit
transactions so a publisher and every referencing admission share the same
row without transaction enumeration. Universe rows cover existing members and
phantom insertion.

```text
FENCE_IDENTITIES_TOTAL=18
FENCE_ORDER_TOTAL=YES
FENCE_ORDER_DETERMINISTIC=YES
DYNAMIC_OUT_OF_ORDER_FENCE_ACQUISITION=NO
```

## 6. Coverage of all 17 material classes

For every material dependency `M`:

```text
intersection(AdmissionFenceSet(M), WriterFenceSet(M)) != empty
```

| # | Material dependency class | Current writers | Required common fence(s) | Post-fence authoritative revalidation | Covered |
|---:|---|---|---|---|---|
| 1 | tenant/membership active state | provision/revocation paths | `TENANT_AUTHORITY`, exact `MEMBERSHIP_AUTHORITY` | tenant, member, principal, role/status | yes |
| 2 | outcome transaction state/semantic fields | transaction create/status and canonical commit | `OUTCOME_TRANSACTION` | identity, owner, eligible state, semantic hash | yes |
| 3 | asset current-version head | asset update and canonical asset/version commit | `ASSET_HEAD` | exact current head equals transaction lineage | yes |
| 4 | exact source-version state/hash | version creation and canonical commit | `SOURCE_ASSET_VERSION` plus `ASSET_HEAD` when head matters | version identity, owner, asset and canonical hash | yes |
| 5 | requirement binding | `build002_bind_outcome_transaction_requirements` | `TRANSACTION_REQUIREMENT_BINDING` | one exact immutable binding and lineage | yes |
| 6 | blueprint/profile/policy version, hash, published state | catalog publishers | `BLUEPRINT_FAMILY`, `REQUIREMENT_PROFILE_FAMILY` | exact version/hash/status and policy material | yes |
| 7 | signal-requirement set/hashes | standalone insert and D0 | `SIGNAL_REQUIREMENT_UNIVERSE` | complete exact set and hashes | yes |
| 8 | signal set/content/provenance | signal capture | `SIGNAL_UNIVERSE` | complete exact set, hashes and provenance | yes |
| 9 | dependency snapshot/bindings | standalone insert and D0 | requirement, signal, and `READINESS_EVALUATION_UNIVERSE` | exact snapshot and all bindings | yes |
| 10 | qualification/readiness/evaluator validity | standalone inserts and D0; wall-clock expiry reread | requirement, signal, and `READINESS_EVALUATION_UNIVERSE` | qualification/readiness sets, evaluator pin and DB clock | yes |
| 11 | readiness authority commit | D0 | `READINESS_AUTHORITY_UNIVERSE` | exact commit and readiness lineage | yes |
| 12 | delegability admission | D3 | `DELEGABILITY_ADMISSION_SCOPE` | D3 identity, hash and currentness | yes |
| 13 | TaskSpec/field-outcome snapshot | Field Beta persistence | `TASKSPEC_FIELD_OUTCOME_UNIVERSE` | exact TaskSpec id/version/hash and snapshot | yes |
| 14 | operation/value/path intent/patch | partial-intent and patch persistence | `INTENT_PATCH_UNIVERSE` | exact operation, value, path and cardinality | yes |
| 15 | ExecutionAuthority identity/validity/hash | D4 | `EXECUTION_AUTHORITY_SCOPE` | D4 scope, hash, validity and lineage | yes |
| 16 | MutationLease identity/validity/hash | D5 | `MUTATION_LEASE_SCOPE` | D5 scope, target/category, hash and validity | yes |
| 17 | reservation/consumption state | D6 reserve/consume | `EXECUTION_ATTEMPT_SCOPE` | exact attempt, binding, validity and consumption | yes |

Wall-clock expiry is not a material writer. It is compared to the authoritative
database clock after fences. An association moved between scopes MUST lock its
association fence and every exact old/new domain fence in total order; current
requirement bindings remain immutable.

```text
MATERIAL_DEPENDENCY_CLASSES=17
MATERIAL_DEPENDENCY_CLASSES_FENCE_COVERED=17
POST_FENCE_REVALIDATION_COVERS_ALL_17_CLASSES=YES
SHARED_WRITER_TRANSACTION_ENUMERATION_REQUIRED=NO
```

## 7. Current writer inventory: 26/26 mapped

This is the repository inventory at the pinned base. “Path” is a distinct
current mutation entry point; a single path may mutate multiple represented
rows atomically.

| ID | Current writer path | Material class(es) | Required writer fences |
|---|---|---|---|
| W01 | `provision_personal_tenant` | 1 | tenant and generated exact membership |
| W02 | `revoke_tenant_membership` | 1 | tenant and affected membership |
| W03 | `SupabaseAssetRepository.update` | 3 | tenant and asset head |
| W04 | `SupabaseAssetVersionRepository.create` | 4 | tenant, asset head, generated exact version |
| W05 | `create_tenant_asset_with_initial_version` | 3, 4 | tenant, generated asset head/version |
| W06 | `SupabaseOutcomeTransactionRepository.create` | 2–4 | tenant, generated transaction, asset head/source version |
| W07 | `SupabaseTenantCoreLineageRepository.createTransaction` | 2–4 | same exact lineage set as W06 |
| W08 | `SupabaseOutcomeTransactionRepository.updateStatus` | 2 | tenant and transaction |
| W09 | `commit_accepted_field_outcome` | 2–4 | tenant, transaction, asset head, prior/new versions |
| W10 | `build002_bind_outcome_transaction_requirements` | 5, 6 | tenant, transaction, binding, exact blueprint/profile families |
| W11 | `build002_publish_outcome_blueprint` | 6 | exact blueprint family |
| W12 | `build002_publish_outcome_requirement_profile` | 6 | exact requirement-profile family |
| W13 | `build002_insert_signal_requirement` | 7 | tenant, transaction, requirement universe |
| W14 | `build002_insert_signal` | 8 | tenant, transaction, signal universe |
| W15 | `build002_insert_dependency_snapshot` | 9 | tenant, transaction, requirement/signal/evaluation universes |
| W16 | `build002_insert_signal_qualification` | 10 | tenant, transaction, requirement/signal/evaluation universes |
| W17 | `build002_insert_delegation_readiness` | 10 | tenant, transaction, requirement/signal/evaluation universes |
| W18 | `build002_commit_readiness_authority` (D0) | 2–11 | complete dependency set through readiness-authority universe |
| W19 | `build002_admit_delegability` (D3) | 12 | dependency set plus exact admission scope |
| W20 | `SupabaseFieldBetaRepository.createOutcome` | 13 | tenant, transaction, TaskSpec/field-outcome universe |
| W21 | `SupabasePartialIntentRepository.create` | 14 | tenant, transaction, intent/patch universe |
| W22 | `SupabaseSemanticPatchRepository.create` | 14 | tenant, transaction, intent/patch universe |
| W23 | `build002_grant_execution_authority` (D4) | 15 | dependency/admission/TaskSpec set plus execution-authority scope |
| W24 | `build002_grant_mutation_lease` (D5) | 16 | full D4/semantic set plus mutation-lease scope |
| W25 | `build002_reserve_execution_attempt` (D6 reserve) | 17 | full D5 set plus execution-attempt scope |
| W26 | `build002_consume_execution_attempt_reservation` (D6 admission) | 17 | same complete set as W25 through exact attempt scope |

Generated IDs in W01/W04/W05/W06/W07/W09 are allocated before fence
materialization so the writer can lock exact identities before authoritative
insert/update. Direct application DML in these existing paths is not exempt:
future 002-E implementation must route it through protected canonical writers
or remove its write privilege. That is an implementation obligation, not an
implementation performed by this candidate.

```text
CURRENT_WRITER_PATHS_TOTAL=26
CURRENT_WRITER_PATHS_MAPPED=26
UNMAPPED_WRITER_PATHS=0
```

## 8. Phantom insertion inventory: 9/9 covered

| ID | Mutable relation/set insertion | Fence preventing an admission miss | Covered |
|---|---|---|---|
| P01 | `build002_signal_requirements` | `SIGNAL_REQUIREMENT_UNIVERSE` | yes |
| P02 | `build002_signals` | `SIGNAL_UNIVERSE` | yes |
| P03 | `build002_dependency_snapshots` | `READINESS_EVALUATION_UNIVERSE` plus requirement/signal universes | yes |
| P04 | `build002_signal_qualifications` | `READINESS_EVALUATION_UNIVERSE` | yes |
| P05 | `build002_delegation_readiness` | `READINESS_EVALUATION_UNIVERSE` | yes |
| P06 | `field_outcomes` / TaskSpec snapshots | `TASKSPEC_FIELD_OUTCOME_UNIVERSE` | yes |
| P07 | `partial_intents` | `INTENT_PATCH_UNIVERSE` | yes |
| P08 | `transaction_patches` | `INTENT_PATCH_UNIVERSE` | yes |
| P09 | `build002_execution_attempt_reservations` | `EXECUTION_ATTEMPT_SCOPE` | yes |

```text
PHANTOM_PATHS_TOTAL=9
PHANTOM_PATHS_COVERED=9
PHANTOM_INSERT_GAP=0
```

## 9. Discovery closure and fence bootstrap

Every participant performs:

1. non-authoritative discovery;
2. exact identity validation, deduplication, and complete total sort;
3. idempotent materialization of missing fence rows in that same order;
4. `FOR UPDATE` acquisition of all fence rows in that same order;
5. complete rederivation while fences are held;
6. exact comparison of rederived and held sets;
7. all 17 applicable authoritative rereads and currentness validation;
8. revision/evidence plus mutation or admission decision; commit.

If rederivation adds or changes a required identity, the transaction rolls back
and restarts from fresh discovery, or fails closed. It never late-locks the
missing fence. An exact unique conflict during bootstrap resolves to the one
exact tuple row, then locks it; multiple missing rows are attempted only in
total order. No ordinary authority/material row lock may be held before
bootstrap and fence acquisition.

```text
FENCE_ROW_CREATION_IDEMPOTENT=YES
FENCE_CREATION_CONFLICT_RESOLVES_TO_EXACT_ROW=YES
MULTI_FENCE_CREATION_OBEYS_TOTAL_ORDER=YES
FENCE_BOOTSTRAP_REVERSE_ORDER_POSSIBLE=NO
FENCE_DISCOVERY_GAP_UNCLOSED=0
```

## 10. Least-privilege fence and evidence ACL contract

Future fence and evidence tables are internal non-capability state. The
repository implementation MUST:

- use an explicit non-login owner dedicated to protected BUILD002 functions;
- revoke table and sequence privileges from `PUBLIC`, `anon`, `authenticated`,
  and `service_role`, including direct `INSERT`, `UPDATE`, and `DELETE`;
- grant no direct client DML; RLS is defense in depth and never substitutes for
  revoked table privileges;
- mutate fences/evidence only inside exact protected canonical writer/admission
  functions; and
- make evidence append-only, with no application path for update/delete.

No application-visible `acquire_fence`, `lock_fence`, `increment_fence`,
`create_arbitrary_fence`, or equivalent generic RPC may exist. Fence operations
are internal details, never standalone capabilities.

If a protected helper uses `SECURITY DEFINER`, its repository definition MUST
have an explicit trusted non-login owner, a fixed trusted `search_path` (or only
fully qualified objects), `PUBLIC EXECUTE` revoked, and execute granted only to
the minimum exact role/function that needs it. Ordinary canonical business RPCs
preserve their existing caller ACL boundary; they do not expose the helper.

Fence identity is derived server-side from revalidated canonical rows and the
fixed kind schema. Business IDs supplied to a canonical RPC are inputs to that
derivation, never caller authority to invent a fence. Every kind validates its
schema version, exact key set, types, lineage, and canonical encoding before
materialization.

Evidence tables have the same direct-write denial. Reading evidence cannot
grant execution, retry, or readiness and cannot upgrade a rejection.

```text
FENCE_DIRECT_ANON_WRITE=NO
FENCE_DIRECT_AUTHENTICATED_WRITE=NO
FENCE_DIRECT_CLIENT_WRITE=NO
APPLICATION_VISIBLE_GENERIC_FENCE_RPC=NO
FENCE_IDENTITY_CALLER_AUTHORITATIVE=NO
FENCE_IDENTITY_SERVER_VALIDATED=YES
EVIDENCE_DIRECT_CLIENT_WRITE=NO
EVIDENCE_CAN_GRANT_EXECUTION=NO
EVIDENCE_CAN_GRANT_RETRY=NO
EVIDENCE_CAN_UPGRADE_READINESS=NO
```

## 11. Closure of the eight legacy/internal wait relations

The pinned repository has five broad `SHARE` locks in D3/D4/D5 ancestry and
three more in active D5 R1. `SHARE` conflicts with the `ROW EXCLUSIVE` table
lock taken by a writer's `INSERT`/`UPDATE`/`DELETE`, even when transactions or
tenants are unrelated. None is canonical 002-E authority. R3 resolves every
relation by removing the broad lock and making both sides acquire the exact
common universe fence before row-level work.

### EDGE_ID=LW01

```text
PATH_A=build002_admit_delegability/build002_grant_execution_authority/build002_grant_mutation_lease_r0 and D6 through nested D5
LOCK_A=LOCK TABLE public.build002_signal_requirements IN SHARE MODE
PATH_B=build002_insert_signal_requirement and build002_commit_readiness_authority
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=SIGNAL_REQUIREMENT_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW02

```text
PATH_A=build002_admit_delegability/build002_grant_execution_authority/build002_grant_mutation_lease_r0 and D6 through nested D5
LOCK_A=LOCK TABLE public.build002_signals IN SHARE MODE
PATH_B=build002_insert_signal
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=SIGNAL_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW03

```text
PATH_A=build002_admit_delegability/build002_grant_execution_authority/build002_grant_mutation_lease_r0 and D6 through nested D5
LOCK_A=LOCK TABLE public.build002_dependency_snapshots IN SHARE MODE
PATH_B=build002_insert_dependency_snapshot and build002_commit_readiness_authority
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=READINESS_EVALUATION_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW04

```text
PATH_A=build002_admit_delegability/build002_grant_execution_authority/build002_grant_mutation_lease_r0 and D6 through nested D5
LOCK_A=LOCK TABLE public.build002_signal_qualifications IN SHARE MODE
PATH_B=build002_insert_signal_qualification and build002_commit_readiness_authority
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=READINESS_EVALUATION_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW05

```text
PATH_A=build002_admit_delegability/build002_grant_execution_authority/build002_grant_mutation_lease_r0 and D6 through nested D5
LOCK_A=LOCK TABLE public.build002_delegation_readiness IN SHARE MODE
PATH_B=build002_insert_delegation_readiness and build002_commit_readiness_authority
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=READINESS_EVALUATION_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW06

```text
PATH_A=build002_grant_mutation_lease R1 and D6 reserve/consume through nested D5
LOCK_A=LOCK TABLE public.field_outcomes IN SHARE MODE
PATH_B=SupabaseFieldBetaRepository.createOutcome
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=TASKSPEC_FIELD_OUTCOME_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW07

```text
PATH_A=build002_grant_mutation_lease R1 and D6 reserve/consume through nested D5
LOCK_A=LOCK TABLE public.transaction_patches IN SHARE MODE
PATH_B=SupabaseSemanticPatchRepository.create
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=INTENT_PATCH_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

### EDGE_ID=LW08

```text
PATH_A=build002_grant_mutation_lease R1 and D6 reserve/consume through nested D5
LOCK_A=LOCK TABLE public.partial_intents IN SHARE MODE
PATH_B=SupabasePartialIntentRepository.create
LOCK_B=ROW EXCLUSIVE implicit in INSERT
COMMON_CANONICAL_FENCE=INTENT_PATCH_UNIVERSE(ownerTenantId,outcomeTransactionId)
RESOLUTION=REMOVE_BROAD_LOCK
```

All eight locks are classified `REMOVABLE`; exact universe-fence serialization
provides phantom/currentness coverage without cross-scope table contention.

```text
LEGACY_WAIT_EDGES_TOTAL=8
LEGACY_WAIT_EDGES_CLOSED=8
LEGACY_WAIT_EDGES_UNCLOSED=0
UNRELATED_CROSS_FENCE_WAIT_EDGES=0
UNRELATED_TRANSACTION_SERIALIZATION_REQUIRED=NO
```

## 12. One closed global wait graph

Fence bootstrap/acquisition precedes all overlapping ordinary locks. After the
complete fence set is held, every participating writer and D0–D6 admission path
MUST acquire existing rows in this global rank, with multiple rows at one rank
sorted by exact primary key:

| Rank | Ordinary row-lock domain |
|---:|---|
| 10 | tenants |
| 20 | tenant memberships |
| 30 | outcome transactions |
| 40 | assets |
| 50 | asset versions |
| 60 | requirement bindings |
| 70 | blueprint families |
| 80 | requirement-profile families |
| 90 | signal requirements |
| 100 | signals |
| 110 | dependency snapshots |
| 120 | signal qualifications |
| 130 | delegation readiness |
| 140 | readiness authority commits |
| 150 | delegability admissions |
| 160 | field outcomes / TaskSpec snapshots |
| 170 | partial intents |
| 180 | transaction patches |
| 190 | execution authorities |
| 200 | mutation leases |
| 210 | execution-attempt reservations |
| 220 | execution-attempt consumptions |
| 230 | mutation/admission serialization evidence inserts |

Current D4/D5/D6 functions sometimes enter at admission, authority, lease, or
reservation and later lock a lower-ranked lineage row. Future 002-E
implementation MUST refactor those functions: nonlocking discovery may start
from the supplied high-level identity, but no authoritative high-rank row lock
is taken until all fences are held and lower-rank rows have been locked. Nested
D5/D6 calls cannot acquire a lower rank while retaining a higher-rank lock.

The complete designed graph is:

```text
isolation guard
  -> nonlocking discovery
  -> sorted idempotent fence bootstrap
  -> sorted fence FOR UPDATE acquisition
  -> sorted ordinary row locks (rank 10 -> 230 only)
  -> revision updates + material/admission/evidence writes
  -> commit
```

Unique-index and foreign-key waits are covered: a potentially shared key is
protected by its exact common fence; referenced lineage rows follow the same
ordinary rank; fresh evidence keys are `(exact fence, assigned transactional
serialization_revision)` and can only be assigned while holding that fence.
Direct DML and DDL are outside runtime paths and denied by the ACL contract.
Broad table locks LW01–LW08 are absent from the future canonical paths.

Thus every modeled wait edge moves forward in one order. No path may retain an
unlisted internal lock; implementation review and E07 MUST fail closed if a
trigger, constraint, helper, or extension adds an edge not represented here.

```text
CANONICAL_FENCES_ACQUIRED_BEFORE_OVERLAPPING_INTERNAL_LOCKS=YES
REVERSE_FENCE_EDGE_COUNT=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES
```

This is a design proof. PostgreSQL 17 sessions still must prove the implemented
graph with zero deadlocks and timeouts.

## 13. Exact linearization and no partial authority state

A mutation linearizes when its material revision, authoritative mutation, and
mutation evidence commit while the common fences are held. An execution
admission linearizes when its serialization evidence and canonical D6
consumption/provider-admission database state commit while every required fence
is held. Provider invocation is later and outside PostgreSQL.

A committed `REJECTED_STALE` evidence decision is non-authority state and may
survive with:

```text
reservation=0
consumption=0
execution_admission=0
provider_effect=0
run=0
StateCommit=0
downstream_consequence=0
```

Any tentative fence revision, evidence, mutation, reservation, or consumption
rolls back on explicit/unexpected abort. A complete preexisting D6 reservation
may remain `RESERVED_NOT_ADMITTED` under existing authority, but a stale
decision cannot consume it.

```text
ADMISSION_LINEARIZATION_POINT_EXACT=YES
DEPENDENCY_MUTATION_LINEARIZATION_POINT_EXACT=YES
EXECUTION_ADMISSION_LINEARIZATION_PRECEDES_PROVIDER=YES
REJECTED_TRANSACTION_AUTHORITY_PARTIAL_STATE=0
```

## 14. PostgreSQL 17 independent-session matrix

Tests use PostgreSQL 17, at least two independent native client sessions,
explicit barriers, deterministic final-state assertions, and complete cleanup.
Sleeps may aid diagnosis but cannot prove order.

| ID | Required schedule and durable assertions |
|---|---|
| E01 | **Dependency first:** D commits `r -> r+1` and mutation evidence; A then commits `REJECTED_STALE` evidence with a higher serialization revision. Reconstruct `DEPENDENCY_THEN_ADMISSION`; authority/downstream counts are zero. |
| E02 | **Admission first:** A commits serialization evidence plus D6 consumption; D waits, then commits `r -> r+1` with a higher revision. Reconstruct `ADMISSION_THEN_DEPENDENCY`; A remains historically valid. |
| E03 | **Distinct attempts:** distinct attempt IDs serialize independently; each result is justified by existing authority, with no hardcoded winner. |
| E04 | **Exact duplicate:** replay of the same reservation/attempt produces at most one D6 consumption. |
| E05 | **Shared material:** one blueprint/profile publisher races with admissions for at least two transactions; the family fence works without transaction enumeration. |
| E06 | **Phantom:** a universe member insert races with admission; revisions/evidence prove insert/read order and admission cannot miss an insert committed first. |
| E07 | **Lock-graph stress:** repeated overlapping and disjoint fence sets; deadlocks `0`, lock/statement/test timeouts `0`, unrelated cross-fence waits `0`. |
| E08 | **Stale rejection:** optional committed non-authority rejection evidence, but zero reservation/consumption/provider/run/StateCommit/downstream authority state. |
| E09 | **Explicit abort:** tentative fence revisions, evidence, mutation, reservation, and admission all roll back. |
| E10 | **Durable reconstruction:** reconstruct both orders exclusively from committed fence/evidence and canonical BUILD002 rows, never timing/log/transient state. |

Isolation negatives:

| ID | Required assertion |
|---|---|
| I01 | Canonical PostgREST/native operation under explicit `READ COMMITTED` passes the runtime guard. |
| I02 | Native invocation under `REPEATABLE READ` rejects before authoritative discovery/mutation. |
| I03 | Native invocation under `SERIALIZABLE` rejects unless a future canonical spec explicitly changes policy. |
| I04 | Inject safe pre-provider SQLSTATE `40001`; the whole operation restarts from discovery with no reused fence set or partial state. `40P01` is not normal restart success. |

ACL negatives:

- anon direct fence `INSERT` is rejected;
- authenticated direct fence `INSERT` is rejected;
- authenticated direct revision `UPDATE` is rejected;
- service-role direct fence/evidence DML is rejected;
- authenticated direct evidence `INSERT` is rejected;
- a client-supplied arbitrary fence identity is rejected; and
- a generic fence/lock RPC is absent or unreachable.

```text
MULTI_SESSION_TEST_CLASSES=10
ISOLATION_NEGATIVE_TEST_CLASSES=4
FENCE_ACL_NEGATIVE_MATRIX_REQUIRED=YES
DEADLOCKS_REQUIRED=0
TIMEOUTS_REQUIRED=0
```

## 15. Field Beta and provider boundary

The supported application flow still does not prove positive canonical D0–D6
reachability and 002-E may not repair it. Concurrency proof may start from an
`ALREADY_VALID_CANONICAL_D0_D6_FIXTURE`, labeled only
`CANONICAL_ADMISSION_FIXTURE_PROOF`.

The committed D6 state
`ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN` remains valid after a
crash between consumption and provider outcome. It cannot be blindly replayed
and proves no provider exactly-once property.

```text
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
CONSUMED_RESERVATION_BLIND_REPLAY=REJECTED
002E_PROVIDER_RECOVERY_SCOPE=NO
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO
```

## 16. Ten parent-traceable requirements

| Requirement | Normative requirement | Parent derivation |
|---|---|---|
| `002E-R01` | Concrete PostgreSQL fence plus exact committed mutation/admission linearization. | global 002-E serialization invariant |
| `002E-R02` | Every material writer and dependent admission share an exact canonical fence. | dependency/admission races serialize |
| `002E-R03` | One total fence/bootstrap order and the closed ordinary/internal wait graph. | deterministic lock order; deadlock STOP |
| `002E-R04` | Repository-pinned `READ COMMITTED`, runtime assertion, and 17/17 post-fence transaction-bound revalidation. | exact-current visibility requirement |
| `002E-R05` | Dependency-first stale admission fails closed with zero consequence. | stale side-effect STOP |
| `002E-R06` | Rejection/abort leaves no authoritative partial reservation, consumption, or run; evidence is non-capability. | no partial reservation/run |
| `002E-R07` | Durable DB-reconstructable order without permanent attempt uniqueness or retry permission. | unverifiable-result STOP limited to serialization |
| `002E-R08` | `40001` or changed discovery causes full rollback/restart from fresh discovery; never late-lock/resume. | rollback and deterministic lock-order requirement |
| `002E-R09` | PostgreSQL 17 independent sessions prove E01–E10 plus isolation/order/ACL negatives with zero deadlocks/timeouts. | E3 real-session adversarial proof |
| `002E-R10` | Preserve C1 TC01–TC06, D0–D6, D5/D6 semantics, hash parity, ACLs, exact-attempt and provider boundary. | stop-at-first-failed-invariant governance |

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
```

## 17. Scope firewall and implementation STOP

These primitives are permitted only for BUILD002 currentness serialization.
This candidate creates no generic lock service, event/audit bus, workflow
engine, retry framework, distributed lock, provider-recovery framework, or
multi-region coordinator. It does not implement migrations, fence/evidence
tables, RPC/application changes, Field Beta repair, 002-R, D7, or C2.

Implementation or verification MUST stop on any missing writer/fence, phantom
gap, late fence, wrong isolation, transient-only order proof, durable evidence
acting as authority, unclosed wait edge, deadlock/timeout, partial authority
state, retry-policy expansion, Field Beta scope entry, or C1/D0–D6/hash/ACL
regression.

```text
GENERIC_COORDINATION_PLATFORM_CREATED=NO
PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
C1_AUTHORITY_CHANGED=NO
D6_AUTHORITY_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
```

## 18. R3 design-gate result

This candidate closes the four design blockers prospectively. It remains
noncanonical until independent
`BUILD002_002E_SPEC_R3_CANONICALIZATION_R1` succeeds.

```text
ISOLATION_CONTRACT_CLOSED=YES
DURABLE_ORDER_EVIDENCE_CLOSED=YES
LEGACY_WAIT_GRAPH_CLOSED=YES
FENCE_ACL_CONTRACT_CLOSED=YES

UNMAPPED_WRITER_PATHS=0
FENCE_DISCOVERY_GAP_UNCLOSED=0
LEGACY_WAIT_EDGES_UNCLOSED=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0

BUILD002_002E_SPEC_R3_STATUS=VERIFIED_CANDIDATE
002E_IMPLEMENTATION_AUTHORIZED=NO
FINAL_VERDICT=BUILD002_002E_SPEC_R3_VERIFIED_CANDIDATE
```
