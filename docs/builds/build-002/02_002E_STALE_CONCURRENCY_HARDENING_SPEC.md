# BUILD002 002-E — Retry-neutral stale/concurrency hardening specification R2

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R2
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_REJECTED_CANDIDATE_R1=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This document is a design-proof
candidate for later independent canonicalization. It does not authorize
implementation. Rejected R1 commit
`8ba2f7877dcfabfa471c82bfc81c12fffdf41518` is evidence only and is not in this
candidate's ancestry.

## 1. Authority and exact inherited invariant

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

The exact inherited 002-E invariant is:

```text
dependency changes
+ READY -> execution-admission races
serialize at a concrete PostgreSQL linearization point
with no partial reservation/run
```

002-E owns the material-dependency serialization protocol, transaction-bound
revalidation, and real PostgreSQL multi-session proof. It does not own retry
eligibility, provider recovery, or a stronger business/cardinality policy.

## 2. Retry neutrality and serialization result

002-E serializes each admission attempt. It does not define a permanent
cross-attempt winner key, concurrency/retry epoch, retry generation, retry
token, retry counter, retry count, or retry eligibility rule.

For a material dependency mutation `D` and an execution admission `A`, the
database MUST prove exactly one of these committed orders:

```text
D -> A
A -> D
```

`D -> A` means `A` obtains the common fence after `D` commits, observes the
changed material during post-fence transaction-bound revalidation, and rejects
if the lineage is no longer current. The rejected transaction leaves no new
authoritative reservation, consumption, provider admission, or downstream
consequence.

`A -> D` means `A` held every required material fence, revalidated currentness,
and committed the canonical D6 consumption/admission before `D` committed its
mutation. `D` does not retroactively invalidate that historical admission.
Provider invocation remains outside and after the database transaction.

Two distinct `execution_attempt_id` values are not exact duplicates. 002-E
requires a deterministic PostgreSQL order and an authority-justified result for
each; it does not independently require the second distinct attempt to fail. If
both remain admissible under canonical D5/D6 or future authorized retry
authority after serialization, 002-E does not prohibit both. If existing
authority invalidates the second, it rejects for that existing reason.

D6 exact-duplicate semantics remain unchanged:

```text
one exact reservation -> at most one successful consumption
same reservation/execution_attempt_id replay -> no second admission
```

A consumed reservation cannot be reused. A later provider attempt requires a
new exact attempt admission under canonical retry authority that is still
valid. 002-E neither grants nor withholds that authority.

```text
SERIALIZATION_ORDER_MODEL=DATABASE_VERIFIABLE_ORDER
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
NEW_PERMANENT_ATTEMPT_UNIQUENESS_CREATED=NO
002E_DEFINES_RETRY_POLICY=NO
002E_RESTRICTS_FUTURE_VALID_RETRY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
DISTINCT_ATTEMPTS_FORCED_SINGLE_WINNER_BY_002E=NO
EXACT_DUPLICATE_SINGLE_CONSUMPTION=YES
EXACT_DUPLICATE_SOURCE_AUTHORITY=D6
SEMANTIC_BINDING_IS_PERMANENT_ATTEMPT_UNIQUENESS_KEY=NO
```

## 3. Existing exact operation binding

The installed D6 definition computes `operation_binding_hash` from canonical
JSON containing:

```text
operation
operationValue
providerTargetPath
taskSpecHash
```

Thus operation/value/path and TaskSpec bindings remain exact evidence and
revalidation material, but are not a permanent cross-attempt uniqueness key.

```text
OPERATION_BINDING_INCLUDES_EXACT_VALUE=YES
OPERATION_BINDING_INCLUDES_EXACT_OPERATION=YES
OPERATION_BINDING_INCLUDES_TARGET_PATH=YES
```

## 4. Canonical material-dependency fence model

### 4.1 Fence identity

A canonical material fence is a durable PostgreSQL row identified by the exact
relational tuple:

