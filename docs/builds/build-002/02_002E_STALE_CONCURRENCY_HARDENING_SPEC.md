# BUILD002 002-E — effective lock-footprint closure specification R6

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R6
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R5=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. R6 is design and verification
authority for independent canonicalization only. It does not authorize product
implementation, migrations, application changes, 002-R, D7, or C2.

R1 `8ba2f7877dcfabfa471c82bfc81c12fffdf41518`, R2
`30f4da7e3bb47a6674c3ae7ed4f3d388671d2c39`, R3
`883edf35ce43446d4b722310421200cbc4dc070d`, R4
`8fa0243075d0e1565d53dea8c9f7ea44cefe125b`, and R5
`42045014e72e9b6f99c28a7c34aafe9a527ad6ec` were not canonicalized. None is
an ancestor of R6; each is evidence only. R6 starts directly from canonical
main commit `58e69b4d7d683412a0bfa60b5121be82d5426eaa`, tree
`a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884`.

## 1. Parent authority, invariant, and scope

Primary parent authority is `docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md`
at historical commit `2057ffeb4b63e878379da2e25c2252be2707a125`, blob
`589d406f78423367259d07dc759eb3f97fdee349`, raw/LF SHA-256
`4c29606d8ba5a0b15255db1bd1340e62a35a9515f7870ffa012c9553c85c39e2`.
Supporting objective is `docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md`
at commit `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`, blob
`bfe82d08adc29b8fe032f5a39c5e24620b1257a8`, raw/LF SHA-256
`b75fdee1266185cd1e7fa197ca2b9222576f3e77d0d15820e9d3f2381f5bc977`.

The inherited invariant remains exactly:

```text
dependency changes
+ READY -> execution-admission races
serialize at a concrete PostgreSQL linearization point
with no partial reservation/run
```

R6 repairs the R5 inventory method. It never treats different target tables as
proof of lock disjointness. Every globally reachable DML entry receives a
transitive PostgreSQL lock footprint before it is classified. A lock conflict
is not materiality, and a one-way wait is not automatically a cycle or a reason
to create a fence.

```text
WAIT_INTERSECTION_NEVER_EQUATED_TO_MATERIALITY=YES
ROW_LOCK_COMPATIBILITY_MODEL=POSTGRESQL17
POSTGRES_INTERNAL_FK_CHECK_ORDER_IS_AUTHORITY=NO
GENERIC_DATABASE_GOVERNANCE_PLATFORM_CREATED=NO
GENERIC_LOCK_SERVICE_CREATED=NO
GENERIC_AUDIT_PLATFORM_CREATED=NO
002E_SCOPE_EXPANSION_FOUND=NO
```

## 2. Effective-schema evidence

An ephemeral empty PostgreSQL 17.10 database replayed all 41 migrations from
the pinned base, in filename order, with only these Supabase environmental
stubs: roles `anon`, `authenticated`, `service_role`; `auth.users(id uuid
primary key)`; `auth.uid()`; and `storage.buckets`. No public/repository-owned
object was preloaded. Replay was 41/41 PASS.

The effective inventory was derived from `pg_proc`, `pg_trigger`,
`pg_constraint`, `pg_index`, `pg_class`, `pg_namespace`, `pg_depend`, and
`information_schema`, using `pg_get_functiondef`, `pg_get_triggerdef`,
`pg_get_constraintdef`, and `pg_get_indexdef`. R5's effective-schema evidence
remains independently reproduced:

```text
CLEAN_MIGRATION_REPLAY=41/41_PASS
POSTGRESQL_VERSION=17.10
POSTGRESQL_VERSION_NUM=170010
EFFECTIVE_SCHEMA_SOURCE=POSTGRESQL17_CLEAN_REPLAY
EFFECTIVE_DB_MUTATION_MANIFEST_HASH=4b3242cb928cef14e23263bc5c9505ce695ba3a19f12687a120814ff1585a1e7
EFFECTIVE_CONSTRAINT_MANIFEST_HASH=0093b41e308aab9474975473ba746de288baaad3619d31ffc642d1786b8b414f
EFFECTIVE_SCOPED_SQL_MUTATOR_OBJECTS=21
EFFECTIVE_PROTECTED_TARGET_TRIGGERS=34
```

## 3. PostgreSQL lock model and lock-footprint record

The compatibility model is PostgreSQL 17's model, not a project-defined
substitute.

| Requested/current row mode | `KEY SHARE` | `SHARE` | `NO KEY UPDATE` | `UPDATE` |
|---|---:|---:|---:|---:|
| `KEY SHARE` | compatible | compatible | compatible | conflict |
| `SHARE` | compatible | compatible | conflict | conflict |
| `NO KEY UPDATE` | compatible | conflict | conflict | conflict |
| `UPDATE` | conflict | conflict | conflict | conflict |

For each operation the canonical record binds:

