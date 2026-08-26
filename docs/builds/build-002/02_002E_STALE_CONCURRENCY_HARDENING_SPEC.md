# BUILD002 002-E — executable acquisition-plan graph specification R7

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R7
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R6=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. R7 corrects only the executable
acquisition-plan and wait-graph proof that blocked R6. It does not authorize
implementation, migrations, application changes, 002-R, D7, or C2.

R1 `8ba2f7877dcfabfa471c82bfc81c12fffdf41518`, R2
`30f4da7e3bb47a6674c3ae7ed4f3d388671d2c39`, R3
`883edf35ce43446d4b722310421200cbc4dc070d`, R4
`8fa0243075d0e1565d53dea8c9f7ea44cefe125b`, R5
`42045014e72e9b6f99c28a7c34aafe9a527ad6ec`, and R6
`d4ac6de7aa692d5560268e98bee0585adc88f6d9` are evidence only and are not
ancestors of R7. R7 starts directly from canonical main commit
`58e69b4d7d683412a0bfa60b5121be82d5426eaa`, tree
`a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884`.

## 1. Parent authority, scope, and preserved inventory

Parent authority remains 002-E in
`docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md` at historical commit
`2057ffeb4b63e878379da2e25c2252be2707a125`, blob
`589d406f78423367259d07dc759eb3f97fdee349`. Supporting objective remains
`docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md` at commit
`a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`, blob
`bfe82d08adc29b8fe032f5a39c5e24620b1257a8`.

The inherited invariant is unchanged: dependency changes and READY-to-execution
races serialize at a concrete PostgreSQL linearization point with no partial
reservation or run. The graph exists solely to prove that BUILD002 invariant.

Two independent PostgreSQL 17.10 clean replays and a fresh source scan preserve
the exact R6 current inventory:

```text
GLOBAL_REACHABLE_DML_PATHS_TOTAL=75
DIRECT_MUTATION_BUILDERS_TOTAL=56
RPC_ENTRY_OPERATIONS_TOTAL=19
MATERIAL_WRITER_PATHS_TOTAL=27
SYNCHRONIZED_WAIT_PARTICIPANTS_TOTAL=14
PROVEN_ONE_WAY_WAIT_PATHS_TOTAL=10
DISJOINT_REACHABLE_DML_PATHS_TOTAL=24
PROTECTED_GRAPH_OPERATIONS_TOTAL=41
GLOBAL_REACHABLE_DML_FK_PARENT_EDGES_TOTAL=262
GLOBAL_UNIQUE_WAIT_INTERSECTIONS_CLASSIFIED=156/156
UPDATE_ROW_LOCK_MODES_CLASSIFIED=9/9
```

No classification changed. W07 remains included because dead-code reachability
is not proven. The ten one-way and twenty-four disjoint records have overlay
`NONE`.

## 2. Three separate canonical artifacts

R7 never mutates current evidence to pretend future locks exist.

1. `CURRENT_LOCK_FOOTPRINT_MANIFEST` describes only BASE behavior.
2. `NORMATIVE_ROUTING_OVERLAY` describes required future transaction and lock
   changes for the 41 protected operations.
3. `PROPOSED_ACQUISITION_PLAN` is the deterministic result of applying the
   overlay to the current manifest.

```text
CURRENT_LOCK_FOOTPRINT_MANIFEST_RECORDS=75
CURRENT_LOCK_FOOTPRINT_MANIFEST_SHA256=d05ac499591c93b987c00dda54a1c7da18784e5a67bc56e065a9c6490b5f6e51
CURRENT_FOOTPRINT_REPRESENTS_BASE_ONLY=YES
CURRENT_ACQUISITION_PLAN_MANIFEST_OPERATIONS=75
CURRENT_ACQUISITION_PLAN_MANIFEST_SHA256=13bf9a8047bf4642ceaf879e41c66ce8ea17ec1d75c239cc7e14e3bc621505d8
CURRENT_PLAN_CONTAINS_FUTURE_LOCKS=NO
NORMATIVE_ROUTING_OVERLAY_OPERATIONS=41
NORMATIVE_ROUTING_OVERLAY_SHA256=29a757e483888ce67180ffdd64f18db164178d44c9b2ae306f5f9b9c39010dd4
PROPOSED_ACQUISITION_PLAN_MANIFEST_OPERATIONS=75
PROPOSED_ACQUISITION_PLAN_MANIFEST_SHA256=542c7ae395d2512b251b905416da85593b733dbf51ff0e3580bbfeef17f836e9
PROPOSED_PLAN_CONTAINS_ALL_NORMATIVE_LOCKS=YES
PROPOSED_PLAN_MANIFEST_REPRODUCIBLE=YES
PROPOSED_PLAN_GENERATOR_DETERMINISTIC=YES
CURRENT_AND_PROPOSED_MODEL_SEPARATED=YES
```