```text
(fence_kind, identity_schema_version, canonical_scope_identity)
```

`canonical_scope_identity` is exact typed canonical `jsonb`, not a truncated or
unverified hash. A future additive table MAY use the tuple itself as its primary
key. Each `fence_kind` MUST enforce its exact allowed keys, JSON types, UUID
forms, integer forms, lowercase full-length canonical hashes where applicable,
and absence of extra keys. PostgreSQL equality on the full tuple resolves index
hash collisions by equality and therefore cannot silently alias two distinct
canonical scopes.

Hashes inside an identity are permitted only when the referenced canonical
authority already defines that complete hash as its exact identity component.
No hash of the whole fence tuple substitutes for the tuple primary key.

The following ranks and exact scope sources are the R2 conceptual contract.
Names describe current repository authority domains; they do not prescribe a
migration or RPC name.

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

The family identities at ranks 70 and 80 intentionally omit outcome
transactions. A publisher locks its shared family fence. Every admission whose
binding names that family locks the same fence. The publisher never enumerates
referencing transactions.

The universe fences at ranks 90, 100, 110, 140, and 150 cover both existing
members and phantom inserts. Locking only known member rows is insufficient.

### 4.2 Shared-fence invariant

For every material dependency `M`:

```text
intersection(AdmissionFenceSet(M), WriterFenceSet(M)) != empty
```

The common fence MUST be acquired before the writer's authoritative mutation
and before the admission's authoritative read/revalidation. A pre-fence read is
a discovery hint only.

An association writer that moves material between canonical scopes MUST lock
the association fence and every exact old/new domain fence in the same total
order. Current requirement bindings are immutable, but this rule prevents a
future mutable association from opening a discovery gap.

### 4.3 Fence-set acquisition algorithm

Every participating transaction MUST:

1. derive a candidate fence set using non-authoritative discovery reads;
2. encode every identity using its enforced exact identity schema;
3. remove exact duplicates;
4. sort the complete set by `(fence_kind_rank, canonical_scope_identity)` using
   PostgreSQL's defined canonical `jsonb` comparison for the stored identity;
5. acquire every fence row `FOR UPDATE` in that exact order;
6. rederive the exact dependency and authority set while fences are held;
7. confirm that the held fence set is complete;
8. perform all authoritative currentness revalidation;
9. acquire necessary ordinary lineage locks, mutate/admit, and commit.

If step 6 discovers any required fence not already held, the transaction MUST
roll back and restart discovery, or fail closed. It MUST NOT acquire the new
fence late. Missing fence rows MUST be created or materialized through a
deterministic upsert/lock operation in the same total order; uniqueness races
MUST resolve to the one exact tuple row before authoritative work.

```text
FENCE_ORDER_TOTAL=YES
FENCE_ORDER_DETERMINISTIC=YES
FENCE_ORDER_ACYCLIC_BY_CONSTRUCTION=YES
DYNAMIC_OUT_OF_ORDER_FENCE_ACQUISITION=NO
FENCE_IDENTITY_COLLISION_FREE=YES
```

## 5. Material dependency fence-coverage proof

`Writer fence` and `admission fence` below name the same exact row identity.
`Writer acquires` and `admission acquires` are normative R2 implementation
requirements whose feasibility is proven by the listed identity sources.