```text
kind
source file:line and symbol or effective function signature
reachability
operation and target table(s)
material/wait/one-way/disjoint classification
target table lock
target row mode and updated columns
every UNIQUE/EXCLUDE site
every effective FK child key, parent identity source, and KEY SHARE check
every applicable enabled trigger plus trigger-function definition hash
every nested function plus effective-definition hash
explicit table and row locks
required canonical fence set
cycle-capable result and reverse-edge proof
```

INSERT/UPDATE/DELETE obtain `ROW EXCLUSIVE` on their target table. INSERT binds
new/speculative tuple and unique-index waits. UPDATE is `FOR NO KEY UPDATE`
unless it changes a referenced PK/unique key; DELETE is `FOR UPDATE`. FK checks
are modeled as exact parent `FOR KEY SHARE` locks. Trigger and nested function
closure continues to a fixpoint.

The canonical JSON uses lexicographically sorted operation records, stable
object-key order, UTF-8, and no insignificant whitespace. Its SHA-256 is:

```text
LOCK_FOOTPRINT_MANIFEST_RECORDS=75
LOCK_FOOTPRINT_MANIFEST_SHA256=d05ac499591c93b987c00dda54a1c7da18784e5a67bc56e065a9c6490b5f6e51
LOCK_FOOTPRINT_TRANSITIVE_CLOSURE_REACHED=YES
```

## 4. Global operation inventory and four semantic classes

Fresh scanning of 170 TypeScript/JavaScript files found 56 actual Supabase
mutation builders and 19 application RPC call sites. The 56 are the exact
database-building subset of 46 `.insert(` tokens, 29 `.update(` tokens, zero
`.upsert(` tokens, one `.delete(` token, after removing 20 crypto,
repository-interface, and in-memory false positives. The 19 `.rpc(` tokens are
all classified. The total operation identity is source symbol plus operation
and target/RPC, not merely a count.

```text
GLOBAL_REACHABLE_DML_PATHS_TOTAL=75
DIRECT_MUTATION_BUILDERS_TOTAL=56
RPC_ENTRY_OPERATIONS_TOTAL=19
UNCLASSIFIED_LOCK_FOOTPRINT_PATHS=0

MATERIAL_WRITER_PATHS_TOTAL=27
SYNCHRONIZED_WAIT_PARTICIPANTS_TOTAL=14
PROVEN_ONE_WAY_WAIT_PATHS_TOTAL=10
DISJOINT_REACHABLE_DML_PATHS_TOTAL=24
PROTECTED_GRAPH_OPERATIONS_TOTAL=41
```

The classes mean:

- `MATERIAL_WRITER`: changes one of the seventeen D0–D6 classes and must join
  canonical synchronization;
- `SYNCHRONIZED_WAIT_PARTICIPANT`: non-material, but a bidirectional ordering
  dependency or protected unique/FK interaction requires canonical fences;
- `PROVEN_ONE_WAY_WAIT`: can wait against protected locks, but has no reverse
  dependency, material effect, admission-order effect, or timeout-based
  correctness;
- `DISJOINT`: no conflicting protected lock footprint and no currentness
  relation.

For every one-way record:

```text
CURRENTNESS_EFFECT=NONE
REVERSE_WAIT_EDGE=NONE
CYCLE_CAPABLE=NO
PROVIDER_ADMISSION_ORDER_EFFECT=NONE
WAIT_TIMEOUT_USED_AS_CORRECTNESS=NO
```

## 5. Material and synchronized protected set

The material set remains exact:

| IDs | Operations |
|---|---|
| W01–W05 | personal tenant provision; membership revoke; asset update; version create; atomic asset/version RPC |
| W06–W10 | two transaction creates; transaction status update; canonical outcome commit; requirement binding |
| W11–W15 | blueprint/profile publication; requirement/signal/snapshot inserts |
| W16–W19 | qualification/readiness/D0 authority/D3 admission |
| W20–W22 | field outcome, partial intent, semantic patch |
| W23–W26 | D4 authority, D5 lease, D6 reserve, D6 consume |
| W27 | `SupabaseAssetRepository.create` |

W07 remains conservatively included even though active service/route
construction is dead-code-not-proven. It is not excluded on reachability.

W28, `SupabaseStateCommitRepository.create`, remains the original R5
non-material synchronized participant and is one of fourteen in R6. It shares
`state_commits(transaction_id)` and five
FK parents with W09. Its exact existing fence set is
`TENANT_AUTHORITY`, `OUTCOME_TRANSACTION`, `ASSET_HEAD`,
`SOURCE_ASSET_VERSION(new)`, and `SOURCE_ASSET_VERSION(previous)`. It advances
no material revision and changes no D0–D6 currentness value.
Its exact current callers remain `OutcomeTransactionService.commitTransaction`
and `PreservationVerificationService.approvePreserved`.

```text
UNMAPPED_MATERIAL_WRITER_PATHS=0
W28_002E_ROLE=WAIT_GRAPH_ONLY
W28_NEW_MATERIAL_CLASS_CREATED=NO
W28_REQUIRED_FENCE_SET_COMPLETE=YES
W28_UNACCOUNTED_WAIT_EDGES=0
```

## 6. Thirteen newly synchronized wait participants

