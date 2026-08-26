# BUILD002 002-E — effective mutation-surface and wait-graph specification R5

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R5
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R4=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This is design and database-proof
authority for independent canonicalization only. It does not authorize 002-E
implementation, migrations, application changes, 002-R, D7, or C2.

R1 `8ba2f7877dcfabfa471c82bfc81c12fffdf41518`, R2
`30f4da7e3bb47a6674c3ae7ed4f3d388671d2c39`, R3
`883edf35ce43446d4b722310421200cbc4dc070d`, and R4
`8fa0243075d0e1565d53dea8c9f7ea44cefe125b` were not canonicalized. None is
an ancestor of R5. R5 starts directly from canonical main commit
`58e69b4d7d683412a0bfa60b5121be82d5426eaa`, tree
`a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884`.

## 1. Authority, scope, and inventory method

Primary authority is `docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md` at
historical commit `2057ffeb4b63e878379da2e25c2252be2707a125`, blob
`589d406f78423367259d07dc759eb3f97fdee349`, SHA-256
`4c29606d8ba5a0b15255db1bd1340e62a35a9515f7870ffa012c9553c85c39e2`.
Supporting objective is `docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md`
at commit `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`, blob
`bfe82d08adc29b8fe032f5a39c5e24620b1257a8`, SHA-256
`b75fdee1266185cd1e7fa197ca2b9222576f3e77d0d15820e9d3f2381f5bc977`.

The inherited invariant remains:

```text
dependency changes
+ READY -> execution-admission races
serialize at a concrete PostgreSQL linearization point
with no partial reservation/run
```

R5 maintains three disjointly interpreted domains:

- `MATERIAL_WRITER_PATHS`: current reachable operations that change material
  read or revalidated by canonical D0–D6 admission/currentness;
- `WAIT_GRAPH_PARTICIPANTS`: current reachable operations whose SQL can wait
  with the protected graph through rows, tables, constraints, triggers, nested
  functions, or fence bootstrap;
- `INACTIVE_OR_SUPERSEDED_MUTATION_PATHS`: non-effective function bodies or
  non-reachable code. These never contribute active targets or counts.

An operation can be wait-only without becoming a material writer. A globally
active database writer outside both BUILD002 currentness and its intersecting
wait graph is statically classified but excluded by the 002-E scope firewall.

```text
MATERIAL_WRITER_PATHS_INTERSECT_INACTIVE=EMPTY
WAIT_GRAPH_PARTICIPANTS_INTERSECT_INACTIVE=EMPTY
SUPERSEDED_FUNCTION_BODY_COUNTS_AS_ACTIVE=NO
002E_SCOPE_EXPANSION_FOUND=NO
```

## 2. PostgreSQL 17 clean-replay evidence

An ephemeral empty PostgreSQL 17.10 database replayed, in filename order, all
41 files under `supabase/migrations` from the pinned base. Minimal environmental
Supabase roles plus `auth.users`, `auth.uid()`, and `storage.buckets` were
provided; no repository object was skipped or pre-created. Replay was 41/41
PASS. The inventory was then obtained from `pg_proc`, `pg_trigger`,
`pg_constraint`, `pg_index`, `pg_class`, `pg_namespace`, `information_schema`,
and `pg_depend`, using every required `pg_get_*def()` function.

Full public-schema observations were 93 functions, 22 regex-positive
mutating/locking functions, 69 enabled non-internal triggers, 647 constraints,
187 indexes, 263 class rows, and 185 dependency rows. One of the 22 functions,
`lock_preservation_study_intent`, is active but outside the 002-E intersection.
The scoped effective closure is 21 SQL function objects, 34 enabled trigger
paths, 27 write targets, 55 UNIQUE/EXCLUDE sites, and 102 FKs.

Manifest serialization is UTF-8, LF, lexicographically sorted records with one
terminal LF. The mutation record is `FUNCTION|signature|pg_get_functiondef
SHA256` or `TRIGGER|table|name|enabled|pg_get_triggerdef|trigger-function
SHA256`. The constraint record contains every active PK/UNIQUE/EXCLUDE index
and FK with `pg_get_constraintdef`/`pg_get_indexdef`.

```text
CLEAN_MIGRATION_REPLAY=41/41_PASS
POSTGRESQL_VERSION=17.10
POSTGRESQL_VERSION_NUM=170010
EFFECTIVE_SCHEMA_SOURCE=POSTGRESQL17_CLEAN_REPLAY
EFFECTIVE_DB_MUTATION_MANIFEST_HASH=4b3242cb928cef14e23263bc5c9505ce695ba3a19f12687a120814ff1585a1e7
EFFECTIVE_CONSTRAINT_MANIFEST_HASH=0093b41e308aab9474975473ba746de288baaad3619d31ffc642d1786b8b414f
FULL_PUBLIC_MUTATION_MANIFEST_HASH=1c7b891c085aafdfb26ef5f20bc997bd3d44400eb902bc20980eacf3c79e5dc6
FULL_PUBLIC_CONSTRAINT_MANIFEST_HASH=a2e3738d8cc5f3083cfccde9fdb183096000fbdf775333fa02882740352860f9
```

Future candidate verification must rerun this generator against its candidate
SHA. A new reachable writer, enabled trigger, unique/exclusion site, FK, nested
mutator, or broad lock is an unmapped drift and fails verification closed.

```text
MUTATION_SURFACE_DRIFT_FAILS_CLOSED=YES
```

## 3. Preserved isolation, retry, and durable-order contracts

Every participant pins PostgreSQL `READ COMMITTED`. PostgREST RPCs use the
supported request transaction setting and assert
`current_setting('transaction_isolation') = 'read committed'` before the first
authoritative read. Direct PostgreSQL callers explicitly begin at the same
isolation. SQLSTATE `40001`, before any committed admission/provider effect,
rolls back and restarts the complete operation from fresh discovery. Nothing
resumes a fence set, snapshot, lock, or tentative evidence. `40P01`, lock
timeout, or statement timeout is verification failure.