| # | Dependency class | Current mutator paths | Admission read path | Canonical fence kind/identity source | Writer acquires | Admission acquires | Multi-scope writer | Unrelated blocking | Covered |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | tenant and membership active status | tenant/membership administration, including membership revocation | D3/D4/nested D5 identity and active-state checks | `TENANT_AUTHORITY(tenant.id)` plus `MEMBERSHIP_AUTHORITY(tenant_id,membership.id)` | yes; writer knows row IDs | yes; request and canonical lineage provide both IDs | no transaction enumeration; only affected tenant/member scopes | no | yes |
| 2 | outcome transaction status and semantic fields | outcome transaction repository/RPC and canonical status transitions | D0, D3, D4, nested D5 | `OUTCOME_TRANSACTION(owner_tenant_id,id)` from the row | yes | yes | no | no | yes |
| 3 | asset current-version head | canonical asset/version commit path | D0, D3, D4, nested D5 | `ASSET_HEAD(owner_tenant_id,asset.id)` | yes; commit knows asset | yes; transaction lineage provides asset | writer also locks its transaction fence when it mutates that transaction | no | yes |
| 4 | exact source asset-version state/hash | version creation and asset-head commit; historical version is otherwise immutable | D0, D3, D4, nested D5 | `SOURCE_ASSET_VERSION(owner_tenant_id,asset_id,version.id)` plus `ASSET_HEAD` when head currentness matters | yes | yes | exact version and asset scopes sorted | no | yes |
| 5 | transaction requirement binding | `build002_bind_outcome_transaction_requirements`; immutable current row | D0, D3, D4, nested D5 | `TRANSACTION_REQUIREMENT_BINDING(owner_tenant_id,outcome_transaction_id)` | yes; RPC input has transaction | yes | association creation also locks referenced blueprint/profile family fences | no | yes |
| 6 | blueprint/profile/policy version, hash and published status | blueprint/profile publication; any future exact status writer | D0, D3, D4, nested D5 | `BLUEPRINT_FAMILY(blueprint_id)` and `REQUIREMENT_PROFILE_FAMILY(profile_id)` from binding/publication input | yes | yes | yes, but only exact shared family fences; never transaction rows | no | yes |
| 7 | signal-requirement set and hashes | D0 commit and `build002_insert_signal_requirement` | D0, D3, D4, nested D5 | `SIGNAL_REQUIREMENT_UNIVERSE(owner_tenant_id,outcome_transaction_id)` | yes; payload has both IDs | yes | no | no | yes |
| 8 | signal set, content hashes and provenance | signal capture and `build002_insert_signal` | D0, D3, D4, nested D5 | `SIGNAL_UNIVERSE(owner_tenant_id,outcome_transaction_id)` | yes; payload has both IDs | yes | no | no | yes |
| 9 | dependency snapshot and exact bindings | D0 and `build002_insert_dependency_snapshot` | D3, D4, nested D5 | requirement, signal, and `READINESS_EVALUATION_UNIVERSE(owner_tenant_id,outcome_transaction_id)` fences | yes; payload has both IDs | yes | three same-transaction universe scopes, globally sorted | no | yes |
| 10 | qualification/readiness set, evaluator identity and validity | D0, qualification/readiness RPCs, wall-clock expiry | D3, D4, nested D5 | `READINESS_EVALUATION_UNIVERSE(owner_tenant_id,outcome_transaction_id)` plus requirement/signal universes | DB writers: yes; wall clock is revalidated, not a writer | yes | no | no | yes |
| 11 | readiness authority commit | D0 authority commit | D3, D4, nested D5 | `READINESS_AUTHORITY_UNIVERSE(owner_tenant_id,outcome_transaction_id)` | yes; D0 has both IDs | yes; commit lineage yields both | no | no | yes |
| 12 | delegability admission | D3 admission | D4 and nested D5 | `DELEGABILITY_ADMISSION_SCOPE` from D3 stable retry identity fields | yes; all fields exist before insert | yes; admission row yields exact tuple | no | no | yes |
| 13 | TaskSpec and field-outcome snapshot | Field Beta/TaskSpec persistence | D4, D5, D6 reserve/consume | `TASKSPEC_FIELD_OUTCOME_UNIVERSE(owner_tenant_id,outcome_transaction_id)` | yes; rows/payload carry transaction and tenant lineage | yes | no | no | yes |
| 14 | operation/value/path intent and patch binding | partial-intent and transaction-patch persistence | D5 and D6 reserve/consume | `INTENT_PATCH_UNIVERSE(owner_tenant_id,outcome_transaction_id)` | yes; rows carry transaction lineage | yes | no | no | yes |
| 15 | ExecutionAuthority identity, validity and hash | D4 issuance; expiry is wall clock | nested D5 | `EXECUTION_AUTHORITY_SCOPE` from admission and exact TaskSpec | DB writer: yes; expiry revalidated | yes | no | no | yes |
| 16 | MutationLease identity, validity and hash | D5 issuance; expiry is wall clock | D6 reserve/consume | `MUTATION_LEASE_SCOPE` from authority, target path and category | DB writer: yes; expiry revalidated | yes | no | no | yes |
| 17 | ExecutionAttemptReservation and consumption state | D6 reserve and consume | D6 consume/provider gate | `EXECUTION_ATTEMPT_SCOPE(owner_tenant_id,mutation_lease_id)`; exact reservation/attempt remains D6 lineage | yes | yes | no | no | yes |