R6 does not assume an internal ordering among multiple RI triggers. If an
outside INSERT has two or more FK parents that protected paths can lock
conflictively, it can hold `KEY SHARE` on one parent, wait on another, and form
the reverse half of a cycle with a protected path acquiring those parents in
canonical order. Those operations must join synchronization and explicitly
lock/revalidate their parents before child DML.

| # | Operation / target | Conflicting FK parents | Existing required fences |
|---:|---|---|---|
| S01 | `SupabaseFieldBetaRepository.createStrategyRun` / preservation_strategy_runs | tenant, transaction | `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION` |
| S02 | `SupabaseMutationLeaseRepository.create` / mutation_leases | tenant, transaction | same |
| S03 | `SupabaseExecutionRunRepository.create` / execution_runs | tenant, transaction | same |
| S04 | `SupabaseEvidenceReceiptRepository.create` / evidence_receipts | tenant, transaction, base version | `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION`, `SOURCE_ASSET_VERSION` |
| S05 | `SupabaseVerificationRunRepository.create` / verification_runs | tenant, transaction | `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION` |
| S06 | `SupabaseCriterionEvidenceRepository.create` / verification_criterion_evidence | tenant, transaction | same |
| S07 | `SupabaseCostRecordRepository.create` / cost_records | tenant, transaction | same |
| S08 | `SupabaseMediaStorageRepository.create` / media_storage | tenant, asset | `TENANT_AUTHORITY`, `ASSET_HEAD` |
| S09 | `SupabaseSemanticSnapshotRepository.create` / semantic_snapshots | tenant, transaction | `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION` |
| S10 | `SupabaseCandidateAssetRepository.create` / candidate_assets | tenant, transaction, source version | `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION`, `SOURCE_ASSET_VERSION` |
| S11 | `SupabasePreservationRunRepository.create` / preservation_runs | tenant, transaction, source version | same |
| S12 | `SupabaseCandidatePreferenceRepository.create` / candidate_preferences | tenant, transaction | `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION` |
| S13 | `SupabasePreservationStudyRepository.createCase` / preservation_study_cases | transaction, source version | `OUTCOME_TRANSACTION`, `SOURCE_ASSET_VERSION` |

For example, CandidateAsset may first acquire source-version `KEY SHARE` and
then wait for tenant, while D3 holds tenant/transaction and later requests the
same version `FOR UPDATE`. That is a real two-direction cycle regardless of
which RI trigger happens to run first. Future routing acquires the table's
listed existing fences in global rank order, then explicitly locks and
revalidates every conflicting parent in canonical ordinary-row order, then
executes the INSERT. RI checks become defense in depth. No new material class
or fence is created; wait-only fencing grants no authority.

Together with W28, these thirteen entries make fourteen synchronized
wait-only participants.

## 7. Ten proven one-way wait operations

The following entries have exactly one conflicting protected parent. They can
wait on that parent but cannot already hold a different protected parent that
the protected operation later requests. Their other FK/unique/trigger
resources are not requested conflictively by protected operations.

| # | Operation / target | Sole conflicting protected-parent FK |
|---:|---|---|
| O01 | `SupabaseFieldBetaRepository.createPolicy` / preservation_policy_versions | `preservation_policy_versions_owner_tenant_id_fkey` |
| O02 | `.createFeedback` / field_feedback | `field_feedback_owner_tenant_id_fkey` |
| O03 | `.createRegressionCandidate` / field_regression_candidates | `field_regression_candidates_owner_tenant_id_fkey` |
| O04 | `.createGoldenCase` / field_golden_cases | `field_golden_cases_owner_tenant_id_fkey` |
| O05 | `.createEvaluationSample` / field_evaluation_samples | `field_evaluation_samples_owner_tenant_id_fkey` |
| O06 | `.createEvaluationJudgment` / field_evaluation_judgments | `field_evaluation_judgments_owner_tenant_id_fkey` |
| O07 | `SupabaseProjectRepository.create` / projects | `projects_owner_tenant_id_fkey` |
| O08 | `SupabaseImageEvidenceRepository.create` / image_evidence | `image_evidence_owner_tenant_id_fkey` |
| O09 | `SupabasePreservationEvidenceRepository.create` / preservation_evidence | `preservation_evidence_owner_tenant_id_fkey` |
| O10 | `SupabaseTenantCoreLineageRepository.createProject` / projects | `projects_owner_tenant_id_fkey` |

Project creation is the only one-way target later referenced by a protected FK
(assets -> projects). Both project writers omit `id`, so PostgreSQL generates
the UUID and no protected caller can possess the uncommitted same project
identity; after the ID becomes observable, the create transaction has already
committed. The remaining targets have no protected reverse target request.
Thus every possible start order has only `outside -> protected`, never a cycle.

## 8. Twenty-four disjoint operation records

Disjointness uses exact mechanisms, not an “outside scope” label.