Material fences carry independent transactional `material_revision` and
`serialization_revision`. A material writer changes the former and records the
authoritative transition while holding every applicable fence. Admission and
wait-only coordination can change only serialization evidence; neither creates
authority or retry permission. Durable order is reconstructed solely from
committed canonical rows and common exact fence revisions, never timestamps or
sequence allocation.

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
POSTGREST_RPC_READ_COMMITTED_PIN_REQUIRED=YES
RPC_RUNTIME_ISOLATION_GUARD=YES
SERIALIZATION_FAILURE_FULL_RESTART=YES
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
002E_DEFINES_RETRY_POLICY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
WAIT_GRAPH_ONLY_OPERATION_CREATES_FAKE_MATERIAL_REVISION=NO
```

## 4. Nineteen fences and seventeen material classes

The exact fence key is `(fence_kind, identity_schema_version,
canonical_scope_identity)`. Identity is typed canonical JSON, server-derived,
validated, deduplicated, and sorted by the following immutable rank.

| Rank | Fence | Exact identity |
|---:|---|---|
| 5 | `PERSONAL_TENANT_OWNER_PRINCIPAL` | `{principalId}` |
| 10 | `TENANT_AUTHORITY` | `{ownerTenantId}` |
| 20 | `MEMBERSHIP_AUTHORITY` | `{ownerTenantId,membershipId}` |
| 30 | `OUTCOME_TRANSACTION` | `{ownerTenantId,outcomeTransactionId}` |
| 40 | `ASSET_HEAD` | `{ownerTenantId,assetId}` |
| 50 | `SOURCE_ASSET_VERSION` | `{ownerTenantId,assetId,sourceAssetVersionId}` |
| 60 | `TRANSACTION_REQUIREMENT_BINDING` | `{ownerTenantId,outcomeTransactionId}` |
| 70 | `BLUEPRINT_FAMILY` | `{blueprintId}` |
| 80 | `REQUIREMENT_PROFILE_FAMILY` | `{requirementProfileId}` |
| 90 | `SIGNAL_REQUIREMENT_UNIVERSE` | `{ownerTenantId,outcomeTransactionId}` |
| 100 | `SIGNAL_UNIVERSE` | `{ownerTenantId,outcomeTransactionId}` |
| 110 | `READINESS_EVALUATION_UNIVERSE` | `{ownerTenantId,outcomeTransactionId}` |
| 120 | `READINESS_AUTHORITY_UNIVERSE` | `{ownerTenantId,outcomeTransactionId}` |
| 130 | `DELEGABILITY_ADMISSION_SCOPE` | `{ownerTenantId,authorityCommitId,principalId,membershipId,currentDependencySnapshotHash}` |
| 140 | `TASKSPEC_FIELD_OUTCOME_UNIVERSE` | `{ownerTenantId,outcomeTransactionId}` |
| 150 | `INTENT_PATCH_UNIVERSE` | `{ownerTenantId,outcomeTransactionId}` |
| 160 | `EXECUTION_AUTHORITY_SCOPE` | `{ownerTenantId,delegabilityAdmissionId,taskSpecId,taskSpecHash}` |
| 170 | `MUTATION_LEASE_SCOPE` | `{ownerTenantId,executionAuthorityId,targetPath,category}` |
| 180 | `EXECUTION_ATTEMPT_SCOPE` | `{ownerTenantId,mutationLeaseId}` |

The principal fence is synchronization-only and proves no ownership or
authority. W01 starts from it; after every fence is held, a changed or newly
discovered identity causes rollback/full restart. W02 acquires it first for a
PERSONAL OWNER. A pre-wait W01 existing result is not safe without the new
fences.

The parent material classes remain exactly: (1) tenant/membership state, (2)
transaction state/semantics, (3) asset head, (4) source version, (5)
requirement binding, (6) blueprint/profile/policy, (7) requirements, (8)
signals, (9) dependency snapshots, (10) qualifications/readiness/evaluator,
(11) readiness authority, (12) delegability admission, (13) TaskSpec/field
outcome, (14) intent/patch, (15) ExecutionAuthority, (16) MutationLease, and
(17) reservation/consumption. Principal synchronization, W27 identity, and W28
do not add material classes.

```text
R4_FENCE_IDENTITIES_RETAINED=19
NEW_R5_FENCE_IDENTITIES=0
FENCE_IDENTITIES_TOTAL=19
FENCE_IDENTITIES_AMBIGUOUS=0
MATERIAL_DEPENDENCY_CLASSES=17
PERSONAL_OWNER_FENCE_REQUIRED=YES
PERSONAL_OWNER_FENCE_IS_AUTHORITY=NO
W01_POSTWAIT_IDENTITY_CHANGE_CAUSES_RESTART=YES
W01_EXISTING_RETURN_SAFE_WITHOUT_NEW_FENCES=NO
W02_PERSONAL_OWNER_REQUIRES_PRINCIPAL_FENCE=YES
W01_W02_SERIALIZATION_COMPLETE=YES
```

## 5. Current reachable operation closure

| ID | Operation | Entry | Material class | Required fence summary |
|---|---|---|---|---|
| W01 | `provision_personal_tenant` | RPC | 1 | principal, candidate/existing tenant/member |
| W02 | `revoke_tenant_membership` | RPC | 1 | principal when PERSONAL OWNER, tenant/member |
| W03 | `SupabaseAssetRepository.update` | direct | 3 | tenant, asset head |
| W04 | `SupabaseAssetVersionRepository.create` | direct | 4 | tenant, asset head, exact version |
| W05 | `create_tenant_asset_with_initial_version` | RPC | 3,4 | tenant, asset head/version |
| W06 | `SupabaseOutcomeTransactionRepository.create` | direct | 2–4 | tenant, transaction, asset/version |
| W07 | `SupabaseTenantCoreLineageRepository.createTransaction` | direct | 2–4 | same lineage set as W06 |
| W08 | `SupabaseOutcomeTransactionRepository.updateStatus` | direct | 2 | tenant, transaction |
| W09 | `commit_accepted_field_outcome` | RPC | 2–4 | tenant, transaction, asset, prior/new version |
| W10 | `build002_bind_outcome_transaction_requirements` | RPC | 5,6 | binding and catalog families |
| W11 | `build002_publish_outcome_blueprint` | RPC | 6 | blueprint family |
| W12 | `build002_publish_outcome_requirement_profile` | RPC | 6 | blueprint then profile family |
| W13 | `build002_insert_signal_requirement` | RPC | 7 | requirement universe |
| W14 | `build002_insert_signal` | RPC | 8 | requirement then signal universe |
| W15 | `build002_insert_dependency_snapshot` | RPC | 9 | requirement/signal/evaluation universes |
| W16 | `build002_insert_signal_qualification` | RPC | 10 | requirement/signal/evaluation universes |
| W17 | `build002_insert_delegation_readiness` | RPC | 10 | evaluation universe |
| W18 | `build002_commit_readiness_authority` | RPC | 2–11 | complete D0 dependency set |
| W19 | `build002_admit_delegability` | RPC | 12 | complete dependency and admission scope |
| W20 | `SupabaseFieldBetaRepository.createOutcome` | direct | 13 | tenant, transaction, TaskSpec universe |
| W21 | `SupabasePartialIntentRepository.create` | direct | 14 | tenant, transaction, intent universe |
| W22 | `SupabaseSemanticPatchRepository.create` | direct | 14 | tenant, transaction, intent universe |
| W23 | `build002_grant_execution_authority` | RPC | 15 | lower lineage, D4 scope |
| W24 | `build002_grant_mutation_lease` | RPC | 16 | lower lineage, D5 scope |
| W25 | `build002_reserve_execution_attempt` | RPC | 17 | complete D5 and attempt scope |
| W26 | `build002_consume_execution_attempt_reservation` | RPC | 17 | reservation/attempt scope |
| W27 | `SupabaseAssetRepository.create` | direct | 3 | tenant, server-preallocated asset head; project parent |
| W28 | `SupabaseStateCommitRepository.create` | direct | none; wait-only | tenant, transaction, asset, new/previous versions |

W01–W27 are material-writer paths. W28 is not read by canonical D0–D6 and does
not change any D0–D6 currentness value; it is nevertheless a wait participant
because its `state_commits` insert shares the transaction unique key and five
FK parents with W09. Thus the broader reachable/wait closure is 28 while the
material closure remains 27.

```text
PROTECTED_TOP_LEVEL_RPC=W01,W02,W05,W09,W10,W11,W12,W13,W14,W15,W16,W17,W18,W19,W23,W24,W25,W26
SERVICE_REPOSITORY_DIRECT_DML=W03,W04,W06,W07,W08,W20,W21,W22,W27,W28
REACHABLE_DML_PATHS_TOTAL=28
REACHABLE_DML_PATHS_CLASSIFIED=28
UNCLASSIFIED_REACHABLE_DML_PATHS=0
MATERIAL_WRITER_PATHS_TOTAL=27
MATERIAL_WRITER_PATHS_MAPPED=27
UNMAPPED_MATERIAL_WRITER_PATHS=0
WAIT_GRAPH_PARTICIPANTS_TOTAL=28
WAIT_GRAPH_PARTICIPANTS_MAPPED=28
UNMAPPED_WAIT_GRAPH_PARTICIPANTS=0
```

W27 is called by `OutcomeTransactionService.createAsset`,
`PreservationVerificationService.runExperiment`, and
`ImageEditService.uploadSourceImage`. Its future exact writer server-allocates
the asset UUID before fence acquisition, locks the tenant and exact project
parent, and changes no business shape or ownership semantics.

```text
W27_FOUND=YES
W27_ASSET_ID_SERVER_OWNED=YES
W27_ASSET_ID_AVAILABLE_BEFORE_FENCE_ACQUISITION=YES
W27_UNFENCED_DIRECT_DML_ALLOWED_AFTER_002E=NO
```

## 6. W28 proof and routing contract

`SupabaseStateCommitRepository.create` is exported in the active tenant bundle
at `src/infrastructure/persistence/supabase-repositories.ts:500`. Exact current
service consumers are `OutcomeTransactionService.commitTransaction` at line
320 and `PreservationVerificationService.approvePreserved` at line 798. It uses
the privileged tenant-scoped client and derives `owner_tenant_id` from
`requireTenantScope(this.ownerTenantId)`; callers supply transaction, asset,
new-version, and previous-version IDs.

Future W28 routes through an exact server-owned transaction without changing
StateCommit business semantics. Before the insert it acquires, in global rank
order, existing fences
`TENANT_AUTHORITY(ownerTenantId)`,
`OUTCOME_TRANSACTION(ownerTenantId,transactionId)`,
`ASSET_HEAD(ownerTenantId,assetId)`,
`SOURCE_ASSET_VERSION(ownerTenantId,assetId,newVersionId)`, and
`SOURCE_ASSET_VERSION(ownerTenantId,assetId,previousVersionId)`. It then locks
the exact tenant, transaction, asset, new-version, and previous-version parent
rows in canonical ordinary-row order and revalidates owner/lineage. No
material revision is advanced.

W09 and W28 therefore share the exact outcome-transaction fence before either
can insert the unique `transaction_id`. W09 retains its installed idempotent
existing-row behavior. W28 retains the service behavior that a pre-existing
commit is `ALREADY_COMMITTED`; a conflicting concurrent loser rereads after the
fence and fails closed. The unique constraint remains decisive defense, not a
new retry policy.

```text
W28_FOUND=YES
W28_REACHABLE=YES
W28_CLASSIFICATION=SERVICE_REPOSITORY_DIRECT_DML
W28_002E_ROLE=WAIT_GRAPH_ONLY
W28_NEW_MATERIAL_CLASS_CREATED=NO
W28_REQUIRED_FENCE_SET=TENANT_AUTHORITY,OUTCOME_TRANSACTION,ASSET_HEAD,SOURCE_ASSET_VERSION(new),SOURCE_ASSET_VERSION(previous)
W28_PARENT_LOCK_SET=tenant,outcome_transaction,asset,new_asset_version,previous_asset_version
W28_UNACCOUNTED_WAIT_EDGES=0
W28_UNFENCED_DIRECT_DML_ALLOWED_AFTER_002E=NO
W28_ROUTING_CHANGES_BUSINESS_SEMANTICS=NO
STATE_COMMIT_TRANSACTION_UNIQUE_RACE_ACCOUNTED=YES
```

## 7. Effective SQL/RPC function manifest

`Writes` is the installed-body write set; `calls` records nested closure.
`Last body migration` is the last repository migration that supplied the
effective body, not an earlier superseded `CREATE OR REPLACE`.

| Effective signature | Definition SHA-256 | Writes / calls | Last body migration |
|---|---|---|---|
| `provision_personal_tenant(uuid)` | `55aa2dab6e62edd6188aac2dffe6ab539b425b4d8644ccba92ed0868af23898c` | tenants, tenant_memberships | `20260814090000_foundation_1_5_identity_tenant_authority.sql` |
| `revoke_tenant_membership(uuid,uuid)` | `b3023a8a0f72c25d0fdb4c503c47ff2f517e0f24d55f39168aa4936928bdb0d4` | tenant_memberships | same |
| `create_tenant_asset_with_initial_version(uuid,text,text,jsonb)` | `2d7a9aa96c5f41a1b070017ef80c73782bed12f8d73d877360251e95a34733d9` | assets, asset_versions | `20260815030000_build_001_trust_foundation_atomic_commit.sql` |
| `commit_accepted_field_outcome(uuid)` | `e579dd9a1b9ed1a9d77f9e4e4cfc5bcb1bc97f026c747c01c659da4f273cb884` | calls unlocked helper | `20260816090000_build_001_f4_owner_revocation_toctou.sql` |
| `commit_accepted_field_outcome_unlocked(uuid)` | `78e199c1a8c8345c406d8a77448706c68bf03ca1722c033b47acb19a67fa6516` | asset_versions, assets, state_commits, outcome_transactions | `20260815040000_build_001_f1_canonical_candidate_immutability.sql` (renamed by F4) |
| `build002_bind_outcome_transaction_requirements(jsonb)` | `e40cd02f98ab146873557bd144c189526fc8d5290d7acb94059e89e7257674af` | bindings | `20260819150000_build_002_c0_c_transaction_requirement_binding.sql` |
| `build002_publish_outcome_blueprint(jsonb)` | `7a5bb2c54c3422aedfad32bbc811962d9d9b92709eabbeeb245d588595478a0a` | blueprints | `20260819140000_build_002_c0_requirement_catalog.sql` |
| `build002_publish_outcome_requirement_profile(jsonb)` | `6267e7aab68a500690c1588a71fb1d4128413f280b8350bd0217327af6e6e7fc` | profiles | same |
| `build002_insert_signal_requirement(jsonb)` | `4e90ffe60ca6c5fd4450f75ff3a4e7e7b581c700e625ecec256e2f4da733f2df` | requirements | `20260819130000_build_002_b_r2_write_boundary.sql` |
| `build002_insert_signal(jsonb)` | `77e50f7dcd7e89b95085505dca62b2e6912bfe49eae3a977c3f0146f600919c5` | signals | same |
| `build002_insert_dependency_snapshot(jsonb)` | `d9c028465b6ef8f5682cdf7a3479403308bfc0d3d31406a4730369fa83c89bff` | snapshots, dependency requirements/signals | same |
| `build002_insert_signal_qualification(jsonb,uuid)` | `220597b4f8a59eb87c3c9fd18eb2947c93ca64f1c220a3f3c08c8a960028d1b8` | qualifications, qualification signals | same |
| `build002_insert_delegation_readiness(jsonb,uuid,jsonb)` | `9ba3ca5f1dbd758462ee3d0ed00566077965393e4f5b0ac0138c9a2c9eaedeba` | readiness, readiness qualifications | same |
| `build002_commit_readiness_authority(uuid,jsonb)` | `8c7432da256de4289a928ec53936f6177c972d12e57a428a190bb83eda4b5c19` | nine D0 graph tables | `20260820210000_build_002_c1_d0_readiness_authority_commit.sql` |
| `build002_admit_delegability(uuid,uuid,uuid,jsonb,jsonb)` | `42fb83edcba938e747e90b454df33db5c96b6b18a082fdadc44bee5208521310` | calls legacy helper | `20260823110000_build_002_c1_d3_r3_retry_admissibility.sql` |
| `build002_admit_delegability_legacy(uuid,uuid,uuid,jsonb)` | `0ae1aab2bfda9ee0ed7331809c89bdfca84160a8c612bc24a1b48b9e5ade37bb` | admissions | `20260823100000_build_002_c1_d3_r1_serialized_closure.sql` |
| `build002_grant_execution_authority(uuid,uuid,uuid,uuid,text)` | `ba5a86b69f45dc9233519810f731c92357243623f3b3db8e3a80b57253fdef19` | execution authorities | `20260823140000_build_002_c1_d4_r2_hash_authority_closure.sql` |
| `build002_grant_mutation_lease(uuid,uuid,uuid,text,text)` | `7c92cb5ac4425d3babcf6c6d0d8d1af2ba90962e21a904b8002f90417cffa087` | calls r0 helper | `20260825090000_build_002_c1_d5_r1_mutation_lease_freshness_semantic_binding.sql` |
| `build002_grant_mutation_lease_r0(uuid,uuid,uuid,text,text)` | `f9ccb5656b5e7d28fe516e26788faf83e5fb6afff0498baf8dbe2a973c9f2d3e` | mutation leases | `20260825080000_build_002_c1_d5_r0_mutation_lease_authority.sql` |
| `build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb)` | `b6c8ae4c46e6dfa246d224a505fde510c79c0fac4fca352c591939a31715e7ef` | reservations; calls D5 | `20260825110000_build_002_c1_d6_execution_attempt_reservation.sql` |
| `build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid)` | `bbd4b324d33ca6a0d0e70491ce2060a5c6dec52732f558e704819e88ae0011bd` | consumptions; calls D5 | same |

The installed W09 closure hash over `signature=definition-hash` is
`f15da6cb869d2640c4dbc5f42f5b7c432309503c68db2842e38e28f5a023557d`.
The unlocked body reads `candidate_assets` without `FOR UPDATE` and does not
write it. Only its four installed write targets are active.

```text
RPC_MUTATOR_PATHS_TOTAL=21
RPC_MUTATOR_PATHS_MAPPED=21
UNMAPPED_RPC_MUTATORS=0
W09_EFFECTIVE_FUNCTION_HASH=e579dd9a1b9ed1a9d77f9e4e4cfc5bcb1bc97f026c747c01c659da4f273cb884
W09_EFFECTIVE_WRITE_TARGETS=asset_versions,assets,state_commits,outcome_transactions
W09_WRITES_CANDIDATE_ASSETS=NO
UNACCOUNTED_NESTED_FUNCTION_WAIT_EDGES=0
```

## 8. Application direct-DML and call-graph discovery

Exactly 170 TypeScript/JavaScript files under `src` were scanned. Literal
searches produced `.insert(` 46 hits, `.update(` 29, `.upsert(` 0,
`.delete(` 1, and `.rpc(` 19. Classification of the 76 direct-method tokens
found 56 actual Supabase mutation builders and 20 non-DML calls (crypto hash,
repository-interface calls, or in-memory calls). The 19 RPC calls map to 18
002-E top-level operations and one active preservation-study RPC outside scope.

The ten intersecting direct builders are the W rows below; every class is
exported in a current bundle, every client is privileged, and every owner is
either `requireTenantScope`, `resolveOwner` with the tenant bundle scope, or the
explicit authority scope shown.

| W | Symbol | File:line | Table/method | Exact current caller set | Reach/classification |
|---|---|---|---|---|---|
| W03 | `SupabaseAssetRepository.update` | `supabase-outcome-repositories.ts:141` | assets/UPDATE | `OutcomeTransactionService.createAsset`, `.commitTransaction`, `.rollbackTransaction`; `ImageEditService.uploadSourceImage`; `PreservationVerificationService.runExperiment`, `.approvePreserved` | ACTIVE_REACHABLE/material |
| W04 | `SupabaseAssetVersionRepository.create` | same`:151` | asset_versions/INSERT | the same six flows at their version-creation sites | ACTIVE_REACHABLE/material |
| W06 | `SupabaseOutcomeTransactionRepository.create` | same`:183` | outcome_transactions/INSERT | `OutcomeTransactionService.createTransaction` | ACTIVE_REACHABLE/material |
| W07 | `SupabaseTenantCoreLineageRepository.createTransaction` | `supabase-tenant-core-lineage-repository.ts:57` | outcome_transactions/INSERT | `TenantCoreLineageService.createTransaction` | DEAD_CODE_NOT_PROVEN, conservatively included/material |
| W08 | `SupabaseOutcomeTransactionRepository.updateStatus` | `supabase-outcome-repositories.ts:205` | outcome_transactions/UPDATE | outcome transaction commit/rollback and Field Beta/preservation state flows | ACTIVE_REACHABLE/material |
| W20 | `SupabaseFieldBetaRepository.createOutcome` | `supabase-field-beta-repository.ts:21` | field_outcomes/INSERT | `FieldBetaService` outcome-recording flow | ACTIVE_REACHABLE/material |
| W21 | `SupabasePartialIntentRepository.create` | `supabase-outcome-repositories.ts:215` | partial_intents/INSERT | `OutcomeTransactionService.createTransaction` | ACTIVE_REACHABLE/material |
| W22 | `SupabaseSemanticPatchRepository.create` | same`:235` | transaction_patches/INSERT | outcome transaction semantic-patch flow | ACTIVE_REACHABLE/material |
| W27 | `SupabaseAssetRepository.create` | same`:119` | assets/INSERT | three exact callers listed in section 5 | ACTIVE_REACHABLE/material |
| W28 | `SupabaseStateCommitRepository.create` | same`:387` | state_commits/INSERT | two exact callers listed in section 6 | ACTIVE_REACHABLE/wait-only |

All remaining 46 database-builder hits were classified. The following compact
manifest is exhaustive; `symbol:table:method` is exact. `T` means a tenant
bundle/explicit tenant guard, `S` system/non-BUILD002, and `P` preservation
study. `AR` means active reachable/exported, `AI` active internal, and `DNP`
means dead code not proven. For every DNP entry conservative reachability was
assumed before applying the scope test. None reads/writes a D0–D6 currentness
value or blocks on a row/table/constraint lock acquired by the 002-E graph, so
all are `CLASSIFICATION=OUTSIDE_002E_INTERSECTION`; plain MVCC reads by W09 do
not create wait edges.

```text
supabase-field-beta-repository.ts:
 createPolicy:preservation_policy_versions:INSERT:T:AR
 createStrategyRun:preservation_strategy_runs:INSERT:T:AR
 createFeedback:field_feedback:INSERT:T:AR
 createRegressionCandidate:field_regression_candidates:INSERT:T:AR
 createGoldenCase:field_golden_cases:INSERT:T:AR
 createEvaluationSample:field_evaluation_samples:INSERT:T:AR
 createEvaluationJudgment:field_evaluation_judgments:INSERT:T:AR
supabase-outcome-repositories.ts:
 SupabaseProjectRepository.create:projects:INSERT:T:AR
 SupabaseProjectRepository.update:projects:UPDATE:T:AR
 SupabaseMutationLeaseRepository.create:mutation_leases:INSERT:T:DNP
 SupabaseExecutionRunRepository.create:execution_runs:INSERT:T:AR
 SupabaseExecutionRunRepository.updateMetadata:execution_runs:UPDATE:T:AR
 SupabaseEvidenceReceiptRepository.create:evidence_receipts:INSERT:T:AR
 SupabaseVerificationRunRepository.create:verification_runs:INSERT:T:AR
 SupabaseCriterionEvidenceRepository.create:verification_criterion_evidence:INSERT:T:AR
 SupabaseCostRecordRepository.create:cost_records:INSERT:T:AR
 SupabaseMediaStorageRepository.create:media_storage:INSERT:T:AR
 SupabaseSemanticSnapshotRepository.create:semantic_snapshots:INSERT:T:AR
 SupabaseImageEvidenceRepository.create:image_evidence:INSERT:T:AR
 SupabaseCandidateAssetRepository.create:candidate_assets:INSERT:T:AR
 SupabaseCandidateAssetRepository.markCommitted:candidate_assets:UPDATE:T:AR
 SupabasePreservationRunRepository.create:preservation_runs:INSERT:T:AR
 SupabasePreservationRunRepository.update:preservation_runs:UPDATE:T:AR
 SupabasePreservationEvidenceRepository.create:preservation_evidence:INSERT:T:AR
 SupabaseCandidatePreferenceRepository.create:candidate_preferences:INSERT:T:AR
 SupabaseCandidatePreferenceRepository.recordAcceptance:candidate_preferences:UPDATE:T:AR
supabase-preservation-study-repository.ts:
 ensureStudy:preservation_value_studies:INSERT:P:AR
 createCase:preservation_study_cases:INSERT:P:AR
 createRating:preservation_study_ratings:INSERT:P:AR
 createPairwise:preservation_study_pairwise:INSERT:P:AR
 createAcceptance:preservation_study_acceptances:INSERT:P:AR
supabase-tenant-core-lineage-repository.ts:
 createProject:projects:INSERT:T:DNP
supabase-repositories.ts:
 SupabaseIntentRunRepository.create:intent_runs:INSERT:S:AR
 SupabaseIntentModelFailureRepository.create:intent_model_failures:INSERT:S:AR
 SupabaseIntentFeedbackRepository.create:intent_feedback:INSERT:S:AR
 SupabaseBenchmarkRepository.saveRun:benchmark_runs:INSERT:S:AR
 SupabaseBlindEvaluationRepository.importSet:blind_evaluation_sets:INSERT:S:AR
 SupabaseBlindEvaluationRepository.importSet:blind_evaluation_cases:INSERT:S:AR
 SupabaseBlindEvaluationRepository.importSet.rollback:blind_evaluation_sets:DELETE:S:AI
 SupabaseBlindEvaluationRepository.createSession:blind_evaluation_sessions:INSERT:S:AR
 SupabaseBlindEvaluationRepository.completeSession:blind_evaluation_sessions:UPDATE:S:AR
 SupabaseBlindEvaluationRepository.createComparison:blind_evaluation_comparisons:INSERT:S:AR
 SupabaseBlindEvaluationRepository.createJudgment:blind_evaluation_judgments:INSERT:S:AR
 SupabaseBlindEvaluationRepository.createHumanIntent:blind_evaluation_human_intents:INSERT:S:AR
 SupabaseBlindEvaluationRepository.linkHumanIntentToComparison:blind_evaluation_human_intents:UPDATE:S:AR
 SupabaseBlindEvaluationRepository.createStepRating:blind_evaluation_step_ratings:INSERT:S:AR
```

For the grouped outside-scope rows, current callers are their same-named
service methods through the active repository bundle; `AI` is called only by
its containing operation, and DNP has no current route/service construction
proven by repository-wide symbol search. This caller rule plus the exact symbol
list is the call-graph manifest, not existence-only evidence.

```text
STATIC_SEARCH_FROM_INSERT_FILES_SCANNED=170
STATIC_SEARCH_FROM_INSERT_HITS=46
STATIC_SEARCH_FROM_INSERT_CLASSIFIED=46
STATIC_SEARCH_FROM_UPDATE_FILES_SCANNED=170
STATIC_SEARCH_FROM_UPDATE_HITS=29
STATIC_SEARCH_FROM_UPDATE_CLASSIFIED=29
STATIC_SEARCH_FROM_UPSERT_FILES_SCANNED=170
STATIC_SEARCH_FROM_UPSERT_HITS=0
STATIC_SEARCH_FROM_UPSERT_CLASSIFIED=0
STATIC_SEARCH_FROM_DELETE_FILES_SCANNED=170
STATIC_SEARCH_FROM_DELETE_HITS=1
STATIC_SEARCH_FROM_DELETE_CLASSIFIED=1
STATIC_SEARCH_RPC_FILES_SCANNED=170
STATIC_SEARCH_RPC_HITS=19
STATIC_SEARCH_RPC_CLASSIFIED=19
STATIC_DML_SEARCH_UNCLASSIFIED_HITS=0
```

## 9. Trigger closure

All 34 enabled triggers on active targets are below. Event abbreviations are
from `pg_get_triggerdef`. Every installed trigger function was recursively
scanned for DML, table locks, and row-lock clauses. None performs secondary
DML or takes a row/table lock; validation reads and capability checks remain
inside the ordinary/constraint phase and introduce no reverse fence edge.

| Source | Enabled trigger(s) — event — function |
|---|---|
| asset_versions | `asset_versions_canonical_immutable_guard` — U/D — `enforce_canonical_asset_version_immutable`; `asset_versions_core_lineage_tenant_guard` — I/U — `enforce_core_lineage_tenant_consistency` |
| assets | `assets_core_lineage_tenant_guard` — I/U — `enforce_core_lineage_tenant_consistency` |
| build002_delegability_admissions | `build002_delegability_admission_immutable` — I/U/D — same-named function |
| build002_delegation_readiness | `build002_delegation_readiness_immutable_update` — U/D — `build005_immutable_insert_only` |
| build002_dependency_requirements | `build002_dependency_requirements_immutable_update` — U/D — same immutable function |
| build002_dependency_signals | `build002_dependency_signals_immutable_update` — U/D — same |
| build002_dependency_snapshots | `build002_dependency_snapshots_immutable_update` — U/D — same |
| build002_execution_attempt_consumptions | `build002_execution_attempt_consumptions_append_only` — I/U/D — `build002_d6_append_only_guard` |
| build002_execution_attempt_reservations | `build002_execution_attempt_reservations_append_only` — I/U/D — same |
| build002_execution_authorities | `build002_execution_authority_immutable` — I/U/D — same-named function |
| build002_mutation_leases | `build002_mutation_lease_immutable` — I/U/D — same-named function |
| build002_qualification_signals | `build002_qualification_signals_immutable_update` — U/D — `build005_immutable_insert_only` |
| build002_readiness_authority_commits | `build002_readiness_authority_commit_immutable` — I/U/D — same-named; `build002_readiness_authority_marker_graph_coherent` — I — same-named |
| build002_readiness_qualifications | `build002_readiness_qualifications_immutable_update` — U/D — `build005_immutable_insert_only` |
| build002_signal_qualifications | `build002_signal_qualifications_immutable_update` — U/D — same |
| build002_signal_requirements | `build002_signal_requirements_immutable_update` — U/D — same |
| build002_signals | `build002_signals_immutable_update` — U/D — same |
| field_outcomes | `field_outcomes_immutable_update` — U/D — same; `field_outcomes_trust_lineage_guard` — I/U — `enforce_field_trust_lineage` |
| outcome_blueprints | `outcome_blueprints_immutable` — U/D — `build002_catalog_immutable`; `outcome_blueprints_lineage` — I — `build002_enforce_outcome_blueprint_lineage` |
| outcome_requirement_profiles | `outcome_requirement_profiles_immutable` — U/D — `build002_catalog_immutable`; `outcome_requirement_profiles_lineage` — I — `build002_enforce_outcome_requirement_profile_lineage` |
| outcome_transaction_requirement_bindings | `outcome_transaction_requirement_bindings_immutable` — U/D — `build002_binding_immutable`; `outcome_transaction_requirement_bindings_profile_guard` — I — `build002_binding_profile_blueprint_guard`; `outcome_transaction_requirement_bindings_tenant_guard` — I — `build002_binding_tenant_transaction_guard` |
| outcome_transactions | `outcome_transactions_core_lineage_tenant_guard` — I/U — `enforce_core_lineage_tenant_consistency` |
| partial_intents | `partial_intents_trust_owner_guard` — I/U — `enforce_transaction_scoped_owner` |
| state_commits | `state_commits_immutable_guard` — U/D — `enforce_state_commit_immutable`; `state_commits_trust_lineage_guard` — I/U — `enforce_state_commit_lineage`; `state_commits_trust_owner_guard` — I/U — `enforce_transaction_scoped_owner` |
| transaction_patches | `transaction_patches_trust_owner_guard` — I/U — `enforce_transaction_scoped_owner` |

Tables with no row have zero enabled triggers. `SECONDARY_TABLE_WRITES=NONE` and
`LOCK_RELEVANCE=VALIDATION_READ_ONLY` apply to every row.

```text
ACTIVE_TRIGGER_PATHS_TOTAL=34
ACTIVE_TRIGGER_PATHS_MAPPED=34
UNMAPPED_TRIGGER_SIDE_EFFECTS=0
UNACCOUNTED_TRIGGER_WAIT_EDGES=0
```

## 10. Active and historical target manifest

`T` below is enabled trigger count. `Class` is the represented material class;
`evidence` means no additional class. Every row is wait-relevant through its
writer row/constraint phase even when `T=0`.

| Table | Active writers | T | Historical-only writer | Class |
|---|---|---:|---|---|
| tenants | W01 | 0 | none | 1 |
| tenant_memberships | W01,W02 | 0 | none | 1 |
| assets | W03,W05,W09,W27 | 1 | none | 3 |
| asset_versions | W04,W05,W09 | 2 | none | 4 |
| outcome_transactions | W06,W07,W08,W09 | 1 | none | 2 |
| state_commits | W09,W28 | 3 | none | evidence/wait-only for W28 |
| outcome_transaction_requirement_bindings | W10 | 3 | none | 5 |
| outcome_blueprints | W11 | 2 | none | 6 |
| outcome_requirement_profiles | W12 | 2 | none | 6 |
| build002_signal_requirements | W13,W18 | 1 | none | 7 |
| build002_signals | W14,W18 | 1 | none | 8 |
| build002_dependency_snapshots | W15,W18 | 1 | none | 9 |
| build002_dependency_requirements | W15,W18 | 1 | none | 9 |
| build002_dependency_signals | W15,W18 | 1 | none | 9 |
| build002_signal_qualifications | W16,W18 | 1 | none | 10 |
| build002_qualification_signals | W16,W18 | 1 | none | 10 |
| build002_delegation_readiness | W17,W18 | 1 | none | 10 |
| build002_readiness_qualifications | W17,W18 | 1 | none | 10 |
| build002_readiness_authority_commits | W18 | 2 | none | 11 |
| build002_delegability_admissions | W19 | 1 | none | 12 |
| field_outcomes | W20 | 2 | none | 13 |
| partial_intents | W21 | 1 | none | 14 |
| transaction_patches | W22 | 1 | none | 14 |
| build002_execution_authorities | W23 | 1 | none | 15 |
| build002_mutation_leases | W24 | 1 | none | 16 |
| build002_execution_attempt_reservations | W25 | 1 | none | 17 |
| build002_execution_attempt_consumptions | W26 | 1 | none | 17 |

`candidate_assets` is the single historical-only 002-E target: pre-F1 W09
bodies updated it; the installed W09 does not. Current application
`create`/`markCommitted` remain globally active but are outside the 002-E
intersection because installed W09 performs a plain MVCC read, does not filter
on `committed`, and takes no candidate row/table lock. Its two unique sites and
six FKs therefore do not enter active 002-E constraint totals.

```text
ACTIVE_WRITE_TARGETS_TOTAL=27
HISTORICAL_ONLY_WRITE_TARGETS_TOTAL=1
```

## 11. Effective UNIQUE/EXCLUDE and FK inventories

The following is the complete catalog enumeration of active UNIQUE/EXCLUDE
sites. Names in each row are exact; `pkey` entries are included. There are 52
PK/UNIQUE constraints, three standalone unique indexes, and no EXCLUDE site.

| Table | Count | Exact names |
|---|---:|---|
| tenants | 2 | `tenants_pkey`; `tenants_personal_owner_principal_idx` |
| tenant_memberships | 2 | `tenant_memberships_pkey`; `tenant_memberships_tenant_id_principal_id_key` |
| assets | 1 | `assets_pkey` |
| asset_versions | 2 | `asset_versions_pkey`; `asset_versions_asset_id_version_number_key` |
| outcome_transactions | 2 | `outcome_transactions_pkey`; `outcome_transactions_owner_id_uq` |
| state_commits | 2 | `state_commits_pkey`; `state_commits_transaction_id_key` |
| outcome_transaction_requirement_bindings | 1 | `outcome_transaction_requirement_bindings_pkey` |
| outcome_blueprints | 2 | `outcome_blueprints_pkey`; `outcome_blueprints_id_version_hash_key` |
| outcome_requirement_profiles | 2 | `outcome_requirement_profiles_pkey`; `outcome_requirement_profiles_id_version_hash_key` |
| build002_signal_requirements | 4 | `build002_signal_requirements_pkey`; `build002_requirements_exact_address_uq`; `build002_signal_requirements_owner_tenant_id_outcome_trans_key1`; `build002_signal_requirements_owner_tenant_id_outcome_transa_key` |
| build002_signals | 4 | `build002_signals_pkey`; `build002_signals_exact_address_uq`; `build002_signals_owner_tenant_id_outcome_transaction_id_si_key1`; `build002_signals_owner_tenant_id_outcome_transaction_id_sig_key` |
| build002_dependency_snapshots | 4 | `build002_dependency_snapshots_pkey`; `build002_dependency_snapshots_owner_tenant_id_outcome_tran_key1`; `build002_dependency_snapshots_owner_tenant_id_outcome_tran_key2`; `build002_dependency_snapshots_owner_tenant_id_outcome_trans_key` |
| build002_dependency_requirements | 1 | `build002_dependency_requirements_pkey` |
| build002_dependency_signals | 1 | `build002_dependency_signals_pkey` |
| build002_signal_qualifications | 2 | `build002_signal_qualifications_pkey`; `build002_signal_qualification_owner_tenant_id_outcome_trans_key` |
| build002_qualification_signals | 1 | `build002_qualification_signals_pkey` |
| build002_delegation_readiness | 2 | `build002_delegation_readiness_pkey`; `build002_delegation_readiness_owner_tenant_id_outcome_trans_key` |
| build002_readiness_qualifications | 1 | `build002_readiness_qualifications_pkey` |
| build002_readiness_authority_commits | 2 | `build002_readiness_authority_commits_pkey`; `build002_readiness_authority__owner_tenant_id_outcome_trans_key` |
| build002_delegability_admissions | 2 | `build002_delegability_admissions_pkey`; `build002_delegability_admissi_owner_tenant_id_authority_com_key` |
| field_outcomes | 2 | `field_outcomes_pkey`; `field_outcomes_transaction_id_key` |
| partial_intents | 1 | `partial_intents_pkey` |
| transaction_patches | 1 | `transaction_patches_pkey` |
| build002_execution_authorities | 2 | `build002_execution_authorities_pkey`; `build002_execution_authorities_idempotency_key_key` |
| build002_mutation_leases | 2 | `build002_mutation_leases_pkey`; `build002_mutation_leases_execution_authority_id_target_path_key` |
| build002_execution_attempt_reservations | 4 | `build002_execution_attempt_reservations_pkey`; `build002_execution_attempt_reservation_execution_attempt_id_key`; `build002_execution_attempt_reservations_mutation_lease_id_key`; `build002_execution_attempt_reservations_pair_uidx` |
| build002_execution_attempt_consumptions | 3 | `build002_execution_attempt_consumptions_pkey`; `build002_execution_attempt_consumption_execution_attempt_id_key`; `build002_execution_attempt_consumptions_reservation_id_key` |

Every insert has a common prewrite fence for its exact conflict scope; generated
IDs are server-owned/preallocated. Existing-row updates cannot change indexed
keys. W01 uses the principal fence before the partial personal-owner unique
index. W09/W28 use the transaction fence before the StateCommit unique key.
All sites classify `ACTIVE_CONFLICT_POSSIBLE` for insert paths or
`KEY_IMMUTABLE_FOR_ACTIVE_WRITER`; none is excluded merely because contention
seems unlikely.

```text
ACTIVE_UNIQUE_EXCLUSION_SITES_TOTAL=55
ACTIVE_UNIQUE_EXCLUSION_SITES_ACCOUNTED=55
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
```

The complete FK count by active child table is below. The catalog manifest hash
binds every exact name and definition. Parent rows are locked after all fences,
before children, in the ordinary order; same-transaction parents precede their
children. No active writer changes a referenced PK/unique key.

| Table | FK count | Constraint classification/accounting |
|---|---:|---|
| tenants | 1 | auth principal; external environmental, exact key lock/fail closed |
| tenant_memberships | 2 | tenant + auth principal |
| assets | 3 | tenant, project, current version |
| asset_versions | 3 | tenant, asset, previous version |
| outcome_transactions | 4 | tenant, project, asset, base version |
| state_commits | 5 | tenant, transaction, asset, new and previous versions |
| outcome_transaction_requirement_bindings | 4 | tenant, transaction, blueprint triple, profile triple |
| outcome_blueprints | 0 | none |
| outcome_requirement_profiles | 1 | blueprint triple |
| build002_signal_requirements | 2 | tenant, transaction |
| build002_signals | 4 | tenant, transaction, requirement address, exact requirement hash |
| build002_dependency_snapshots | 2 | tenant, transaction |
| build002_dependency_requirements | 2 | snapshot, requirement address |
| build002_dependency_signals | 3 | snapshot, signal address, exact signal hash |
| build002_signal_qualifications | 5 | tenant, transaction, requirement, snapshot, exact requirement hash |
| build002_qualification_signals | 3 | qualification address/hash, signal address, exact signal hash |
| build002_delegation_readiness | 3 | tenant, transaction, snapshot/hash |
| build002_readiness_qualifications | 2 | readiness/hash, qualification/hash |
| build002_readiness_authority_commits | 4 | auth principal, transaction, snapshot/hash, readiness/hash |
| build002_delegability_admissions | 6 | tenant, auth principal, membership, authority commit, transaction, readiness/hash |
| field_outcomes | 5 | transaction, source version, raw candidate, delivered candidate, tenant |
| partial_intents | 2 | transaction, tenant |
| transaction_patches | 2 | transaction, tenant |
| build002_execution_authorities | 8 | tenant, auth principal, member, D3, D0, asset, source version, transaction |
| build002_mutation_leases | 9 | preceding eight lineage parents plus D4 authority |
| build002_execution_attempt_reservations | 11 | complete D5 lineage plus transaction/attempt parents |
| build002_execution_attempt_consumptions | 6 | reservation/pair, tenant, D5, D4, D0 |

Exact FK-name manifest, grouped by child table (empty means zero):

```text
tenants=tenants_personal_owner_principal_id_fkey
tenant_memberships=tenant_memberships_principal_id_fkey,tenant_memberships_tenant_id_fkey
assets=assets_owner_tenant_id_fkey,assets_project_id_fkey,fk_assets_current_version
asset_versions=asset_versions_asset_id_fkey,asset_versions_owner_tenant_id_fkey,asset_versions_parent_version_id_fkey
outcome_transactions=outcome_transactions_asset_id_fkey,outcome_transactions_base_version_id_fkey,outcome_transactions_owner_tenant_id_fkey,outcome_transactions_project_id_fkey
state_commits=state_commits_asset_id_fkey,state_commits_new_version_id_fkey,state_commits_owner_tenant_id_fkey,state_commits_previous_version_id_fkey,state_commits_transaction_id_restrict_fkey
outcome_transaction_requirement_bindings=outcome_transaction_requireme_blueprint_id_blueprint_versi_fkey,outcome_transaction_requireme_owner_tenant_id_outcome_tran_fkey,outcome_transaction_requireme_requirement_profile_id_requi_fkey,outcome_transaction_requirement_bindings_owner_tenant_id_fkey
outcome_blueprints=
outcome_requirement_profiles=outcome_requirement_profiles_blueprint_id_blueprint_versio_fkey
build002_signal_requirements=build002_signal_requirements_owner_tenant_id_fkey,build002_signal_requirements_owner_tenant_id_outcome_trans_fkey
build002_signals=build002_signals_exact_requirement_fk,build002_signals_owner_tenant_id_fkey,build002_signals_owner_tenant_id_outcome_transaction_id_fkey,build002_signals_owner_tenant_id_outcome_transaction_id_re_fkey
build002_dependency_snapshots=build002_dependency_snapshots_owner_tenant_id_fkey,build002_dependency_snapshots_owner_tenant_id_outcome_tran_fkey
build002_dependency_requirements=build002_dependency_requirem_owner_tenant_id_outcome_tran_fkey1,build002_dependency_requireme_owner_tenant_id_outcome_tran_fkey
build002_dependency_signals=build002_dependency_signals_exact_signal_fk,build002_dependency_signals_owner_tenant_id_outcome_trans_fkey1,build002_dependency_signals_owner_tenant_id_outcome_transa_fkey
build002_signal_qualifications=build002_qualifications_exact_requirement_fk,build002_signal_qualificatio_owner_tenant_id_outcome_tran_fkey1,build002_signal_qualificatio_owner_tenant_id_outcome_tran_fkey2,build002_signal_qualification_owner_tenant_id_outcome_tran_fkey,build002_signal_qualifications_owner_tenant_id_fkey
build002_qualification_signals=build002_qualification_signa_owner_tenant_id_outcome_tran_fkey1,build002_qualification_signal_owner_tenant_id_outcome_tran_fkey,build002_qualification_signals_exact_signal_fk
build002_delegation_readiness=build002_delegation_readines_owner_tenant_id_outcome_tran_fkey1,build002_delegation_readiness_owner_tenant_id_fkey,build002_delegation_readiness_owner_tenant_id_outcome_tran_fkey
build002_readiness_qualifications=build002_readiness_qualifica_owner_tenant_id_outcome_tran_fkey1,build002_readiness_qualificat_owner_tenant_id_outcome_tran_fkey
build002_readiness_authority_commits=build002_readiness_authority__owner_tenant_id_outcome_tran_fkey,build002_readiness_authority_commits_principal_id_fkey,build002_readiness_authority_owner_tenant_id_outcome_tran_fkey1,build002_readiness_authority_owner_tenant_id_outcome_tran_fkey2
build002_delegability_admissions=build002_delegability_admiss_owner_tenant_id_outcome_tran_fkey1,build002_delegability_admissi_owner_tenant_id_outcome_tran_fkey,build002_delegability_admissions_authority_commit_id_fkey,build002_delegability_admissions_membership_id_fkey,build002_delegability_admissions_owner_tenant_id_fkey,build002_delegability_admissions_principal_id_fkey
field_outcomes=field_outcomes_delivered_candidate_id_fkey,field_outcomes_owner_tenant_id_fkey,field_outcomes_raw_candidate_id_fkey,field_outcomes_source_version_id_fkey,field_outcomes_transaction_id_fkey
partial_intents=partial_intents_owner_tenant_id_fkey,partial_intents_transaction_id_fkey
transaction_patches=transaction_patches_owner_tenant_id_fkey,transaction_patches_transaction_id_fkey
build002_execution_authorities=build002_execution_authoritie_owner_tenant_id_outcome_tran_fkey,build002_execution_authorities_asset_id_fkey,build002_execution_authorities_authority_commit_id_fkey,build002_execution_authorities_delegability_admission_id_fkey,build002_execution_authorities_membership_id_fkey,build002_execution_authorities_owner_tenant_id_fkey,build002_execution_authorities_principal_id_fkey,build002_execution_authorities_source_asset_version_id_fkey
build002_mutation_leases=build002_mutation_leases_asset_id_fkey,build002_mutation_leases_authority_commit_id_fkey,build002_mutation_leases_delegability_admission_id_fkey,build002_mutation_leases_execution_authority_id_fkey,build002_mutation_leases_membership_id_fkey,build002_mutation_leases_owner_tenant_id_fkey,build002_mutation_leases_owner_tenant_id_outcome_transacti_fkey,build002_mutation_leases_principal_id_fkey,build002_mutation_leases_source_asset_version_id_fkey
build002_execution_attempt_reservations=build002_execution_attempt_re_owner_tenant_id_outcome_tran_fkey,build002_execution_attempt_reser_delegability_admission_id_fkey,build002_execution_attempt_reserva_source_asset_version_id_fkey,build002_execution_attempt_reservat_execution_authority_id_fkey,build002_execution_attempt_reservat_outcome_transaction_id_fkey,build002_execution_attempt_reservation_authority_commit_id_fkey,build002_execution_attempt_reservations_asset_id_fkey,build002_execution_attempt_reservations_membership_id_fkey,build002_execution_attempt_reservations_mutation_lease_id_fkey,build002_execution_attempt_reservations_owner_tenant_id_fkey,build002_execution_attempt_reservations_principal_id_fkey
build002_execution_attempt_consumptions=build002_execution_attempt_co_reservation_id_execution_att_fkey,build002_execution_attempt_consumpt_execution_authority_id_fkey,build002_execution_attempt_consumption_authority_commit_id_fkey,build002_execution_attempt_consumptions_mutation_lease_id_fkey,build002_execution_attempt_consumptions_owner_tenant_id_fkey,build002_execution_attempt_consumptions_reservation_id_fkey
```

R4's expected 98 was not forced. After removing six historical
`candidate_assets` FKs, the catalog still yields 102 because R4 had also
omitted four active constraints: one each on `build002_signals`,
`build002_dependency_signals`, `build002_signal_qualifications`, and
`build002_qualification_signals`. All 102 are mapped as
`ACTIVE_CONFLICT_POSSIBLE`, `KEY_IMMUTABLE_FOR_ACTIVE_WRITER`,
`SAME_TRANSACTION_ONLY`, `PARENT_ALREADY_COMMON_FENCED`, or
`EXTERNAL_ENVIRONMENTAL`; none is `NO_ACTIVE_WRITER`.

Seven active FKs reference `auth.users`. BUILD002 does not own concurrent Auth
mutation and makes no serialization claim over it. Exact parent key-share or
stronger locks are acquired only after all canonical fences. Auth cannot
acquire BUILD002 fences or manufacture authority; deletion/key mutation causes
the protected operation to wait or fail closed and cannot create a reverse
cycle.

```text
ACTIVE_FK_SITES_TOTAL=102
ACTIVE_FK_SITES_ACCOUNTED=102
UNACCOUNTED_FK_WAIT_EDGES=0
AUTH_USERS_CONCURRENT_MUTATION_IN_BUILD002_CONTROL=NO
AUTH_USERS_FK_WAIT_EDGE_ACCOUNTED=YES
```

## 12. One complete acyclic wait graph

Every protected operation performs: isolation guard; non-authoritative
discovery/server preallocation; fence identity validation/deduplication/sort;
idempotent fence bootstrap in sorted order; all fence-row `FOR UPDATE` locks in
that order; complete post-fence identity rederivation with restart on change;
ordinary existing-row and FK-parent plan; ordinary locks in canonical
parent-before-child/table/PK order; post-fence authoritative reread; mutation
and evidence. No operation acquires a fence after entering ordinary,
trigger/function, unique, or FK phases.

Effective `LOCK TABLE` inspection finds 23 statement occurrences but eight
distinct `(table,SHARE)` graph edges: signal requirements, signals, dependency
snapshots, signal qualifications, delegation readiness, field outcomes,
transaction patches, and partial intents. D3 current/legacy and D4/D5 wrappers
repeat five of them; D5 adds the final three. Future 002-E replaces/narrows all
eight distinct edges with exact universe fences/rows before downstream locks.

The nine active phantom sets remain: signal requirements, signals, dependency
snapshots, qualifications, readiness, field outcomes/TaskSpec, partial intents,
transaction patches, and attempt reservations. Their universe/scope fences
close inserts under `READ COMMITTED`. W28 is an exact row/unique/FK operation,
not a new phantom class.

```text
LEGACY_WAIT_EDGES_TOTAL=8
LEGACY_WAIT_EDGES_CLOSED=8
ACTIVE_BROAD_TABLE_LOCK_STATEMENTS_TOTAL=23
ACTIVE_BROAD_TABLE_LOCKS_TOTAL=8
ACTIVE_BROAD_TABLE_LOCKS_ACCOUNTED=8
UNACCOUNTED_ACTIVE_BROAD_LOCKS=0
ACTIVE_PHANTOM_PATHS_TOTAL=9
ACTIVE_PHANTOM_PATHS_COVERED=9
PHANTOM_INSERT_GAP=0
REVERSE_FENCE_EDGE_COUNT=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
UNACCOUNTED_FK_WAIT_EDGES=0
UNACCOUNTED_TRIGGER_WAIT_EDGES=0
UNACCOUNTED_NESTED_FUNCTION_WAIT_EDGES=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES
```

Fence DML is owner-only `SECURITY DEFINER` with pinned `search_path`, explicit
function-body isolation guard, no public direct table DML, minimum function
execute grants, deny-by-default kind/schema validation, and append-only
evidence guards. Public/anon/authenticated cannot forge fences, counters, or
evidence.

```text
FENCE_ACL_CONTRACT_CLOSED=YES
```

## 13. Verification matrix

E01–E10 remain required: mutation-before-admission, admission-before-mutation,
rejection/evidence, 40001 full restart, D6 exact duplicate, D6 distinct valid
attempt, clock expiry, fence bootstrap, ACL/forgery, and full durable-order
reconstruction. I01–I04 remain required isolation/runtime tests. C01 retains
the W01 duplicate-personal-tenant plus W02 revocation barriers. C02 retains W27
asset create versus head/version/transaction contention.

Constraint-derived C03 is no longer a generic assumed count. It parameterizes
all 55 unique/exclusion and 102 FK sites from the effective manifest, including
same-key insert, parent delete/key-change, same-transaction parent/child, and
immutable-key cases, and asserts zero deadlocks/timeouts/reverse fence edges.

- `C_STATE_01`: W09 versus W28 for the same transaction; both stop at the same
  outcome-transaction fence before the StateCommit unique insert; the loser
  rereads and follows existing business semantics.
- `C_STATE_02`: W28 versus transaction/asset/new-version/previous-version
  parent mutation; every session shares an existing fence before the sorted
  exact parent locks; delete/key change waits or fails closed.

```text
E_TESTS_REQUIRED=E01-E10
ISOLATION_TESTS_REQUIRED=I01-I04
C01_W01_REQUIRED=YES
C02_W27_REQUIRED=YES
EFFECTIVE_C03_REQUIRED=YES
W28_CONCURRENCY_TESTS_REQUIRED=YES
```

## 14. Ten parent-traceable requirements and scope firewall

| ID | Requirement | Parent trace |
|---|---|---|
| `002E-R01` | pin/guard READ COMMITTED and restart whole DB operation on 40001 | PostgreSQL transaction-bound revalidation |
| `002E-R02` | every material writer and intersecting DB wait participant joins sufficient canonical synchronization | dependency/admission race closure |
| `002E-R03` | deterministic total graph covers fence bootstrap/rows, ordinary rows/tables, triggers/nested functions, UNIQUE/EXCLUDE, and FK waits | concrete PostgreSQL linearization/deadlock stop |
| `002E-R04` | post-fence D0–D6 reread is authoritative; changed fence identity restarts | stale-currentness prohibition |
| `002E-R05` | revisions/evidence reconstruct durable order from canonical DB state | auditable proof requirement |
| `002E-R06` | W01/W02 share principal pre-identity synchronization without creating authority | tenant authority correctness |
| `002E-R07` | D6 retry semantics and exact-duplicate consumption remain unchanged | no 002-R/D7/C2 scope theft |
| `002E-R08` | owner-only ACL/capability/immutability controls prevent forged synchronization evidence | fail-closed authority |
| `002E-R09` | PostgreSQL 17 verification includes mutation-surface drift and effective-schema constraint proof | executable adversarial E3 proof |
| `002E-R10` | Field Beta reachability and provider-result retry remain firewalled | explicit parent non-scope |

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
```

## 15. Creation gates and authorization

```text
UNCLASSIFIED_REACHABLE_DML_PATHS=0
UNMAPPED_MATERIAL_WRITER_PATHS=0
UNMAPPED_WAIT_GRAPH_PARTICIPANTS=0
UNMAPPED_TRIGGER_SIDE_EFFECTS=0
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
UNACCOUNTED_FK_WAIT_EDGES=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES
STATIC_DML_SEARCH_UNCLASSIFIED_HITS=0

PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
NEXT_GATE=BUILD002_002E_SPEC_R5_CANONICALIZATION_R1
```

R5 stops at candidate creation. Canonicalization and implementation require
their own subsequent authority.