Every protected overlay record binds operation ID, current classification,
fence set/order, bootstrap plan, explicit-parent plan, ordinary-row plan,
broad-lock disposition, post-fence revalidation, child-DML position, and
restart behavior.

## 3. Canonical resource identity and lock modes

A physical resource has one ResourceId. Mode and provenance are attributes and
never participate in identity:

```text
ROW|<schema>|<table>|<canonical-key-expression>
TABLE|<schema>|<table>
UNIQUE|<schema>|<index-or-constraint>|<canonical-conflict-key-expression>
FENCE_BOOTSTRAP|<fence-kind>|v1|<canonical-scope-expression>
FENCE_ROW|<fence-kind>|v1|<canonical-scope-expression>
```

For example, both Candidate FK enforcement and D3 explicit locking address
`ROW|public|tenants|id=$tenantId`; their modes are respectively
`FOR_KEY_SHARE` and `FOR_UPDATE`. `ACQUISITION_SOURCE` may be
`EXPLICIT_SELECT`, `FK_ENFORCEMENT`, `TARGET_DML`, `UNIQUE_CONSTRAINT`,
`EXPLICIT_TABLE_LOCK`, `FENCE_BOOTSTRAP`, `FENCE_ROW_LOCK`, `TRIGGER`, or
`NESTED_FUNCTION`, but source cannot split resource identity.

FK constraint names are provenance only. FK lock identity is the exact parent
row. All table modes address `TABLE|schema|table`. Unique identity binds the
effective index/constraint, complete conflict key, and partial predicate when
present.

```text
RESOURCE_IDENTITY_INDEPENDENT_OF_LOCK_MODE=YES
FK_KEY_SHARE_AND_EXPLICIT_UPDATE_SHARE_RESOURCE_ID=YES
FK_PARENT_LOCK_RESOURCE_NORMALIZED_TO_PARENT_ROW=YES
TABLE_LOCK_RESOURCE_UNIFICATION=YES
UNIQUE_CONFLICT_RESOURCE_IDENTITY_EXACT=YES
CONFLICT_DETECTION_USES_RESOURCE_ID_PLUS_MODE_MATRIX=YES
ROW_LOCK_COMPATIBILITY_MODEL=POSTGRESQL17
```

`LOCK_CONFLICT(A,B)` is true only when ResourceIds are equal, symbolic identity
constraints are satisfiable, and PostgreSQL 17's row/table compatibility matrix
marks the modes incompatible. Unique/bootstrap exact-key contention conflicts
with another materialization of the same canonical key.

## 4. Identity alias and lineage manifest

The deterministic alias manifest has eight canonical groups and SHA-256
`f190b6cea8139bac3ed5f60fe89520e951bc56c59175cfa7811cdf926ee9eaa7`.
It is derived only from effective FKs, canonical inputs, discovery bindings,
post-fence rereads, and existing D0-D6 lineage:

| Canonical identity | Bound aliases |
|---|---|
| `$tenantId` | candidate/transaction/admission owner tenant; tenants.id |
| `$outcomeTransactionId` | candidate/state-commit transaction; outcome_transactions.id |
| `$assetId` | media/transaction asset; assets.id |
| `$sourceVersionId` | candidate/preservation source; evidence base; asset_versions.id |
| `$newSourceVersionId` | state-commit new version |
| `$previousSourceVersionId` | nullable state-commit previous version |
| `$principalId` | personal tenant owner and membership principal |
| `$memberPrincipalId` | membership subject principal |