| Mechanism | Exact operations | Proof |
|---|---|---|
| non-key update | project update; execution-run metadata update; candidate `markCommitted`; preservation-run update; candidate-preference acceptance update | target `NO KEY UPDATE`; protected FK readers use compatible `KEY SHARE`; changed FK parents, where present, are candidate/provider rows not protected `FOR UPDATE` parents; triggers perform plain reads only |
| preservation-study local graph | ensure study; create rating; create pairwise; create acceptance | target/unique/FK parents remain entirely in study-local tables and have no protected explicit/table/row relation |
| system scope | intent run; model failure; intent feedback; benchmark run; blind set insert; blind cases insert; blind-set rollback delete; blind session insert/update; comparison; judgment; human-intent insert/update; step rating | no shared table, unique key, FK parent, trigger lock, nested lock, or row identity with the protected graph |
| preservation-study RPC | `lock_preservation_study_intent` | writes study intents/presentations; its case/candidate FK checks have no conflict with any protected candidate/case row lock, and it invokes no protected function |

For every DISJOINT record the manifest explicitly binds:

```text
TARGET_TABLE_DISJOINT=YES
UNIQUE_EXCLUDE_DISJOINT=YES
FK_PARENT_LOCK_DISJOINT=YES
TRIGGER_LOCK_DISJOINT=YES
NESTED_LOCK_DISJOINT=YES
TABLE_LOCK_DISJOINT=YES
ROW_LOCK_DISJOINT=YES
```

The system-scope row contains fourteen operation records; the other mechanisms
contain five, four, and one respectively, totaling 24.

```text
OUTSIDE_002E_FALSE_NEGATIVES=0
DNP_INTERSECTING_PATHS_INCLUDED=YES
DNP_PATH_EXCLUDED_BECAUSE_UNREACHABLE=NO
```

## 9. CandidateAsset create: complete FK and cycle proof

`SupabaseCandidateAssetRepository.create` is exported by the active tenant
bundle and is called twice by
`PreservationVerificationService.runExperiment`, at current source lines 399
and 524, for raw and preserved candidates. The database generates its candidate
UUID; callers cannot know that new row identity before the insert commits.

| Effective FK | Parent | Protected lock on same possible identity | Conflict |
|---|---|---|---|
| `candidate_assets_execution_run_id_fkey` | execution_runs(id) | none | no |
| `candidate_assets_owner_tenant_id_fkey` | tenants(id) | D3/D4/D5/D6 `FOR UPDATE` | yes |
| `candidate_assets_preservation_run_fk` | preservation_runs(id) | none | no |
| `candidate_assets_raw_candidate_id_fkey` | candidate_assets(id) | no protected candidate row lock | no |
| `candidate_assets_source_version_id_fkey` | asset_versions(id) | D3/D4/D5/D6 `FOR UPDATE` | yes |
| `candidate_assets_transaction_id_fkey` | outcome_transactions(id) | D3/D4/D5/D6 `FOR UPDATE` | yes |

The create footprint is: candidate target `ROW EXCLUSIVE`; new tuple and its
two unique sites; two enabled validation triggers whose functions perform plain
MVCC reads and no DML/row/table lock; six FK parent `KEY SHARE` checks. Three
checks address parents that D3–D6 can lock `FOR UPDATE`. Because PostgreSQL's RI
trigger order is not authority, CandidateAsset can hold version `KEY SHARE`,
then request tenant/transaction while D3 holds tenant/transaction and requests
that version. Both wait directions are possible. The server-generated candidate
ID eliminates a separate candidate-target reverse edge, but it does not
eliminate the multi-parent cycle.

Candidate creation is therefore non-material but synchronized. Future routing
uses three existing fences in rank order, explicitly locks/revalidates tenant,
transaction, and source version before INSERT, and never relies on the RI check
order or a deadlock loser.

```text
CANDIDATE_ASSET_CREATE_FOUND=YES
CANDIDATE_ASSET_CREATE_REACHABLE=YES
CANDIDATE_ASSET_TENANT_FK_INTERSECTION=YES
CANDIDATE_ASSET_TRANSACTION_FK_INTERSECTION=YES
CANDIDATE_ASSET_VERSION_FK_INTERSECTION=YES
CANDIDATE_ASSET_CREATE_002E_ROLE=SYNCHRONIZED_WAIT_PARTICIPANT
CANDIDATE_ASSET_CREATE_CYCLE_CAPABLE=YES
CANDIDATE_ASSET_CREATE_REVERSE_EDGE_PROOF=CANDIDATE_MAY_HOLD_VERSION_KEY_SHARE_WHILE_WAITING_TENANT_OR_TRANSACTION_AS_D3_HOLDS_TENANT_OR_TRANSACTION_AND_REQUESTS_VERSION_FOR_UPDATE
CANDIDATE_ASSET_CREATE_REQUIRED_FENCE_SET=TENANT_AUTHORITY,OUTCOME_TRANSACTION,SOURCE_ASSET_VERSION
CANDIDATE_ASSET_NEW_MATERIAL_FENCE_REQUIRED=NO
```

## 10. Candidate mark-committed is a separate operation