Wall-clock expiry is not modeled as a dependency writer. The admission compares
the authoritative database clock after fences are held. Expiry before admission
commit rejects; expiry or another material change after admission commit does
not rewrite historical order. The current evaluator identity is pinned by exact
schema/version/definition hash; any future database writer that changes an
active-evaluator selection MUST join the readiness-evaluation universe fence.

```text
MATERIAL_DEPENDENCY_CLASSES=17
MATERIAL_DEPENDENCY_CLASSES_FENCE_COVERED=17
SHARED_WRITER_TRANSACTION_ENUMERATION_REQUIRED=NO
PHANTOM_DEPENDENCY_INSERT_SERIALIZED=YES
```

## 6. Internal-lock feasibility

Canonical fences are acquired before ordinary overlapping D0-D6 locks. Once a
common fence is held by one participant, another conflicting participant
cannot enter its historically inconsistent internal lock sequence. Paths whose
fence sets are disjoint MUST NOT take overlapping material locks; an overlap
found during implementation review means a fence is missing and is a STOP.

| Path | Required fence set | Fence order | Internal locks after fences | Reverse fence order possible | Cross-scope deadlock edge |
|---|---|---|---|---|---|
| tenant/membership writer | tenant and affected membership | total order | exact authority rows | no | none; no transaction enumeration |
| outcome transaction writer | tenant, transaction | total order | transaction row | no | none |
| asset/version writer | tenant, transaction when applicable, asset, exact version | total order | transaction/asset/version rows | no | none after common scopes |
| binding writer | tenant, transaction, binding, referenced blueprint/profile families | total order | binding/catalog rows | no | none; old/new association scopes required |
| blueprint/profile writer | exact family fence(s) | total order | catalog rows | no | none; no transaction rows |
| requirement writer | tenant, transaction, requirement universe | total order | requirement rows | no | none |
| signal writer | tenant, transaction, signal universe | total order | signal rows | no | none |
| snapshot writer | tenant, transaction, requirement/signal/evaluation universes | total order | graph rows | no | none |
| qualification/readiness writer | tenant, transaction, requirement/signal/evaluation universes | total order | graph rows | no | none |
| readiness-commit writer/D0 | complete dependency set through readiness-authority universe | total order | current D0 tenant/member/transaction/asset/version/graph locks | no | none after shared fences |
| delegability-admission writer/D3 | dependency fences plus readiness/admission scopes | total order | current D3 commit/transaction/resource/graph locks | no | none after shared fences |
| TaskSpec/field-outcome writer | tenant, transaction, TaskSpec/field-outcome universe | total order | exact persistence rows | no | none |
| intent/patch writer | tenant, transaction, intent/patch universe | total order | exact persistence rows | no | none |
| ExecutionAuthority writer/D4 | dependency fences plus admission, TaskSpec and execution-authority scopes | total order | current D4 admission/transaction/commit/resource/graph/TaskSpec locks | no | none after shared fences |
| MutationLease writer/D5 | full dependency set plus authority, TaskSpec, intent/patch and lease scopes | total order | current D5 semantic-table and lineage locks | no | none after shared fences |
| D6 reservation | full D5 set plus lease and attempt scopes | total order | lease, nested D5, TaskSpec, reservation | no | none after shared fences |
| D6 consumption/admission | full D5 set plus lease and attempt scopes | total order | reservation, nested D5, TaskSpec, consumption | no | none after shared fences |