Same SQL type never implies identity equality. Discovery is non-authoritative;
after all fences are locked, the complete alias and fence set is rederived. A
changed or expanded set causes rollback and full restart, never late fencing.

```text
SYMBOLIC_RESOURCE_IDENTITY_NORMALIZATION=YES
IDENTITY_ALIAS_MANIFEST_COMPLETE=YES
POST_FENCE_IDENTITY_REDERIVATION_COMPLETE=YES
LATE_FENCE_ACQUISITION_ALLOWED=NO
FENCE_DISCOVERY_GAP_UNCLOSED=0
```

## 5. Fence bootstrap and row-lock protocol

The nineteen fence kinds retain their R6 rank order: personal-owner principal,
tenant, membership, transaction, asset head, source version, requirement
binding, blueprint family, profile family, requirement universe, signal
universe, readiness evaluation, readiness authority, delegability scope,
TaskSpec/field outcome, intent/patch, execution authority, mutation lease, and
execution attempt.

For every required fence, the future transaction performs, in rank then
canonical-scope order:

1. derive the exact key;
2. acquire/materialize its exact `FENCE_BOOTSTRAP` unique key;
3. acquire its exact `FENCE_ROW` with `FOR_UPDATE`;
4. finish the entire fence phase before any ordinary lock or mutation.

The executable plans contain 21 distinct bootstrap ResourceIds because the
single SOURCE_ASSET_VERSION fence kind has default, `new`, and `previous`
scope expressions. This does not create new fence kinds.

```text
FENCE_IDENTITIES_TOTAL=19
FENCE_IDENTITIES_AMBIGUOUS=0
PROPOSED_FENCE_BOOTSTRAP_NODES=21
PROPOSED_FENCE_BOOTSTRAP_WAIT_EDGES=34957
FENCE_BOOTSTRAP_NODES=21
FENCE_BOOTSTRAP_EDGES=34957
FENCE_BOOTSTRAP_UNACCOUNTED_EDGES=0
FENCE_BOOTSTRAP_TOTAL_ORDER=YES
FENCE_BOOTSTRAP_REVERSE_ORDER_POSSIBLE=NO
FENCE_ROW_LOCK_TOTAL_ORDER=YES
FENCE_BOOTSTRAP_AND_ROW_ORDER_COMPATIBLE=YES
PROTECTED_OPERATIONS_FENCE_PHASE_COMPLETE_BEFORE_DOWNSTREAM=41/41
BOOTSTRAP_REVERSE_ORDER_NORMALIZED=YES
BOOTSTRAP_SUBSET_SUPERSET_CYCLE=NO
```

Sorting transforms both `F1,F2` and `F2,F1` to `F1,F2`. An operation needing
only F2 cannot request F1 after F2 and therefore cannot close a subset/superset
bootstrap cycle.

## 6. Canonical acquisition event and phases

```text
AcquireEvent {
  operation_id,
  variant_id,
  phase,
  ordinal,
  resource_id,
  lock_mode,
  acquisition_source,
  identity_constraints,
  held_until
}
```

Transaction locks use `held_until=TRANSACTION_END`. Canonical phases are:

```text
00 ISOLATION_GUARD
10 DISCOVERY_NONAUTHORITATIVE
20 FENCE_BOOTSTRAP
30 FENCE_ROW_LOCKS
40 POST_FENCE_IDENTITY_REDERIVATION
50 EXPLICIT_PARENT_AND_ORDINARY_LOCKS
60 AUTHORITATIVE_REVALIDATION
70 TARGET_MUTATION
80 CONSTRAINT_TRIGGER_NESTED_EFFECTS
90 EVIDENCE
100 COMMIT
```

Every material operation includes complete fence, ordinary-parent, material
revalidation, mutation, and evidence markers. The overlay narrows/removes all
eight legacy broad SHARE relations in favor of exact fences and rows:
`build002_delegation_readiness`, `build002_dependency_snapshots`,
`build002_signal_qualifications`, `build002_signal_requirements`,
`build002_signals`, `field_outcomes`, `partial_intents`, and
`transaction_patches`.