`markCommitted` updates only `committed`. That column is not a PK, unique key,
FK child key, or referenced key. PostgreSQL therefore takes a candidate row
`FOR NO KEY UPDATE`-equivalent lock and rechecks zero FKs. Its two enabled
triggers execute; the owner trigger performs a plain transaction read and the
lineage trigger rejects tenant-owned UPDATE before any secondary lock. Neither
takes an explicit row/table lock or performs secondary DML. W09 uses a plain
candidate read; candidate FK readers use compatible `KEY SHARE`.

```text
CANDIDATE_MARK_COMMITTED_UPDATED_COLUMNS=committed
CANDIDATE_MARK_COMMITTED_ROW_LOCK_MODE=FOR_NO_KEY_UPDATE
CANDIDATE_MARK_COMMITTED_FK_RECHECKS_TRIGGERED=0
CANDIDATE_MARK_COMMITTED_PROTECTED_ROW_LOCK_INTERSECTION=NO
CANDIDATE_MARK_COMMITTED_CYCLE_CAPABLE=NO
CANDIDATE_MARK_COMMITTED_CLASSIFICATION=DISJOINT
```

## 11. Complete global FK and unique footprints

The manifest has 126 direct-builder FK parent records and 136 RPC/nested
operation FK parent records, totaling 262 exact `(operation, child table,
constraint, child key, parent, parent key, mode)` records. UPDATE contributes
only when its changed columns overlap an FK child key; all INSERT constraints
are included. Every record is classified as protected/common-fenced,
one-way-conflicting, same-transaction parent-first, compatible/nonconflicting,
environmental terminal, or fully disjoint.

The 262 records cover, without elision, the original 102 material-target FKs,
the 51 FKs on thirteen new wait-only targets, and every remaining global target
including projects, provider/evidence/verification/candidate/preservation,
study, and system intent/evaluation tables. `auth.users` remains an
environmental terminal parent that cannot acquire BUILD002 fences or
manufacture authority.

INSERTs contribute 81 direct-builder and 75 RPC/nested UNIQUE/EXCLUDE wait-site
records, totaling 156 operation/site records. Each binds its exact catalog name
and predicate/definition. Updates in the base change no protected unique key.

```text
GLOBAL_REACHABLE_DML_FK_PARENT_EDGES_TOTAL=262
GLOBAL_REACHABLE_DML_FK_PARENT_EDGES_CLASSIFIED=262
UNCLASSIFIED_GLOBAL_FK_PARENT_EDGES=0
GLOBAL_UNIQUE_WAIT_INTERSECTIONS_CLASSIFIED=156/156
UPDATE_ROW_LOCK_MODES_CLASSIFIED=9/9
UNACCOUNTED_TABLE_LOCK_INTERSECTIONS=0
```

No outside target is one of the eight effective protected explicit `SHARE`
lock targets. All applicable target-table `ROW EXCLUSIVE` modes are therefore
either inside the protected closure or table-disjoint. Across global targets,
42 distinct enabled triggers are applicable to at least one operation. Their
effective functions contain zero secondary DML, explicit table locks, or
locking SELECTs. Nested SQL function closure is included by effective
definition hash.

```text
GLOBAL_APPLICABLE_ENABLED_TRIGGERS=42
INTERSECTING_ENABLED_TRIGGER_PATHS_TOTAL=52
INTERSECTING_ENABLED_TRIGGER_PATHS_MAPPED=52
TRIGGER_FUNCTIONS_WITH_SECONDARY_DML_OR_LOCKS=0
LOCK_FOOTPRINT_TRANSITIVE_CLOSURE_REACHED=YES
UNACCOUNTED_TRIGGER_WAIT_EDGES=0
UNACCOUNTED_NESTED_FUNCTION_WAIT_EDGES=0
```

## 12. Intersecting targets and constraint surface

The protected graph is the union of 27 material operations, W28, and the
thirteen new synchronized wait-only operations. The ten one-way operations are
analyzed graph inputs but do not join synchronization. The thirteen new target
tables expand the protected target union from 27 to 40. Candidate assets is a
globally active wait-only synchronized target, never material. It is
historical-only solely as an effective W09 write target: the installed W09 does
not write it.

| Terminology | Meaning / result |
|---|---|
| `MATERIAL_WRITE_TARGET` | one of the original 27 effective target tables represented by W01–W27 |
| `WAIT_ONLY_WRITE_TARGET` | state_commits for W28 plus thirteen newly synchronized targets; state_commits already occurs in the material-target union through W09 |
| `HISTORICAL_ONLY_TARGET` | `candidate_assets` only with respect to superseded W09 bodies |
| `DISJOINT_ACTIVE_TARGET` | globally active target whose footprint is DISJOINT |
| `ONE_WAY_ACTIVE_TARGET` | globally active target whose footprint is PROVEN_ONE_WAY_WAIT |

Clean-replay catalogs yield 79 UNIQUE/EXCLUDE sites and 153 FKs on the 40-table
intersecting target set. The original 27 tables contribute 55/102. The thirteen
new tables contribute 24 unique sites and 51 FKs. Candidate assets' two unique
sites and six FKs are therefore protected wait-only sites in R6; they are
effective current catalog objects, not historical migration counts.
Seven protected-target FKs reference `auth.users`; each is an environmental
terminal edge after BUILD002 fences. Auth cannot acquire a BUILD002 fence,
create a reverse fence edge, or manufacture authority.

