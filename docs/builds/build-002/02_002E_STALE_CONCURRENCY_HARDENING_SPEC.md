# BUILD002 002-E — complete-writer and constraint-wait specification R4

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R4
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R3=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This document is a design proof
for independent canonicalization. It does not authorize implementation.

R1 (`8ba2f7877dcfabfa471c82bfc81c12fffdf41518`), R2
(`30f4da7e3bb47a6674c3ae7ed4f3d388671d2c39`), and R3
(`883edf35ce43446d4b722310421200cbc4dc070d`) were never canonical. None is an
ancestor of this candidate. They are evidence only. R4 starts directly from
canonical main commit `58e69b4d7d683412a0bfa60b5121be82d5426eaa`, tree
`a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884`.

## 1. Authority, inherited invariant, and scope

Primary authority:

- `docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md`;
- historical commit `2057ffeb4b63e878379da2e25c2252be2707a125`;
- blob `589d406f78423367259d07dc759eb3f97fdee349`;
- raw/normalized-LF SHA-256
  `4c29606d8ba5a0b15255db1bd1340e62a35a9515f7870ffa012c9553c85c39e2`.

Supporting objective:

- `docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md`;
- historical commit `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`;
- blob `bfe82d08adc29b8fe032f5a39c5e24620b1257a8`;
- raw/normalized-LF SHA-256
  `b75fdee1266185cd1e7fa197ca2b9222576f3e77d0d15820e9d3f2381f5bc977`.

The inherited 002-E invariant remains exactly:

```text
dependency changes
+ READY -> execution-admission races
serialize at a concrete PostgreSQL linearization point
with no partial reservation/run
```

002-E owns material-currentness serialization, transaction-bound revalidation,
technical database restart, and PostgreSQL proof. It does not own business or
provider retry eligibility, provider recovery, Field Beta reachability, 002-R,
D7, or C2.

## 2. Preserved isolation, retry, revision, and evidence contracts

Every participating operation uses repository-pinned PostgreSQL `READ
COMMITTED`. Every PostgREST/Supabase RPC is configured using the supported
request-transaction function setting materially equivalent to `SET
default_transaction_isolation = 'read committed'`. Its first database-state
assertion, after non-authoritative argument-shape validation only, checks
`current_setting('transaction_isolation') = 'read committed'`. Native callers
explicitly use `BEGIN ISOLATION LEVEL READ COMMITTED` and the same runtime
guard.

SQLSTATE `40001` before any committed admission/provider effect rolls back and
restarts the entire database operation from fresh discovery. No fence set,
snapshot, revalidation, lock, or tentative evidence may be resumed. SQLSTATE
`40P01`, lock timeout, or statement timeout is a failed verification, never a
successful loser.

Each material fence has independent nonnegative `material_revision` and
`serialization_revision` counters. A material writer atomically advances the
represented material revision, advances serialization revisions on its ordering
fences, performs the authoritative mutation, and appends mutation evidence.
An admission atomically advances serialization revisions and appends decision
evidence while every required fence is held; an admitted decision also commits
canonical D6 consumption/admission. Evidence and counters are neither authority
nor retry permission. PostgreSQL sequences and timestamps are not commit-order
proof.