```text
ACQUISITION_EVENT_SCHEMA_EXACT=YES
PROPOSED_PHASE_ORDER_TOTAL=YES
ALL_27_MATERIAL_ACQUISITION_PLANS_COMPLETE=YES
LEGACY_BROAD_LOCK_RELATIONS_TOTAL=8
PROPOSED_BROAD_LOCK_RELATIONS_UNRESOLVED=0
```

The exact material overlay set and fence phase is:

| Operation | Required fence set in rank order |
|---|---|
| `provision_personal_tenant` | personal principal; tenant; membership |
| `revoke_tenant_membership` | personal principal; tenant; membership |
| `build002_grant_mutation_lease` | tenant; membership; transaction; asset; source version; delegability; field outcome; intent/patch; execution authority; mutation lease |
| `build002_insert_dependency_snapshot` | tenant; transaction; requirement; signal; readiness evaluation |
| `build002_insert_signal_qualification` | tenant; transaction; requirement; signal; readiness evaluation |
| `build002_insert_delegation_readiness` | tenant; transaction; readiness evaluation |
| `build002_insert_signal_requirement` | tenant; transaction; requirement |
| `build002_insert_signal` | tenant; transaction; requirement; signal |
| `commit_accepted_field_outcome` | tenant; transaction; asset; source version |
| `build002_admit_delegability` | tenant; membership; transaction; asset; source version; binding; requirement; signal; readiness evaluation; readiness authority; delegability |
| `build002_reserve_execution_attempt` | tenant; membership; transaction; asset; source version; delegability; execution authority; mutation lease; execution attempt |
| `build002_consume_execution_attempt_reservation` | tenant; transaction; execution authority; mutation lease; execution attempt |
| `build002_grant_execution_authority` | tenant; membership; transaction; asset; source version; delegability; field outcome; execution authority |
| `SupabaseFieldBetaRepository.createOutcome` | tenant; transaction; field outcome |
| `SupabaseAssetRepository.create` | tenant; asset |
| `SupabaseAssetRepository.update` | tenant; asset |
| `SupabaseAssetVersionRepository.create` | tenant; asset; source version |
| `SupabaseOutcomeTransactionRepository.create` | tenant; transaction; asset; source version |
| `SupabaseOutcomeTransactionRepository.updateStatus` | tenant; transaction |
| `SupabasePartialIntentRepository.create` | tenant; transaction; intent/patch |
| `SupabaseSemanticPatchRepository.create` | tenant; transaction; intent/patch |
| `build002_commit_readiness_authority` | tenant; transaction; requirement; signal; readiness evaluation; readiness authority |
| `build002_publish_outcome_blueprint` | blueprint family |
| `build002_publish_outcome_requirement_profile` | blueprint family; profile family |
| `create_tenant_asset_with_initial_version` | tenant; asset; source version |
| `SupabaseTenantCoreLineageRepository.createTransaction` | tenant; transaction; asset; source version |
| `build002_bind_outcome_transaction_requirements` | tenant; transaction; binding; blueprint family; profile family |

Each material plan prelocks and revalidates the exact existing canonical rows
represented by its fences: tenant, membership, transaction, asset/version,
binding, catalog predecessor, signal/readiness, admission, field outcome,
intent, execution authority, lease, or attempt as applicable. UPDATE/DELETE
plans additionally prelock their exact target row. A not-yet-existing INSERT
identity has no fictional row lock; its exact unique/bootstrap resource and
parent rows provide serialization until target mutation.

## 7. Fourteen synchronized wait-participant plans

All rows below are locked explicitly with `FOR_UPDATE` in lexicographic
canonical ResourceId order after the complete listed fence phase and before
child INSERT. FK `FOR_KEY_SHARE` rechecks later reuse the same ResourceIds and
are reentrant defense in depth.