```text
INTERSECTING_WRITE_TARGETS_TOTAL=40
INTERSECTING_UNIQUE_EXCLUSION_SITES_TOTAL=79
INTERSECTING_UNIQUE_EXCLUSION_SITES_ACCOUNTED=79
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
INTERSECTING_FK_SITES_TOTAL=153
INTERSECTING_FK_SITES_ACCOUNTED=153
UNACCOUNTED_FK_WAIT_EDGES=0
CANDIDATE_ASSETS_GLOBALLY_ACTIVE=YES
CANDIDATE_ASSETS_002E_EFFECTIVE_W09_TARGET=NO
CANDIDATE_ASSETS_WAIT_ONLY_INTERSECTING_TARGET=YES
AUTH_USERS_FK_SITE_COUNT=7
AUTH_USERS_FK_WAIT_EDGE_ACCOUNTED=YES
```

## 13. Effective D3–D6 footprint bindings

Each footprint hash is SHA-256 over stable JSON records sorted by effective
signature. A record contains signature, `pg_get_functiondef` SHA-256, parsed
INSERT/UPDATE/DELETE targets, every explicit `LOCK TABLE table:mode`, and every
locking SELECT `table:mode`. Recursive installed helpers are included.

```text
D3_EFFECTIVE_LOCK_FOOTPRINT_HASH=d779b91b6bb950bc8e4cb395ad93468df6df6fa0471ff629813c93ac8c9a1314
D4_EFFECTIVE_LOCK_FOOTPRINT_HASH=457492a262f72eab961ed947d8e0a8bc9c62ca63cace84ec28c2404c6933bd0a
D5_EFFECTIVE_LOCK_FOOTPRINT_HASH=3e312da779a614fdffdcd6e1821dc4cc5f0b294edc2058823f3169df66c5296a
D6_RESERVE_EFFECTIVE_LOCK_FOOTPRINT_HASH=14426573b3e0a2ed7d70d9b643e8322ec4dac1382261f183b02a30ab7be78643
D6_CONSUME_EFFECTIVE_LOCK_FOOTPRINT_HASH=97ef522d5bb9695b1188d925f7a4ef765f2c0538ba747ae94e2483702306f8dd
```

D3's effective closure binds tenant, membership, readiness-authority,
transaction, asset, version, and binding `FOR UPDATE`; catalog/currentness
`FOR SHARE`; five effective `SHARE` table relations in both current and nested
legacy bodies; and the admission insert. D4 binds the corresponding lower
lineage locks, five broad shares, and authority insert. D5 binds its current
wrapper, three Field Beta/intent broad shares, r0 nested lower-lineage locks,
five broad shares, and lease insert. D6 reserve/consume bind their own rows plus
the complete nested D5 closure. No earlier superseded function body counts.

The distinct effective broad table-lock relations remain eight, with 23
statement occurrences; all are inside the protected material closure and are
accounted by future exact universe fences/rows.

```text
ACTIVE_BROAD_TABLE_LOCK_STATEMENTS_TOTAL=23
ACTIVE_BROAD_TABLE_LOCKS_TOTAL=8
ACTIVE_BROAD_TABLE_LOCKS_ACCOUNTED=8
UNACCOUNTED_ACTIVE_BROAD_LOCKS=0
```

## 14. Directed wait graph

The deterministic graph generator creates operation nodes and shared
resource/mode nodes. For each protected operation it emits ordered applicable
fence edges before target/ordinary resources. For every operation it emits
target `ROW EXCLUSIVE`, tuple/update mode, unique, applicable trigger,
FK-parent `KEY SHARE`, explicit table lock, and explicit row-lock nodes. An edge
means the operation can hold the predecessor before requesting the conflicting
successor. The thirteen newly synchronized writers emit canonical fence edges
before their explicitly ordered parents/target. One-way writers emit their
single protected-parent direction with no reverse edge.

The generated graph contains 405 nodes and 612 distinct directed edges. Tarjan
SCC evaluation over the exact edge set produces zero components larger than
one. Fence/bootstrap edges use the immutable rank order; no operation acquires
a fence after ordinary/constraint/trigger phases.

```text
DIRECTED_WAIT_GRAPH_NODES=405
DIRECTED_WAIT_GRAPH_EDGES=612
STRONGLY_CONNECTED_COMPONENTS_GT1=0
REVERSE_FENCE_EDGE_COUNT=0
UNACCOUNTED_INTERNAL_WAIT_EDGE_COUNT=0
UNACCOUNTED_TABLE_LOCK_INTERSECTIONS=0
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
UNACCOUNTED_FK_WAIT_EDGES=0
UNACCOUNTED_TRIGGER_WAIT_EDGES=0
UNACCOUNTED_NESTED_FUNCTION_WAIT_EDGES=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES
```