Existing broad `SHARE` table locks are legacy/supporting implementation detail,
not canonical 002-E authority. Future implementation MUST remove, narrow, or
independently justify any such lock that creates unrelated blocking or a
cross-fence wait edge. 002-E does not require serialization of unrelated tenants
or transactions.

```text
CANONICAL_FENCES_ACQUIRED_BEFORE_OVERLAPPING_INTERNAL_LOCKS=YES
REVERSE_FENCE_ORDER_POSSIBLE=NO
CANONICAL_FENCE_PROTOCOL_ACYCLIC=YES
TABLE_SHARE_LOCKS_REQUIRED_BY_002E=NO
UNRELATED_TRANSACTION_SERIALIZATION_REQUIRED=NO
```

## 7. Exact PostgreSQL linearization points

Fence acquisition orders conflicting transactions but is not by itself a
successful business linearization point because the holder may abort.

Execution admission linearizes when the canonical D6
`ReservationConsumption`/provider-admission database write commits while all
required material fences are still held. Provider invocation occurs only after
that commit and is outside PostgreSQL.

A dependency mutation linearizes when its authoritative material write commits
while its required dependency fences are held. The common fence's lock wait and
the two commit records establish a database-observable order.

```text
ADMISSION_LINEARIZATION_POINT_EXACT=YES
DEPENDENCY_MUTATION_LINEARIZATION_POINT_EXACT=YES
EXECUTION_ADMISSION_LINEARIZATION_PRECEDES_PROVIDER=YES
PROVIDER_CALL_INSIDE_DB_TRANSACTION=NO
LATER_DEPENDENCY_MUTATION_RETROACTIVELY_INVALIDATES_COMMITTED_ADMISSION=NO
SERIALIZATION_ORDER_VERIFIABLE=YES
SERIALIZATION_RESULT_AMBIGUOUS=NO
```

## 8. Transaction-bound revalidation

Pre-fence checks MAY reject early but MUST NOT authorize admission. After the
complete canonical fence set is held, the admission transaction MUST rederive
and revalidate, as applicable:

- tenant, membership, principal and active states;
- outcome transaction identity, eligible state and semantic hash;
- asset head, exact source version and source hash;
- requirement binding and exact blueprint/profile/policy material;
- exact requirement and signal universes, including phantom protection;
- dependency snapshot, qualification/readiness set, evaluator identity and
  database-clock validity;
- readiness authority commit and delegability admission lineage/currentness;
- ExecutionAuthority identity, scope, hash and validity;
- exact TaskSpec and field-outcome snapshot;
- operation, value, target path, partial intent and patch binding;
- MutationLease identity, scope, hash and validity;
- ExecutionAttemptReservation identity, hash, validity and consumption state.

Every lineage-derived identity used to select a fence MUST be reread and matched
under fences. Any changed lineage, missing fence, mismatch, staleness, expiry,
or authority failure raises and rolls back synchronously.

```text
PRE_FENCE_READ_AUTHORIZES_ADMISSION=NO
POST_FENCE_TRANSACTIONAL_REVALIDATION_REQUIRED=YES
```

## 9. No-partial-state semantics

A fully committed, immutable and reconstructable reservation without a
consumption MAY remain as `RESERVED_NOT_ADMITTED`. It is non-capability-bearing
by itself and is not a serialization success for execution admission, an
execution run, provider invocation, or provider effect. Later stale currentness
MUST prevent its consumption.

A stale, rejected, losing-to-existing-authority, constraint-failing, lock-
failing, or explicitly aborted transaction leaves zero new authoritative
reservation from that transaction, zero consumption, zero provider admission,
and zero downstream consequence. Cleanup after commit cannot substitute for
atomic rollback.