| ID / operation | Fence set | Explicit parent row resources | Child target |
|---|---|---|---|
| S01 `createStrategyRun` | tenant, transaction | outcome_transactions `$outcomeTransactionId`; tenants `$tenantId` | preservation_strategy_runs |
| S02 legacy mutation lease `create` | tenant, transaction | outcome_transactions; tenants | mutation_leases |
| S03 execution run `create` | tenant, transaction | outcome_transactions; tenants | execution_runs |
| S04 evidence receipt `create` | tenant, transaction, source version | asset_versions `$sourceVersionId`; outcome_transactions; tenants | evidence_receipts |
| S05 verification run `create` | tenant, transaction | outcome_transactions; tenants | verification_runs |
| S06 criterion evidence `create` | tenant, transaction | outcome_transactions; tenants | verification_criterion_evidence |
| S07 cost record `create` | tenant, transaction | outcome_transactions; tenants | cost_records |
| S08 media storage `create` | tenant, asset | assets `$assetId`; tenants | media_storage |
| S09 semantic snapshot `create` | tenant, transaction | outcome_transactions; tenants | semantic_snapshots |
| S10 CandidateAsset `create` | tenant, transaction, source version | asset_versions `$sourceVersionId`; outcome_transactions; tenants | candidate_assets |
| S11 preservation run `create` | tenant, transaction, source version | asset_versions `$sourceVersionId`; outcome_transactions; tenants | preservation_runs |
| S12 candidate preference `create` | tenant, transaction | outcome_transactions; tenants | candidate_preferences |
| S13 preservation study `createCase` | transaction, source version | asset_versions `$sourceVersionId`; outcome_transactions | preservation_study_cases |
| W28 state commit `create` | tenant, transaction, asset, new version, previous version | asset_versions `$newSourceVersionId`; nullable `$previousSourceVersionId`; assets; outcome_transactions; tenants | state_commits |

Input child IDs are resolved by non-locking discovery reads to canonical tenant,
asset, transaction, and version lineage. The same identities are reread after
fencing; mismatch or a newly required fence causes full restart. Each route is
one protected READ COMMITTED transaction and changes locking mechanics only.

```text
SYNCHRONIZED_WAIT_PARTICIPANT_PARENT_LOCK_PLANS=14/14
ALL_14_WAIT_PARTICIPANT_PARENT_PLANS_COMPLETE=YES
ALL_14_WAIT_PARTICIPANT_FENCE_PLANS_COMPLETE=YES
ALL_14_WAIT_PARTICIPANTS_FUTURE_ROUTABLE=YES
DIRECT_DML_ROUTING_REQUIRES_BUSINESS_SEMANTIC_CHANGE=NO
WAIT_ONLY_OPERATION_CREATES_MATERIAL_REVISION=NO
WAIT_ONLY_FENCE_GRANTS_AUTHORITY=NO
WAIT_ONLY_FENCE_GRANTS_RETRY=NO
WAIT_ONLY_EVIDENCE_GRANTS_AUTHORITY=NO
```

## 8. CandidateAsset and W28 differential proof

Candidate proposed acquisition order is tenant, transaction, source-version
fences; then exact parent rows:

```text
ROW|public|asset_versions|id=$sourceVersionId
ROW|public|outcome_transactions|id=$outcomeTransactionId
ROW|public|tenants|id=$tenantId
```

Only after all three `FOR_UPDATE` prelocks and authoritative revalidation may
`TABLE|public|candidate_assets : ROW_EXCLUSIVE`, candidate unique keys, and FK
enforcement occur. Candidate FK enforcement uses those same three ResourceIds
with `FOR_KEY_SHARE`; internal RI trigger order is irrelevant.

W28 similarly prelocks tenant, transaction, asset, new version, and nullable
previous version before state_commits INSERT. It remains wait-graph only and
creates no material revision.

```text
CANDIDATE_PROPOSED_PARENT_LOCKS_TOTAL=3
CANDIDATE_PARENT_RESOURCE_UNIFICATION=3/3
CANDIDATE_PARENT_LOCKS_BEFORE_CHILD_INSERT=YES
PROPOSED_CANDIDATE_CORRECTNESS_DEPENDS_ON_RI_TRIGGER_ORDER=NO
W28_EXPLICIT_PARENT_LOCK_PLAN_COMPLETE=YES
W28_002E_ROLE=WAIT_GRAPH_ONLY
```