No conclusion depends on PostgreSQL's internal ordering among RI triggers. If
a future operation becomes bidirectional/cycle-capable across multiple parents,
it must be routed through a protected server-owned transaction that explicitly
locks/revalidates the exact parents in canonical fence/ordinary order before
child DML.

## 15. Preserved isolation, order, fences, and material classes

Every protected operation pins and guards PostgreSQL `READ COMMITTED`.
SQLSTATE `40001` before a committed external/admission effect rolls back and
restarts the entire database operation from fresh discovery; no snapshot,
fence, lock, or tentative evidence resumes. Deadlock/timeout is verification
failure, never a correctness branch.

Material and serialization revisions are non-authoritative transactional
evidence. A wait-only operation can use fences without becoming currentness
material. Durable order is reconstructed only from committed canonical rows
and exact common-fence revisions, not timestamps or sequence allocation.

The nineteen fence identities remain, in rank order: personal-owner principal,
tenant, membership, transaction, asset head, source version, requirement
binding, blueprint family, profile family, requirement universe, signal
universe, readiness evaluation, readiness authority, delegability scope,
TaskSpec/field-outcome universe, intent/patch universe, execution-authority
scope, mutation-lease scope, and execution-attempt scope. R6 adds none.

The seventeen material classes remain tenant/member, transaction, asset head,
source version, binding, catalogs, requirements, signals, dependency snapshot,
qualification/readiness, readiness authority, delegability, TaskSpec/outcome,
intent/patch, D4 authority, D5 lease, and D6 reservation/consumption.

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
POSTGREST_RPC_READ_COMMITTED_PIN_REQUIRED=YES
RPC_RUNTIME_ISOLATION_GUARD=YES
SERIALIZATION_FAILURE_FULL_RESTART=YES
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
002E_DEFINES_RETRY_POLICY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
FENCE_IDENTITIES_TOTAL=19
FENCE_IDENTITIES_AMBIGUOUS=0
NEW_R6_FENCE_IDENTITIES=0
MATERIAL_DEPENDENCY_CLASSES=17
CANONICAL_FENCE_LOCK_GRANTS_AUTHORITY=NO
WAIT_ONLY_SERIALIZATION_EVIDENCE_GRANTS_AUTHORITY=NO
WAIT_ONLY_OPERATION_CREATES_MATERIAL_REVISION=NO
FENCE_IS_AUTHORITY=NO
SERIALIZATION_REVISION_IS_AUTHORITY=NO
MATERIAL_REVISION_IS_AUTHORITY=NO
FENCE_ACL_CONTRACT_CLOSED=YES
ACTIVE_PHANTOM_PATHS_TOTAL=9
ACTIVE_PHANTOM_PATHS_COVERED=9
PHANTOM_INSERT_GAP=0
```

W01 retains the pre-identity principal fence. It precedes tenant/member fences,
proves no authority, and forces full restart if post-wait rederivation changes
identity. W02 uses it first for PERSONAL OWNER revocation. W27 retains
server-owned asset UUID preallocation before tenant/asset fences.

```text
PERSONAL_OWNER_FENCE_REQUIRED=YES
W01_POSTWAIT_IDENTITY_CHANGE_CAUSES_RESTART=YES
W01_EXISTING_RETURN_SAFE_WITHOUT_NEW_FENCES=NO
W02_PERSONAL_OWNER_REQUIRES_PRINCIPAL_FENCE=YES
W01_W02_SERIALIZATION_COMPLETE=YES
W27_FOUND=YES
W27_ASSET_ID_SERVER_OWNED=YES
W27_ASSET_ID_AVAILABLE_BEFORE_FENCE_ACQUISITION=YES
W27_UNFENCED_DIRECT_DML_ALLOWED_AFTER_002E=NO
```

## 16. W09 and provider/candidate firewall

The installed W09 wrapper hash remains
`e579dd9a1b9ed1a9d77f9e4e4cfc5bcb1bc97f026c747c01c659da4f273cb884`.
Its nested effective closure writes only asset_versions, assets, state_commits,
and outcome_transactions. It reads candidate assets without a row lock and
does not write or depend on `committed`. That fact is independent from the
cycle-capable multi-parent FK footprint of application candidate creation.

```text
W09_WRITES_CANDIDATE_ASSETS=NO
W09_EFFECTIVE_WRITE_TARGETS=asset_versions,assets,state_commits,outcome_transactions
W09_CANDIDATE_WRITE_STATUS_INDEPENDENT_OF_CANDIDATE_WRITER_WAIT_STATUS=YES
CANDIDATE_WAIT_SYNCHRONIZATION_DEFINES_PROVIDER_RESULT_POLICY=NO
CANDIDATE_WAIT_SYNCHRONIZATION_DEFINES_PROVIDER_RETRY=NO
CANDIDATE_STATE_BECOMES_READINESS_AUTHORITY=NO
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
CONSUMED_RESERVATION_BLIND_REPLAY=REJECTED
002E_PROVIDER_RECOVERY_SCOPE=NO
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO
```

## 17. Runtime probes, C04, and drift gates

Three PostgreSQL 17.10 real-session probes cover every exclusion mechanism:

1. D3-representative tenant `FOR UPDATE` versus FK-representative `FOR KEY
   SHARE` blocks with SQLSTATE `55P03` under a diagnostic 300 ms lock timeout;
   this proves one FK wait direction, while complete footprints decide whether
   the operation is one-way or cycle-capable. Timeout is not correctness.
2. Project-update-representative `FOR NO KEY UPDATE` versus W27-FK `FOR KEY
   SHARE` succeeds concurrently, proving row-mode compatibility.
3. Project target `ROW EXCLUSIVE` versus FK reader `ROW SHARE` succeeds,
   proving the table-mode classification. System/no-shared-resource and
   study-local records are additionally closed by exact catalog set
   intersection.

C04 runs both start orders with explicit barriers and `pg_locks`. The current
unrouted form demonstrates the multi-parent reverse cycle: CandidateAsset can
hold version `KEY SHARE` while D3 holds tenant/transaction and each can request
the other's resource. The future form proves both enter the same existing
tenant/transaction/version fence order before explicit parent locks, so the
loser waits before holding any conflicting downstream parent.

An ephemeral negative drift test created a synthetic outside child with an FK
to protected `tenants(id)`. The detector changed it from DISJOINT to
WAIT_INTERSECTION, and a real insert blocked against tenant `FOR UPDATE` with
SQLSTATE `55P03`. The synthetic object was never repository state.

```text
C04_LOCK_INTERSECTION_PROVEN=YES
C04_SYNCHRONIZED_PROTOCOL=PASS
OUTSIDE_CLASSIFICATION_RUNTIME_PROBES=3
OUTSIDE_CLASSIFICATION_RUNTIME_PROBES_PASS=3
LOCK_FOOTPRINT_DRIFT_NEGATIVE_TEST=PASS
STATIC_MUTATION_SURFACE_DRIFT_FAILS_CLOSED=YES
DB_MUTATION_SURFACE_DRIFT_FAILS_CLOSED=YES
CONSTRAINT_SURFACE_DRIFT_FAILS_CLOSED=YES
LOCK_FOOTPRINT_SURFACE_DRIFT_FAILS_CLOSED=YES
```

Future verification regenerates exact manifest sets. A new/removed reachable
DML operation, changed target/operation/reachability/materiality, FK or parent,
updated key column, unique/exclusion site, trigger/helper, explicit lock, or
classification fails closed until reconciled. Totals alone never pass drift.

The future adversarial matrix retains E01–E10, I01–I04, C01 W01/W02, C02 W27,
effective constraint-derived C03, W28 `C_STATE_01/02`, and adds C04.

## 18. Ten parent-traceable requirements

| ID | Requirement | Parent trace |
|---|---|---|
| `002E-R01` | pin/guard READ COMMITTED; whole-operation 40001 restart | PostgreSQL transaction-bound revalidation |
| `002E-R02` | every material writer and cycle-capable wait participant joins sufficient canonical synchronization; one-way waits require exact noncycle proof | dependency/admission race closure without generic governance |
| `002E-R03` | total directed graph covers fences, ordinary/table locks, unique/FK waits, triggers/helpers, and global indirect-FK footprints | parent lock-order/deadlock semantics |
| `002E-R04` | complete post-fence authoritative reread; changed identity restarts | stale-currentness prohibition |
| `002E-R05` | committed canonical material/evidence reconstructs exact common-fence order | auditability requirement |
| `002E-R06` | W01/W02 share non-authoritative principal pre-identity serialization | tenant authority correctness |
| `002E-R07` | D6 exact-duplicate/distinct-attempt and provider recovery semantics remain unchanged | no 002-R/D7/C2 scope theft |
| `002E-R08` | owner-only ACL/capability/immutability prevents forged fences/evidence | fail-closed authority |
| `002E-R09` | PostgreSQL 17 verification regenerates exact static, DB, constraint, and lock-footprint manifests with negative drift tests | executable adversarial E3 proof |
| `002E-R10` | Field Beta reachability/provider policy remains firewalled | explicit parent non-scope |

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
```

## 19. Creation gates and authorization

```text
UNCLASSIFIED_LOCK_FOOTPRINT_PATHS=0
UNCLASSIFIED_GLOBAL_FK_PARENT_EDGES=0
OUTSIDE_002E_FALSE_NEGATIVES=0
UNMAPPED_MATERIAL_WRITER_PATHS=0
UNACCOUNTED_TABLE_LOCK_INTERSECTIONS=0
UNACCOUNTED_UNIQUE_EXCLUSION_WAIT_EDGES=0
UNACCOUNTED_FK_WAIT_EDGES=0
UNACCOUNTED_TRIGGER_WAIT_EDGES=0
UNACCOUNTED_NESTED_FUNCTION_WAIT_EDGES=0
STRONGLY_CONNECTED_COMPONENTS_GT1=0
GLOBAL_LOCK_GRAPH_ACYCLIC=YES

PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
NEXT_GATE=BUILD002_002E_SPEC_R6_CANONICALIZATION_R1
```

R6 stops after candidate creation. Canonicalization and implementation require
their own later authority.