Durable reconstruction compares serialization revisions only on exact common
fence primary keys. Every common fence must agree. Mutation evidence proves its
`previous_material_revision -> new_material_revision` transition and committed
material row; admitted evidence traverses the canonical D6-to-D0 lineage;
rejected evidence proves zero authoritative consequence. This reconstructs both
`dependency -> rejected admission` and `admission -> later dependency` from
committed canonical database state alone.

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
POSTGREST_RPC_READ_COMMITTED_PIN_REQUIRED=YES
RPC_RUNTIME_ISOLATION_GUARD=YES
DIRECT_POSTGRES_ISOLATION_EXPLICIT=YES
SERIALIZATION_FAILURE_FULL_RESTART=YES
SERIALIZATION_FAILURE_RESUME_ALLOWED=NO
MATERIAL_FENCE_HAS_MATERIAL_REVISION=YES
MATERIAL_FENCE_HAS_SERIALIZATION_REVISION=YES
MATERIAL_REVISION_INCREMENT_ATOMIC_WITH_MUTATION=YES
SERIALIZATION_REVISION_TRANSACTIONAL=YES
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES
TRACK_COMMIT_TIMESTAMP_REQUIRED=NO
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
NEW_PERMANENT_ATTEMPT_UNIQUENESS_CREATED=NO
002E_DEFINES_RETRY_POLICY=NO
002E_RESTRICTS_FUTURE_VALID_RETRY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
DISTINCT_ATTEMPTS_FORCED_SINGLE_WINNER_BY_002E=NO
EXACT_DUPLICATE_SINGLE_CONSUMPTION=YES
```

## 3. Fence identities and total order

The exact key is `(fence_kind, identity_schema_version,
canonical_scope_identity)`. Identity is typed canonical `jsonb`, validates the
exact allowed key set and types, and is derived/revalidated server-side.

| Rank | Fence kind | Exact canonical identity |
|---:|---|---|
| 5 | `PERSONAL_TENANT_OWNER_PRINCIPAL` | `{principalId}` |
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

The principal fence is a synchronization-only pre-identity contention point.
Its existence or lock proves no ownership, tenant, membership, role, status,
capability, readiness, or retry fact. It represents no existing canonical
material and therefore has no used `material_revision`; it may advance only a
transactional `serialization_revision` when needed to reconstruct W01/W02
coordination. Tenant and membership rows remain the only authority and are
reread after all fences are held.

```text
R3_FENCE_IDENTITIES_RETAINED=18
NEW_FENCE_IDENTITIES=1
FENCE_IDENTITIES_TOTAL=19
FENCE_IDENTITIES_AMBIGUOUS=0
TOTAL_CANONICAL_FENCE_KINDS=19
PERSONAL_OWNER_FENCE_PRECEDES_TENANT_FENCE=YES
PERSONAL_OWNER_FENCE_PRECEDES_MEMBERSHIP_FENCE=YES
PERSONAL_OWNER_FENCE_IDENTITY={principalId}
PERSONAL_OWNER_FENCE_IS_AUTHORITY=NO
PRINCIPAL_FENCE_EXISTENCE_PROVES_OWNERSHIP=NO
PRINCIPAL_FENCE_LOCK_PROVES_OWNERSHIP=NO
POST_FENCE_TENANT_MEMBERSHIP_REVALIDATION_REQUIRED=YES
PRINCIPAL_FENCE_MATERIAL_REVISION_USED=NO
PRINCIPAL_FENCE_FAKE_MATERIAL_AUTHORITY_CREATED=NO
```

## 4. Seventeen material classes

| # | Material class | Common fence and authoritative post-fence reread |
|---:|---|---|
| 1 | tenant/membership active state | tenant/member fences; exact tenant, principal, role, status |
| 2 | outcome transaction state/semantics | transaction fence; identity, owner, eligible state, semantic hash |
| 3 | asset current-version head | asset-head fence; exact current head and lineage |
| 4 | source version state/hash | source-version and asset-head fences; exact version/owner/hash |
| 5 | requirement binding | binding fence; exact immutable binding and lineage |
| 6 | blueprint/profile/policy version/hash/published state | family fences; exact published material |
| 7 | signal-requirement set/hashes | requirement universe; complete exact set |
| 8 | signal set/content/provenance | signal universe; complete exact set |
| 9 | dependency snapshot/bindings | requirement/signal/evaluation universes; exact snapshot and bindings |
| 10 | qualification/readiness/evaluator validity | requirement/signal/evaluation universes; exact sets, evaluator pin, DB clock |
| 11 | readiness authority commit | readiness-authority universe; exact commit and lineage |
| 12 | delegability admission | delegability scope; exact D3 identity/hash/currentness |
| 13 | TaskSpec/field-outcome snapshot | TaskSpec universe; exact id/version/hash/snapshot |
| 14 | operation/value/path intent/patch | intent universe; exact operation/value/path/cardinality |
| 15 | ExecutionAuthority | execution-authority scope; exact D4 hash/validity/lineage |
| 16 | MutationLease | lease scope; exact D5 target/category/hash/validity |
| 17 | reservation/consumption | attempt scope; exact binding/validity/consumption |

The new principal fence and W27 do not create material classes. Wall-clock
expiry remains an authoritative post-fence database-clock comparison, not a
writer.

```text
MATERIAL_DEPENDENCY_CLASSES=17
MATERIAL_DEPENDENCY_CLASSES_FENCE_COVERED=17
POST_FENCE_REVALIDATION_COVERS_ALL_17_CLASSES=YES
```

## 5. Fresh current-writer inventory: 27/27

Repository-wide SQL/RPC and application repository searches at the pinned base
produce these material mutation entry points:

| ID | Current writer | Class | Material | Future required fences |
|---|---|---|---|---|
| W01 | `provision_personal_tenant` | protected RPC | 1 | principal, candidate/existing tenant and membership |
| W02 | `revoke_tenant_membership` | protected RPC | 1 | tenant, target membership; principal too for PERSONAL OWNER |
| W03 | `SupabaseAssetRepository.update` | service-repository direct DML | 3 | tenant, asset head |
| W04 | `SupabaseAssetVersionRepository.create` | service-repository direct DML | 4 | tenant, asset head, preallocated source-version identity |
| W05 | `create_tenant_asset_with_initial_version` | protected RPC | 3, 4 | tenant, preallocated asset head/version |
| W06 | `SupabaseOutcomeTransactionRepository.create` | service-repository direct DML | 2–4 | tenant, preallocated transaction, asset head/version |
| W07 | `SupabaseTenantCoreLineageRepository.createTransaction` | service-repository direct DML | 2–4 | same exact lineage set as W06 |
| W08 | `SupabaseOutcomeTransactionRepository.updateStatus` | service-repository direct DML | 2 | tenant, transaction |
| W09 | `commit_accepted_field_outcome` | protected RPC | 2–4 | tenant, transaction, asset head, prior/new version |
| W10 | `build002_bind_outcome_transaction_requirements` | protected RPC | 5, 6 | tenant, transaction, binding, blueprint/profile families |
| W11 | `build002_publish_outcome_blueprint` | protected RPC | 6 | blueprint family |
| W12 | `build002_publish_outcome_requirement_profile` | protected RPC | 6 | profile and referenced blueprint families |
| W13 | `build002_insert_signal_requirement` | protected RPC | 7 | tenant, transaction, requirement universe |
| W14 | `build002_insert_signal` | protected RPC | 8 | tenant, transaction, requirement/signal universes |
| W15 | `build002_insert_dependency_snapshot` | protected RPC | 9 | tenant, transaction, requirement/signal/evaluation universes |
| W16 | `build002_insert_signal_qualification` | protected RPC | 10 | tenant, transaction, requirement/signal/evaluation universes |
| W17 | `build002_insert_delegation_readiness` | protected RPC | 10 | tenant, transaction, evaluation universe |
| W18 | `build002_commit_readiness_authority` | protected RPC | 2–11 | complete dependency set through readiness-authority universe |
| W19 | `build002_admit_delegability` | protected RPC | 12 | dependency set and exact admission scope |
| W20 | `SupabaseFieldBetaRepository.createOutcome` | service-repository direct DML | 13 | tenant, transaction, TaskSpec universe |
| W21 | `SupabasePartialIntentRepository.create` | service-repository direct DML | 14 | tenant, transaction, intent universe |
| W22 | `SupabaseSemanticPatchRepository.create` | service-repository direct DML | 14 | tenant, transaction, intent universe |
| W23 | `build002_grant_execution_authority` | protected RPC | 15 | dependency/TaskSpec set and execution-authority scope |
| W24 | `build002_grant_mutation_lease` | protected RPC | 16 | full D4/semantic set and mutation-lease scope |
| W25 | `build002_reserve_execution_attempt` | protected RPC | 17 | full D5 set and execution-attempt scope |
| W26 | `build002_consume_execution_attempt_reservation` | protected RPC | 17 | same exact reservation/attempt scope as W25 |
| W27 | `SupabaseAssetRepository.create` | service-repository direct DML | 3 | tenant and preallocated asset head; project parent key lock |

Classification:

```text
PROTECTED_RPC=W01,W02,W05,W09,W10,W11,W12,W13,W14,W15,W16,W17,W18,W19,W23,W24,W25,W26
SERVICE_REPOSITORY_DIRECT_DML=W03,W04,W06,W07,W08,W20,W21,W22,W27
OTHER=NONE
UNMAPPED_SERVICE_REPOSITORY_DIRECT_DML=NONE
CURRENT_WRITER_PATHS_TOTAL=27
CURRENT_WRITER_PATHS_MAPPED=27
UNMAPPED_WRITER_PATHS=0
```

W27 is reachable through exactly these current application calls:

- `OutcomeTransactionService.createAsset`;
- `PreservationVerificationService.runExperiment`;
- `ImageEditService.uploadSourceImage`.

Future canonical W27 routing allocates an asset UUID inside the protected
server-side writer before fence materialization. The caller cannot author the
UUID. The writer acquires `TENANT_AUTHORITY(ownerTenantId)` and
`ASSET_HEAD(ownerTenantId, assetId)`, then locks/revalidates the exact project
parent and tenant relationship, then inserts the explicit UUID. The project
row is an FK parent, not a new BUILD002 material class/fence. Existing return
shape, names, descriptions, project association, and initial `current_version`
semantics remain unchanged. Every current direct W27 call routes through this
writer after implementation.

```text
W27_FOUND=YES
W27_CLASSIFICATION=SERVICE_REPOSITORY_DIRECT_DML
W27_NEW_MATERIAL_DEPENDENCY_CLASS_REQUIRED=NO
W27_REQUIRED_FENCES=TENANT_AUTHORITY,ASSET_HEAD
W27_ASSET_ID_SERVER_OWNED=YES
W27_ASSET_ID_AVAILABLE_BEFORE_FENCE_ACQUISITION=YES
W27_INSERT_BEFORE_ASSET_FENCE=NO
W27_DIRECT_DML_REMAINS_UNFENCED=NO
W27_CAN_BE_ROUTED_WITHOUT_PRODUCT_SEMANTIC_CHANGE=YES
DIRECT_DML_ROUTING_IS_CONCURRENCY_HARDENING_ONLY=YES
002E_SCOPE_EXPANSION_FOUND=NO
```

## 6. W01 pre-identity race and W02 interaction

The current W01 discovery can let two sessions for principal `P` observe no
tenant, generate distinct tenant/member IDs, and then contend only at partial
unique index `tenants_personal_owner_principal_idx`. Tenant/member identity
fences are disjoint, so the R3 set is insufficient.

The future protected W01 protocol is:

1. assert `READ COMMITTED` and validate the principal UUID without reading
   authority;
2. perform non-authoritative discovery and preallocate server-owned candidate
   tenant/member UUIDs if creation may be required;
3. derive, validate, deduplicate, and sort the principal fence and every
   candidate/discovered tenant/member fence;
4. bootstrap and acquire every fence in total order, beginning with the common
   principal fence;
5. reread tenant/membership authority under those locks;
6. if a valid existing personal tenant/active OWNER association exists, return
   it with no insert;
7. otherwise insert both explicit preallocated IDs only after all fences;
8. advance required serialization/material revisions and evidence atomically
   with the authoritative rows; commit.

For the same principal, session B waits on the same principal fence. After A
commits, B's new `READ COMMITTED` statement snapshot observes A and does not
attempt a second insert. The unique index remains defense in depth, not the
linearization mechanism.

W02 must also acquire the principal fence before the tenant/member fences when
the target is the OWNER membership of a PERSONAL tenant. Pre-fence discovery
may derive the principal only as a hint. Under all held fences W02 rederives
tenant kind, personal owner, target membership/principal/role/status, and actor
authority. If rederivation needs a principal fence not already held, it rolls
back/restarts; it never late-locks. This makes W01 active-owner readback and W02
revocation share the same first lock and prevents an uncoordinated authority
result.

```text
W01_EXISTING_FENCE_SET_SUFFICIENT=NO
PERSONAL_OWNER_FENCE_REQUIRED=YES
W01_SHARED_PRINCIPAL_FENCE_ACQUIRED_BEFORE_UNIQUE_INSERT=YES
W01_DUPLICATE_PERSONAL_TENANT_INSERT_RACE_CLOSED=YES
B_OBSERVES_A_COMMITTED_PERSONAL_TENANT=YES
B_ATTEMPTS_SECOND_PERSONAL_TENANT_INSERT=NO
SECOND_DUPLICATE_INSERT=NO
UNIQUE_INDEX_WAIT_REQUIRED_FOR_CORRECTNESS=NO
W02_PERSONAL_OWNER_REQUIRES_PRINCIPAL_FENCE=YES
SHARED_CONSTRAINT_KEY_REQUIRES_SHARED_PREWRITE_FENCE=YES
```

## 7. UNIQUE/EXCLUDE constraint-wait audit

The audit covers every current unique index/constraint, including primary keys,
on every table actually written by W01–W27. W09's `candidate_assets` update is
included even though it changes only `committed`. There are no EXCLUDE
constraints in these targets. “Fence/proof” is the required prewrite common
fence; `unchanged` means that writer cannot alter the indexed key and already
locks the exact existing row. All generated authoritative IDs become
server-owned and are allocated before their exact fences.

| Table | Count | Constraint ID / exact conflict key | Writers | Disjoint sets possible before R4? | Prewrite common fence or exact proof | Resolution |
|---|---:|---|---|---|---|---|
| `tenants` | 2 | `tenants_pkey(id)`; `tenants_personal_owner_principal_idx(personal_owner_principal_id) WHERE NOT NULL` | W01 | yes for principal key | tenant exact ID; principal fence | preallocate; principal fence before insert |
| `tenant_memberships` | 2 | `tenant_memberships_pkey(id)`; unique `(tenant_id,principal_id)` | W01,W02 | no after principal closure | membership; principal+tenant | W02 key unchanged; W01 fenced |
| `assets` | 1 | `assets_pkey(id)` | W03,W05,W09,W27 | previously W27 could | asset head | server-preallocate before insert; updates exact-row locked |
| `asset_versions` | 2 | `asset_versions_pkey(id)`; unique `(asset_id,version_number)` | W04,W05,W09 | yes without asset fence | source version; asset head | asset fence before version calculation/insert |
| `outcome_transactions` | 2 | `outcome_transactions_pkey(id)`; `outcome_transactions_owner_id_uq(owner_tenant_id,id)` | W06,W07,W08,W09 | no | outcome transaction | preallocate; updates key unchanged |
| `state_commits` | 2 | `state_commits_pkey(id)`; unique `(transaction_id)` | W09 | no | outcome transaction | exact transaction fence before insert |
| `outcome_transaction_requirement_bindings` | 1 | PK `(owner_tenant_id,outcome_transaction_id)` | W10 | no | requirement binding | fence before insert |
| `outcome_blueprints` | 2 | PK `(id,version)`; unique `(id,version,hash)` | W11 | no | blueprint family | family fence before version assignment/insert |
| `outcome_requirement_profiles` | 2 | PK `(id,version)`; unique `(id,version,hash)` | W12 | no | requirement-profile family | family fence before insert |
| `build002_signal_requirements` | 4 | PK `(id)`; unique `(owner_tenant_id,outcome_transaction_id,id)`; unique `(owner_tenant_id,outcome_transaction_id,requirement_definition_hash)`; `build002_requirements_exact_address_uq(owner_tenant_id,outcome_transaction_id,requirement_id,requirement_definition_hash)` | W13,W18 | no | signal-requirement universe | fence before every insert |
| `build002_signals` | 4 | PK `(signal_id)`; unique `(owner_tenant_id,outcome_transaction_id,signal_id)`; unique `(owner_tenant_id,outcome_transaction_id,signal_id,content_hash)`; `build002_signals_exact_address_uq(...,signal_id,content_hash,requirement_id)` | W14 | no | signal universe plus requirement universe | fences before insert |
| `build002_dependency_snapshots` | 4 | PK `(id)`; unique `(owner_tenant_id,outcome_transaction_id,id)`; unique `(...,id,dependency_snapshot_hash)`; unique `(...,dependency_snapshot_hash)` | W15,W18 | no | evaluation universe | fence before insert |
| `build002_dependency_requirements` | 1 | PK `(owner_tenant_id,outcome_transaction_id,dependency_snapshot_id,requirement_definition_hash)` | W15,W18 | no | requirement+evaluation universes | fences before insert |
| `build002_dependency_signals` | 1 | PK `(owner_tenant_id,outcome_transaction_id,dependency_snapshot_id,signal_id)` | W15,W18 | no | signal+evaluation universes | fences before insert |
| `build002_signal_qualifications` | 2 | PK `(id)`; unique `(owner_tenant_id,outcome_transaction_id,id,qualification_content_hash)` | W16,W18 | no | evaluation universe | fence before insert |
| `build002_qualification_signals` | 1 | PK `(owner_tenant_id,outcome_transaction_id,qualification_id,signal_id)` | W16,W18 | no | signal+evaluation universes | fences before insert |
| `build002_delegation_readiness` | 2 | PK `(id)`; unique `(owner_tenant_id,outcome_transaction_id,id,readiness_content_hash)` | W17,W18 | no | evaluation universe | fence before insert |
| `build002_readiness_qualifications` | 1 | PK `(owner_tenant_id,outcome_transaction_id,readiness_id,qualification_id)` | W17,W18 | no | evaluation universe | fence before insert |
| `build002_readiness_authority_commits` | 2 | PK `(id)`; unique `(owner_tenant_id,outcome_transaction_id,readiness_id)` | W18 | no | readiness-authority universe | fence before insert |
| `build002_delegability_admissions` | 2 | PK `(admission_id)`; unique `(owner_tenant_id,authority_commit_id,principal_id,current_dependency_snapshot_hash)` | W19 | no | delegability-admission scope | exact shared scope fence |
| `field_outcomes` | 2 | PK `(id)`; unique `(transaction_id)` | W20 | no | TaskSpec/field-outcome universe | fence before insert |
| `partial_intents` | 1 | PK `(id)` | W21 | no | intent/patch universe | server ID plus universe fence |
| `transaction_patches` | 1 | PK `(id)` | W22 | no | intent/patch universe | server ID plus universe fence |
| `build002_execution_authorities` | 2 | PK `(execution_authority_id)`; unique `(idempotency_key)` | W23 | no | execution-authority scope | exact derived idempotency scope fence |
| `build002_mutation_leases` | 2 | PK `(mutation_lease_id)`; unique `(execution_authority_id,target_path,category)` | W24 | no | mutation-lease scope | exact shared scope fence |
| `build002_execution_attempt_reservations` | 4 | PK `(reservation_id)`; unique `(execution_attempt_id)`; unique `(mutation_lease_id)`; `build002_execution_attempt_reservations_pair_uidx(reservation_id,execution_attempt_id)` | W25 | no | execution-attempt scope | same lease fence; generated exact IDs preallocated |
| `build002_execution_attempt_consumptions` | 3 | PK `(consumption_id)`; unique `(reservation_id)`; unique `(execution_attempt_id)` | W26 | no | execution-attempt scope | same reservation/attempt fence |
| `candidate_assets` | 2 | PK `(id)`; `candidate_assets_execution_raw_uidx(execution_run_id) WHERE candidate_type='RAW_PROVIDER'` | W09 | invariant | W09 changes only `committed`; indexed/FK keys unchanged | exact candidate row lock; no constraint recheck edge |

These 57 sites are all accounted. A future fence-row identity unique conflict
is an additional internal bootstrap edge, not a current schema site: contenders
use the same exact tuple and bootstrap missing tuples only in canonical sorted
order. Future evidence keys `(fence identity, serialization_revision)` are
assigned only while holding that fence.

```text
CURRENT_UNIQUE_EXCLUSION_CONSTRAINT_SITES=57
UNIQUE_EXCLUSION_WAIT_EDGES_TOTAL=57
UNIQUE_EXCLUSION_WAIT_EDGES_ACCOUNTED=57
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
FUTURE_FENCE_ROW_BOOTSTRAP_UNIQUE_EDGE_CLASSES=1
```

## 8. Foreign-key constraint-wait audit

The following inventory names every current FK site on those same write
targets. Keys on one row are separate FK constraints. Count is the number of
constraints, not the number of columns.

| Table | Count | FK child key -> parent key | Writers | Prewrite parent/fence accounting and resolution |
|---|---:|---|---|---|
| `tenants` | 1 | `personal_owner_principal_id -> auth.users.id` | W01 | principal fence; exact auth row validated/key-locked before insert |
| `tenant_memberships` | 2 | `tenant_id -> tenants.id`; `principal_id -> auth.users.id` | W01,W02 | principal/tenant/member fences; W02 keys unchanged |
| `assets` | 3 | `project_id -> projects.id`; `current_version_id -> asset_versions.id`; `owner_tenant_id -> tenants.id` | W03,W05,W09,W27 | tenant/asset fences; strongest required exact parent locks before writes |
| `asset_versions` | 3 | `asset_id -> assets.id`; `parent_version_id -> asset_versions.id`; `owner_tenant_id -> tenants.id` | W04,W05,W09 | tenant/asset/version fences; exact parent locks sorted |
| `outcome_transactions` | 4 | `project_id -> projects.id`; `asset_id -> assets.id`; `base_version_id -> asset_versions.id`; `owner_tenant_id -> tenants.id` | W06,W07,W08,W09 | lineage fences and sorted parent locks; W08/W09 FK keys unchanged |
| `state_commits` | 5 | `transaction_id -> outcome_transactions.id`; `asset_id -> assets.id`; `new_version_id -> asset_versions.id`; `previous_version_id -> asset_versions.id`; `owner_tenant_id -> tenants.id` | W09 | complete canonical lineage locked before insert |
| `outcome_transaction_requirement_bindings` | 4 | `owner_tenant_id -> tenants.id`; `(owner_tenant_id,outcome_transaction_id) -> outcome_transactions(owner_tenant_id,id)`; blueprint triple -> blueprint exact address; profile triple -> profile exact address | W10 | tenant/transaction/binding and family fences; parent rows locked first |
| `outcome_blueprints` | 0 | none | W11 | none |
| `outcome_requirement_profiles` | 1 | blueprint triple -> `outcome_blueprints(id,version,hash)` | W12 | blueprint then profile family order; exact parent locked |
| `build002_signal_requirements` | 2 | `owner_tenant_id -> tenants.id`; owner/transaction -> outcome transaction | W13,W18 | tenant/transaction/requirement fences; parent first |
| `build002_signals` | 3 | owner tenant; owner/transaction; exact requirement address | W14 | tenant/transaction/requirement/signal fences; parent first |
| `build002_dependency_snapshots` | 2 | owner tenant; owner/transaction | W15,W18 | tenant/transaction/evaluation fences |
| `build002_dependency_requirements` | 2 | snapshot address; requirement-definition address | W15,W18 | same transaction or committed parents; requirement/evaluation fences |
| `build002_dependency_signals` | 2 | snapshot address; exact signal address | W15,W18 | same transaction or committed parents; signal/evaluation fences |
| `build002_signal_qualifications` | 4 | owner tenant; owner/transaction; exact requirement address; exact snapshot/hash address | W16,W18 | requirement/signal/evaluation fences; exact parents first |
| `build002_qualification_signals` | 2 | exact qualification/hash address; exact signal/hash/requirement address | W16,W18 | signal/evaluation fences; same-transaction parents precede children |
| `build002_delegation_readiness` | 3 | owner tenant; owner/transaction; exact snapshot/hash address | W17,W18 | evaluation fence; exact parents first |
| `build002_readiness_qualifications` | 2 | exact readiness/hash address; exact qualification/hash address | W17,W18 | evaluation fence; same-transaction parent-first writes |
| `build002_readiness_authority_commits` | 4 | `principal_id -> auth.users.id`; owner/transaction; exact snapshot/hash; exact readiness/hash | W18 | principal identity validation plus dependency/readiness fences; parents first |
| `build002_delegability_admissions` | 6 | owner tenant; principal; membership; authority commit; owner/transaction; exact readiness/hash | W19 | tenant/member/dependency/admission fences; exact parents first |
| `field_outcomes` | 5 | transaction; source version; raw candidate; delivered candidate; owner tenant | W20 | tenant/transaction/asset/TaskSpec fences; exact parent locks before insert |
| `partial_intents` | 2 | transaction; owner tenant | W21 | tenant/transaction/intent fences; parent first |
| `transaction_patches` | 2 | transaction; owner tenant | W22 | tenant/transaction/intent fences; parent first |
| `build002_execution_authorities` | 8 | owner tenant; principal; membership; D3 admission; D0 commit; asset; source version; owner/transaction composite | W23 | complete lower lineage and D4 fences; exact parents first |
| `build002_mutation_leases` | 9 | owner tenant; principal; membership; D4 authority; D3 admission; D0 commit; asset; source version; owner/transaction composite | W24 | complete lower lineage and D5 fences; exact parents first |
| `build002_execution_attempt_reservations` | 11 | owner tenant; principal; membership; D5 lease; D0 commit; D3 admission; D4 authority; transaction; asset; source version; owner/transaction composite | W25 | complete D5 lineage and attempt fence; exact parents first |
| `build002_execution_attempt_consumptions` | 6 | reservation; owner tenant; D5 lease; D4 authority; D0 commit; `(reservation_id,execution_attempt_id)` composite | W26 | same attempt fence; reservation locked before consumption |
| `candidate_assets` | 6 | transaction; execution run; source version; raw candidate; preservation run; owner tenant | W09 | W09 changes none of these keys; exact candidate row already locked |

All 104 sites resolve in one of three exact ways: the parent is locked in the
global parent-before-child phase while the applicable common material fences
are held; parent and child are inserted by the same transaction in declared
parent-before-child order; or the only participating writer updates no FK key.
`auth.users` and `projects` parent-key deletion/key mutation is not a W01–W27
entry point. It is still a modeled terminal external-parent edge: a protected
writer acquires the exact key-share/stronger parent lock after all fences, and
the external path cannot acquire a BUILD002 fence or re-enter the graph.

No current W01–W27 path deletes a referenced parent or changes a referenced
primary/unique key. Canonical D0–D6 authority rows and catalog/binding rows are
append-only/immutable. Consequently the FK audit adds no independent
material-race test beyond existing E01–E10 and C01–C03; E07/C03 stress the
explicit parent-lock phase.

```text
FK_WAIT_EDGES_TOTAL=104
FK_WAIT_EDGES_ACCOUNTED=104
UNACCOUNTED_FK_WAIT_EDGES=0
ADDITIONAL_FK_TEST_REQUIRED=NO_WITH_PROOF
```

## 9. Phantom inventory

| ID | Mutable inserted set | Covering universe fence |
|---|---|---|
| P01 | `build002_signal_requirements` | `SIGNAL_REQUIREMENT_UNIVERSE` |
| P02 | `build002_signals` | `SIGNAL_UNIVERSE` |
| P03 | `build002_dependency_snapshots` | evaluation plus requirement/signal universes |
| P04 | `build002_signal_qualifications` | `READINESS_EVALUATION_UNIVERSE` |
| P05 | `build002_delegation_readiness` | `READINESS_EVALUATION_UNIVERSE` |
| P06 | `field_outcomes` / TaskSpec snapshots | `TASKSPEC_FIELD_OUTCOME_UNIVERSE` |
| P07 | `partial_intents` | `INTENT_PATCH_UNIVERSE` |
| P08 | `transaction_patches` | `INTENT_PATCH_UNIVERSE` |
| P09 | execution-attempt reservations | `EXECUTION_ATTEMPT_SCOPE` |

W27 creates one exact preallocated asset row; the `ASSET_HEAD` fence covers its
material identity and does not introduce an admission-read set/phantom class.

```text
PHANTOM_PATHS_TOTAL=9
PHANTOM_PATHS_COVERED=9
PHANTOM_INSERT_GAP=0
```

## 10. Bootstrap and one acyclic global wait graph

Every path follows this protocol:

1. isolation guard;
2. non-authoritative discovery and server-side preallocation;
3. exact fence identity validation, deduplication, and total sort;
4. idempotent fence-row bootstrap in that order; an exact unique conflict
   resolves to the same exact tuple;
5. all fence-row `FOR UPDATE` locks in that order;
6. rederive the complete fence set; changed/missing identity means full
   rollback/restart, never a late lock;
7. build a complete exact existing-row and FK-parent lock plan; for each row
   acquire the strongest needed mode once, table-rank then primary-key order;
8. complete authoritative rereads and currentness checks;
9. execute parent-before-child writes; UNIQUE/FK checks can wait only behind an
   already-held common fence or exact non-reentering parent edge;
10. transactional revisions/evidence/mutation or decision; commit.

Ordinary/FK-parent table order is:

```text
auth.users -> tenants -> tenant_memberships -> projects -> outcome_transactions
-> assets -> asset_versions -> requirement bindings -> blueprint families
-> requirement-profile families -> signal requirements -> signals
-> dependency snapshots -> dependency links -> signal qualifications
-> qualification links -> delegation readiness -> readiness links
-> readiness authority commits -> delegability admissions
-> field outcomes/TaskSpec -> candidate assets -> partial intents
-> transaction patches -> execution authorities -> mutation leases
-> attempt reservations -> attempt consumptions -> serialization evidence
```

Multiple rows in one domain sort by exact primary key. A row that will later be
updated uses `FOR UPDATE` immediately rather than taking `KEY SHARE` and later
upgrading. New parents and children created in one transaction use the same
table order. No ordinary/material row lock is retained before the complete
fence set. No helper, trigger, constraint, nested D5/D6 call, or external parent
path may acquire a fence after entering this phase.

The eight existing broad `SHARE` table locks remain removed prospectively:

| Edge | Broad read-side table | Writer | Exact replacement |
|---|---|---|---|
| LW01 | `build002_signal_requirements` | W13/W18 | requirement universe |
| LW02 | `build002_signals` | W14 | signal universe |
| LW03 | `build002_dependency_snapshots` | W15/W18 | evaluation universe |
| LW04 | `build002_signal_qualifications` | W16/W18 | evaluation universe |
| LW05 | `build002_delegation_readiness` | W17/W18 | evaluation universe |
| LW06 | `field_outcomes` | W20 | TaskSpec universe |
| LW07 | `transaction_patches` | W22 | intent universe |
| LW08 | `partial_intents` | W21 | intent universe |

Every internal wait edge is now forward: sorted fence bootstrap, sorted fence
locks, strongest-once parent/ordinary locks, parent-before-child writes,
constraint checks, and evidence. The fence-row unique wait cannot reverse the
order because missing rows are attempted only in total order. There is no path
from a UNIQUE/FK/index wait back to fence acquisition.

```text
FENCE_ROW_CREATION_IDEMPOTENT=YES
FENCE_CREATION_CONFLICT_RESOLVES_TO_EXACT_ROW=YES
MULTI_FENCE_CREATION_OBEYS_TOTAL_ORDER=YES
DYNAMIC_OUT_OF_ORDER_FENCE_ACQUISITION=NO
LEGACY_WAIT_EDGES_TOTAL=8
LEGACY_WAIT_EDGES_CLOSED=8
LEGACY_WAIT_EDGES_UNCLOSED=0
REVERSE_FENCE_EDGE_COUNT=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES
```

## 11. ACL contract

Fence and evidence tables are internal, non-capability state. Their explicit
non-login owner and protected functions use trusted fixed `search_path` or
fully qualified objects. Direct table/sequence privileges are revoked from
`PUBLIC`, `anon`, `authenticated`, and `service_role`; RLS is defense in depth.
Evidence is append-only. Protected helper `PUBLIC EXECUTE` is revoked and only
the minimum exact business function/role receives execute.

There is no application-visible generic acquire/lock/increment/create-fence
RPC. Business IDs are inputs to server derivation, never authority to invent a
fence. The principal fence has the same denial matrix.

```text
FENCE_DIRECT_CLIENT_WRITE=NO
FENCE_DIRECT_ANON_WRITE=NO
FENCE_DIRECT_AUTHENTICATED_WRITE=NO
FENCE_DIRECT_SERVICE_ROLE_WRITE=NO
APPLICATION_VISIBLE_GENERIC_FENCE_RPC=NO
PERSONAL_OWNER_FENCE_DIRECT_CLIENT_WRITE=NO
EVIDENCE_DIRECT_CLIENT_WRITE=NO
FENCE_IDENTITY_CALLER_AUTHORITATIVE=NO
FENCE_IDENTITY_SERVER_VALIDATED=YES
FENCE_ACL_CONTRACT_CLOSED=YES
```

## 12. PostgreSQL 17 adversarial verification contract

E01–E10 retain their R3 meanings and numbering:

| ID | Required independent-session proof |
|---|---|
| E01 | dependency first: mutation `r -> r+1`, then durably rejected stale admission; zero consequence |
| E02 | admission first: D6 consumption/evidence commits, mutation waits then commits at higher revision |
| E03 | distinct attempts remain independently governed; no permanent winner |
| E04 | exact duplicate produces at most one D6 consumption |
| E05 | one blueprint/profile publisher races admissions in two transactions without enumeration |
| E06 | universe phantom insert/admission; committed-first insert cannot be missed |
| E07 | overlapping/disjoint global wait-graph stress; zero deadlocks/timeouts/cross-fence waits |
| E08 | committed stale rejection has evidence but zero reservation/consumption/provider/run/StateCommit |
| E09 | explicit abort removes tentative revisions/evidence/mutation/admission |
| E10 | reconstruct both orders only from committed canonical database rows |

Isolation negatives I01–I04 prove correct PostgREST/native `READ COMMITTED`,
fail-closed `REPEATABLE READ`, fail-closed `SERIALIZABLE`, and complete fresh
restart after safe injected pre-provider `40001`.

Additional constraint classes:

- C01 **same-principal personal provision**: two sessions and explicit
  barriers; both resolve to the same canonical tenant/member result or an
  independently valid fail-closed result. Final counts are one personal tenant
  and one active OWNER membership, with no second insert.
- C02 **fenced asset create**: prove server-owned UUID before asset fence,
  insert only after tenant/asset/parent locks, atomic revision/evidence, and no
  reachable legacy unfenced W27 path.
- C03 **constraint wait-graph stress**: exercise every shared current
  UNIQUE/EXCLUDE contention class plus fence bootstrap with explicit barriers;
  catching `unique_violation` is not serialization proof.

ACL negatives cover anon/authenticated/service-role direct fence/evidence DML,
revision update, arbitrary identity, and absence of a generic fence RPC.

```text
MULTI_SESSION_TEST_CLASSES=10
ISOLATION_NEGATIVE_TEST_CLASSES=4
CONSTRAINT_CONCURRENCY_TEST_CLASSES=3
ACL_NEGATIVE_MATRIX_REQUIRED=YES
PERSONAL_TENANTS_FOR_PRINCIPAL=1
ACTIVE_OWNER_MEMBERSHIPS_FOR_PRINCIPAL_AND_TENANT=1
SECOND_DUPLICATE_INSERT=NO
UNFENCED_ASSET_CREATE_AFTER_002E=0
DEADLOCKS=0
TIMEOUTS=0
UNACCOUNTED_CONSTRAINT_WAIT=0
```

## 13. Field Beta, D6, and provider firewalls

The supported application flow still does not prove positive canonical D0–D6
reachability. Tests may use an `ALREADY_VALID_CANONICAL_D0_D6_FIXTURE`, labeled
only `CANONICAL_ADMISSION_FIXTURE_PROOF`. 002-E may not repair reachability.

A committed D6 state
`ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN` after a crash remains
valid and cannot be blindly replayed. No provider exactly-once or recovery
claim is made.

```text
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
CONSUMED_RESERVATION_BLIND_REPLAY=REJECTED
002E_PROVIDER_RECOVERY_SCOPE=NO
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO
```

## 14. Ten parent-traceable requirements

| Requirement | Normative contract | Parent derivation |
|---|---|---|
| `002E-R01` | concrete PostgreSQL fence and committed mutation/admission linearization | global 002-E serialization invariant |
| `002E-R02` | all 27 current material writers and dependent admissions share exact fences, including pre-identity shared constraint keys | dependency/admission serialization |
| `002E-R03` | one total bootstrap/fence/ordinary/UNIQUE/EXCLUDE/FK wait graph with zero unaccounted edge | deterministic lock order and deadlock STOP |
| `002E-R04` | pinned `READ COMMITTED`, runtime guard, and 17/17 post-fence revalidation | exact-current visibility |
| `002E-R05` | dependency-first stale admission fails closed with zero consequence | stale-side-effect STOP |
| `002E-R06` | rejection/abort leaves no authoritative partial state; evidence is non-capability | no partial reservation/run |
| `002E-R07` | DB-reconstructable order without permanent attempt uniqueness/retry authority | unverifiable-result STOP, serialization only |
| `002E-R08` | `40001`/changed discovery fully restarts; never late-locks/resumes | rollback and deterministic-order requirement |
| `002E-R09` | PostgreSQL 17 E01–E10, I01–I04, C01–C03, FK/order/ACL proof with zero deadlocks/timeouts | E3 real-session adversarial proof |
| `002E-R10` | preserve C1 TC01–TC06, D0–D6, D5/D6 semantics, hash parity, ACL, exact attempt and provider boundary | gate governance |

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
```