## 9. Current cycle witness

The current BASE graph expands possible multi-parent RI ordering rather than
assuming catalog or trigger order. It retains this satisfiable witness:

```text
CandidateAsset.create:
  HELD     ROW|public|asset_versions|id=$sourceVersionId FOR_KEY_SHARE
  REQUESTS ROW|public|tenants|id=$tenantId FOR_KEY_SHARE

D3 build002_admit_delegability:
  HELD     ROW|public|tenants|id=$tenantId FOR_UPDATE
  REQUESTS ROW|public|asset_versions|id=$sourceVersionId FOR_UPDATE
```

The tenant and source-version identities unify through the effective Candidate
FKs and canonical D3 lineage. PostgreSQL 17 makes KEY SHARE versus UPDATE
conflicting in each direction.

```text
CURRENT_CANDIDATE_D3_CYCLE_CAPABLE=YES
CURRENT_CANDIDATE_D3_CYCLE_WITNESS_COMPLETE=YES
CURRENT_CYCLE_RESOURCE_IDENTITIES_UNIFY=YES
C04_CURRENT_UNROUTED_CYCLE_PROVEN=YES
```

## 10. Complete proposed wait-state graph

For every plan position the generator creates:

```text
OperationState {
  operation_id,
  next_request,
  held_lock_set
}
```

Every earlier transaction-held lock remains in `held_lock_set`. A wait edge
`A -> B` exists only when A's next request conflicts with a lock B holds, their
canonical identities unify, and A/B's already-held sets are mutually compatible.
That final joint-state satisfiability rule prevents combining mutually exclusive
alternative schedules into a false SCC. Terminal holders are sinks.

Tarjan runs over the exact canonical state/edge records. The generator was run
twice from identical pinned inputs with byte-identical result records.

```text
PROPOSED_WAIT_STATE_GRAPH_NODES=1156
PROPOSED_WAIT_STATE_GRAPH_EDGES=39755
PROPOSED_WAIT_STATE_GRAPH_SHA256=68bcbe6607d2449012b2075936790df0f7c960b546875711f50619d7bd7a2c06
PROPOSED_WAIT_STATE_GRAPH_REPRODUCIBLE=YES
PROPOSED_GRAPH_GENERATOR_DETERMINISTIC=YES
PROPOSED_SCC_GT1=0
PROPOSED_SELF_LOOPS_TOTAL=0
PROPOSED_SELF_LOOPS_UNEXPLAINED=0
FK_TO_EXPLICIT_ROW_CONFLICT_LINKS=4752
ONE_WAY_PATHS_IN_NONTRIVIAL_SCC=0
DISJOINT_PATHS_WITH_PROPOSED_WAIT_EDGE=0
SYNCHRONIZED_PARTICIPANT_DOWNSTREAM_REVERSE_CYCLES=0
PROPOSED_CANDIDATE_D3_MUTUAL_WAIT_EDGES=0
PROPOSED_CANDIDATE_D3_CYCLE_CAPABLE=NO
C04_PROPOSED_EXPLICIT_PARENT_LOCK_PLAN_PRESENT=YES
C04_PROPOSED_RESOURCE_IDENTITIES_UNIFIED=YES
C04_PROPOSED_CYCLE_REMOVED=YES
```

Waits at a common fence remain expected serialization. They cannot become a
downstream reverse edge because a loser cannot reach downstream locks while the
winner holds the same exact fence row.

## 11. Fail-closed negative tests and drift

Three analysis-only mutations were applied outside repository state:

1. Different provenance labels for FK KEY SHARE and explicit UPDATE normalized
   to the same tenant ResourceId and produced a conflict.
2. Removing one Candidate explicit parent prelock produced exactly one uncovered
   required-parent edge.
3. Removing Candidate bootstrap events produced three unaccounted bootstrap
   requirements.