The committed D6 state
`ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN` remains valid for a crash
after consumption and before provider outcome is known. It is not a partial
database transaction, cannot be blindly replayed, and is not provider
exactly-once evidence.

```text
COMPLETE_NONWINNING_RESERVATION_ALLOWED=YES
REJECTED_TRANSACTION_PARTIAL_STATE=0
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
CONSUMED_RESERVATION_BLIND_REPLAY=REJECTED
002E_PROVIDER_RECOVERY_SCOPE=NO
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO
```

## 10. PostgreSQL 17 multi-session matrix

Canonical evidence MUST use PostgreSQL 17, at least two independent client
sessions, explicit synchronization barriers, final database-state assertions,
and complete transaction/client cleanup. Sleep-only ordering is insufficient.
A deadlock victim, statement timeout, test timeout, network failure, or
indeterminate result is never a deterministic serialization result.

| ID | Required schedule and assertions |
|---|---|
| E01 | **Dependency first:** writer acquires the common fence and commits; admission then revalidates changed material and rejects with `consumption=0`, `provider_admission=0`, and `downstream_consequence=0`. |
| E02 | **Admission first:** admission acquires all fences, revalidates and commits consumption; dependency writer waits and commits afterward. Prove `ADMISSION_THEN_DEPENDENCY`; admission remains historically valid without external exactly-once claim. |
| E03 | **Two distinct attempts:** two different `execution_attempt_id` values obtain a deterministic PostgreSQL order; revalidate each under D5/D6/retry authority and prove each result's authority reason. Do not assert one success merely because one was second. |
| E04 | **Exact duplicate:** replay of the same reservation/attempt produces at most one consumption under existing D6 semantics. |
| E05 | **Shared dependency:** a blueprint/profile writer races with admissions for at least two transactions; the shared family fence serializes each without enumerating transaction rows. |
| E06 | **Mutable-universe phantom:** admission derives a requirement/signal set while another session inserts a material member; the universe fence orders them and admission cannot miss an insert that committed first. |
| E07 | **Fence-order stress:** repeated sessions acquire overlapping multi-fence sets in total order; `DEADLOCKS=0`, `TIMEOUTS=0`. |
| E08 | **Revalidation rollback:** stale or existing-authority rejection after locks leaves zero authoritative transaction residue and zero consequences. |
| E09 | **Explicit abort:** abort after an internal tentative write leaves zero transaction residue. |
| E10 | **Evidence reconstruction:** prove mutation/admission commit order and reconstruct successful admission through consumption -> reservation -> D5 -> D4 -> D3 -> D0 -> exact readiness/dependency/TaskSpec/operation binding. |

```text
MULTI_SESSION_TEST_CLASSES=10
E03_SERIALIZATION_ORDER_PROVEN=YES
E03_EACH_RESULT_AUTHORITY_JUSTIFIED=YES
E03_SUCCESSFUL_ADMISSIONS_HARDCODED=NO
DEADLOCKS_REQUIRED=0
TIMEOUTS_REQUIRED=0
```

## 11. Field Beta reachability and provider boundary

The visible supported application flow creates the legacy `mutation_leases`
record but does not itself provision canonical D0-D5 lineage before the D6
`build002_mutation_leases` lookup. It also advances the transaction through
`PREPARED`, `READY`, and `EXECUTING` before D6, while installed D5 consequence-
time validation requires `PREPARED`.

This is a separate positive-reachability finding. 002-E does not repair it.
Concurrency tests MAY start from an `ALREADY_VALID_CANONICAL_D0_D6_FIXTURE`, but
the evidence MUST be labeled `CANONICAL_ADMISSION_FIXTURE_PROOF`, never
`SUPPORTED_APPLICATION_END_TO_END_REACHABILITY_PROOF`.

```text
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
```

## 12. Parent-traceable requirements