## 15. Scope firewall and R4 design-gate result

This design creates no generic lock/event/audit/workflow/retry/distributed-lock
platform. Future direct-DML routing is authorized only as concurrency hardening
and preserves product semantics. This candidate itself changes no product,
application, migration, C1 authority, D6 authority, or main branch.

```text
ISOLATION_CONTRACT_CLOSED=YES
DURABLE_ORDER_EVIDENCE_CLOSED=YES
LEGACY_WAIT_GRAPH_CLOSED=YES
FENCE_ACL_CONTRACT_CLOSED=YES

CURRENT_WRITER_PATHS_MAPPED=27
CURRENT_WRITER_PATHS_TOTAL=27
UNMAPPED_WRITER_PATHS=0
W01_DUPLICATE_PERSONAL_TENANT_INSERT_RACE_CLOSED=YES
W27_DIRECT_DML_REMAINS_UNFENCED=NO_AS_FUTURE_CONTRACT
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
UNACCOUNTED_FK_WAIT_EDGES=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES

PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
C1_AUTHORITY_CHANGED=NO
D6_AUTHORITY_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO

BUILD002_002E_SPEC_R4_STATUS=VERIFIED_CANDIDATE
FINAL_VERDICT=BUILD002_002E_SPEC_R4_VERIFIED_CANDIDATE
```

The next permitted gate is
`BUILD002_002E_SPEC_R4_CANONICALIZATION_R1`. R4 is not canonicalized here and
does not authorize 002-E implementation.