```text
RESOURCE_IDENTITY_NORMALIZATION_NEGATIVE_TEST=PASS
EXPLICIT_PARENT_LOCK_NEGATIVE_TEST=PASS
EXPLICIT_PARENT_UNCOVERED_EDGES_AFTER_MUTATION=1
BOOTSTRAP_OMISSION_NEGATIVE_TEST=PASS
BOOTSTRAP_UNACCOUNTED_EDGES_AFTER_MUTATION=3
ACQUISITION_PLAN_DRIFT_FAILS_CLOSED=YES
RESOURCE_IDENTITY_DRIFT_FAILS_CLOSED=YES
WAIT_GRAPH_DRIFT_FAILS_CLOSED=YES
```

Future implementation verification regenerates the current footprint,
implemented overlay, acquisition plans, alias manifest, exact ResourceIds, and
complete wait-state graph from its own candidate SHA. Any mismatch requires
explicit reconciliation.

## 12. Isolation, authority, retry, and provider firewalls

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
POSTGREST_RPC_READ_COMMITTED_PIN_REQUIRED=YES
RPC_RUNTIME_ISOLATION_GUARD=YES
SERIALIZATION_FAILURE_FULL_RESTART=YES
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
002E_DEFINES_RETRY_POLICY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
CANDIDATE_WAIT_SYNCHRONIZATION_DEFINES_PROVIDER_RESULT_POLICY=NO
MATERIAL_DEPENDENCY_CLASSES=17
```

Fence, graph, material revision, serialization evidence, and wait-only evidence
remain non-authoritative. None grants provider success, retry, readiness,
execution authority, or canonical commit authority.

## 13. Verification contract and requirements

Future verification retains E01-E10, I01-I04, C01, C02, C03, C_STATE_01,
C_STATE_02, and C04, and adds:

- G01 ResourceId normalization;
- G02 explicit-parent plan completeness;
- G03 fence-bootstrap graph presence/order;
- G04 current-versus-proposed cycle differential;
- G05 complete wait-state SCC.

The ten parent-traceable requirement families remain exact. R02 covers all
material and cycle-capable participants. R03 now requires executable plans,
canonical identities, bootstrap, explicit parent locks, constraints, triggers,
and nested closure. R09 regenerates deterministic manifests and negative graph
tests. No generic lock graph, database governance, or audit platform is created.

```text
GRAPH_VERIFICATION_TEST_CLASSES=5
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
GENERIC_LOCK_GRAPH_PLATFORM_CREATED=NO
GENERIC_DATABASE_GOVERNANCE_PLATFORM_CREATED=NO
002E_SCOPE_EXPANSION_FOUND=NO
ALL_27_MATERIAL_WRITERS_FUTURE_ROUTABLE=YES
```

## 14. Candidate creation result

```text
CURRENT_CANDIDATE_D3_CYCLE_CAPABLE=YES
PROPOSED_CANDIDATE_D3_CYCLE_CAPABLE=NO
RESOURCE_IDENTITY_INDEPENDENT_OF_LOCK_MODE=YES
FK_KEY_SHARE_AND_EXPLICIT_UPDATE_SHARE_RESOURCE_ID=YES
SYNCHRONIZED_WAIT_PARTICIPANT_PARENT_LOCK_PLANS=14/14
ALL_27_MATERIAL_ACQUISITION_PLANS_COMPLETE=YES
PROPOSED_FENCE_BOOTSTRAP_NODES=21
PROPOSED_FENCE_BOOTSTRAP_WAIT_EDGES=34957
FENCE_BOOTSTRAP_UNACCOUNTED_EDGES=0
PROPOSED_SCC_GT1=0
ONE_WAY_PATHS_IN_NONTRIVIAL_SCC=0
DISJOINT_PATHS_WITH_PROPOSED_WAIT_EDGE=0
ALL_14_WAIT_PARTICIPANTS_FUTURE_ROUTABLE=YES
RESOURCE_IDENTITY_NORMALIZATION_NEGATIVE_TEST=PASS
EXPLICIT_PARENT_LOCK_NEGATIVE_TEST=PASS
BOOTSTRAP_OMISSION_NEGATIVE_TEST=PASS

PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
NEXT_GATE=BUILD002_002E_SPEC_R7_CANONICALIZATION_R1
```

R7 stops after specification-candidate creation.