| Requirement | Normative requirement | Parent derivation |
|---|---|---|
| `002E-R01` | Establish the concrete PostgreSQL material-dependency fence protocol and exact committed admission linearization point. | concrete PostgreSQL linearization invariant |
| `002E-R02` | Every material writer and every admission depending on that material participate in at least one common canonical fence. | dependency/admission races serialize; stale invalidation |
| `002E-R03` | Acquire complete fence sets in one total deterministic order before overlapping authoritative internal locks or writes. | lock-order scope; deadlock-prone inconsistency STOP |
| `002E-R04` | Revalidate all concurrently mutable currentness material in the transaction after fences are held and before admission linearizes. | transaction-bound revalidation scope; exact-current readiness |
| `002E-R05` | A dependency mutation committed first makes a now-stale admission fail closed with zero downstream consequence. | stale execution side-effect STOP; fail-closed objective |
| `002E-R06` | Rejected, stale, losing-to-existing-authority, or aborted transactions leave no authoritative partial reservation, consumption, or run. | no partial reservation/run and rollback tests |
| `002E-R07` | Every material dependency/admission race has one database-verifiable order; 002-E creates no permanent cross-attempt uniqueness and defines no retry policy. | unverifiable-result STOP, limited to serialization scope |
| `002E-R08` | Missing-fence discovery rolls back/restarts or fails closed and never acquires a newly discovered fence late out of order. | deterministic lock order and rollback requirement |
| `002E-R09` | Prove E01-E10 using real PostgreSQL 17 independent sessions and barriers with zero deadlocks and timeouts. | E3 real PostgreSQL sessions, rollback/duplicate evaluation and independent adversarial review |
| `002E-R10` | Preserve C1 TC01-TC06, D0-D6, D5 immutability, D6 exact-attempt semantics, hash parity, ACL boundaries, and zero rejected-path consequences. | additive stop-at-first-failed-invariant governance; no regression |

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
```

## 13. Scope firewall and regression preservation

R2 does not define or authorize retry policy or count, retry epoch/generation,
provider retry orchestration, provider-result recovery, provider exactly-once,
StateCommit redesign, distributed transactions, distributed or multi-region
locks, production/staging deployment, `002-R`, D7, C2, UI, billing,
marketplace, RAG, or learning.

Future implementation MUST preserve and reprove C1 TC01-TC06; D0-D6 authority,
hash and ACL semantics; D5 immutability; exact execution-attempt lineage; one
consumption per exact reservation; blind-replay rejection; and zero consequence
for every rejected path.

## 14. Candidate STOP and success conditions

STOP implementation or verification if:

- any of the 17 material classes lacks a shared exact fence;
- a shared writer must enumerate outcome transactions;
- a phantom insert can avoid a universe fence;
- a transaction acquires a newly discovered fence late or out of total order;
- an internal overlapping lock exists without an earlier common fence;
- a canonical race deadlocks, times out, or has an ambiguous commit order;
- timestamp or an application pre-read becomes authority;
- a dependency-first stale admission reaches provider or downstream effect;
- exact-duplicate semantics are generalized into permanent distinct-attempt
  uniqueness;
- rejected/aborted work leaves authoritative partial state;
- C1/D0-D6/hash/ACL invariants regress; or
- scope enters any explicit non-goal.

This candidate's design proof establishes 17/17 feasible fence coverage and an
acyclic total fence order. It does not prove an implementation, execute E01-E10,
or authorize implementation. A separate independent
`BUILD002_002E_SPEC_R2_CANONICALIZATION_R1` is required.

```text
R1_IN_R2_ANCESTRY=NO
MATERIAL_DEPENDENCY_CLASSES=17
MATERIAL_DEPENDENCY_CLASSES_FENCE_COVERED=17
CANONICAL_FENCE_PROTOCOL_ACYCLIC=YES
002E_IMPLEMENTATION_AUTHORIZED=NO
D7_CREATED=NO
C2_CREATED=NO
002_R_IMPLEMENTATION_INSIDE_002E=NO
```
