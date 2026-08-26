# BUILD002 002-E — pure-base, exact-bootstrap, instance-aware specification R8

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R8
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R7=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This document specifies and proves
the BUILD002 002-E model only. It does not authorize implementation, migrations,
application changes, 002-R, D7, or C2. Its next gate is an independent
`BUILD002_002E_SPEC_R8_CANONICALIZATION_R1` review.

R8 starts directly from canonical main commit
`58e69b4d7d683412a0bfa60b5121be82d5426eaa`, tree
`a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884`. R1 through R7 are evidence only
and are not ancestors of R8.

```text
BASE_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
BASE_TREE=a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884
R1_IN_R8_ANCESTRY=NO
R2_IN_R8_ANCESTRY=NO
R3_IN_R8_ANCESTRY=NO
R4_IN_R8_ANCESTRY=NO
R5_IN_R8_ANCESTRY=NO
R6_IN_R8_ANCESTRY=NO
R7_IN_R8_ANCESTRY=NO
```

## 1. Authority, scope, and corrected inventory

Parent authority remains 002-E in
`docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md` at historical commit
`2057ffeb4b63e878379da2e25c2252be2707a125`, blob
`589d406f78423367259d07dc759eb3f97fdee349`. Supporting objective remains
`docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md` at commit
`a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`, blob
`bfe82d08adc29b8fe032f5a39c5e24620b1257a8`.

The reachable DML surface remains 75. Fresh two-instance analysis contradicts
R7's 24 `PROVEN_DISJOINT` classifications. Seventeen of those templates wait
on a same-template natural unique key or row. The remaining seven wait on their
own PK/target row; `blind_evaluation_sets DELETE` also waits on child RI
holders. A PostgreSQL 17.10 probe independently reproduced the natural-key wait
for `preservation_study_ratings(case_id,candidate_label)` as SQLSTATE `55P03`
under diagnostic `lock_timeout`.

Consequently, all 24 are reclassified as `PROVEN_ONE_WAY_WAIT`. This is a
classification correction from new evidence, not a new W class or a new build
objective. The exact corrected partition is:

```text
GLOBAL_REACHABLE_DML_PATHS_TOTAL=75
MATERIAL_WRITER_PATHS_TOTAL=27
SYNCHRONIZED_WAIT_PARTICIPANTS_TOTAL=14
PROVEN_ONE_WAY_WAIT_PATHS_TOTAL=34
DISJOINT_REACHABLE_DML_PATHS_TOTAL=0
PARTITION=27+14+34+0=75
NEW_W_CLASS_CREATED=NO
```

The 24 corrected paths are the seven target-row/PK paths for project update,
execution-run metadata update, candidate-asset commit, intent-run insert,
intent-model-failure insert, blind-set delete, and blind-session completion;
five preservation run/preference/study paths; two intent/benchmark inserts;
seven blind-evaluation insert/update paths; and the preservation-study intent
locking RPC. Every corrected path has at least one real PostgreSQL wait
semantics and no path is left classified disjoint while carrying a proposed
wait edge.

## 2. Structurally pure BASE footprint

R7's historical current-footprint hash
`d05ac499591c93b987c00dda54a1c7da18784e5a67bc56e065a9c6490b5f6e51`
is rejected as base authority. It contained 41 records with 150 future fence
entries and remains diagnostic evidence only.

```text
CURRENT_FOOTPRINT_RECORDS_WITH_FUTURE_FENCES=41
CURRENT_FOOTPRINT_FUTURE_FENCE_ENTRIES=150
R7_CURRENT_LOCK_FOOTPRINT_HASH_CANONICAL=NO
```

The R8 `CurrentLockFootprintRecord` schema is closed (`additionalProperties` is
false) and contains only:

```text
CurrentLockFootprintRecord {
  operation_id,
  source_identity,
  reachability,
  actual_target_dml,
  actual_target_table_lock,
  actual_tuple_row_locks,
  actual_unique_exclusion_sites,
  actual_fk_checks,
  actual_enabled_trigger_effects,
  actual_nested_function_effects,
  actual_explicit_row_locks,
  actual_explicit_table_locks,
  actual_current_acquisition_behavior
}
```

The schema has no field for required fences, future parent locks, future
routing/revalidation, future broad-lock removal, bootstrap, or fence-row locks.
Adding `required_fence` fails validation.

The 75 records were regenerated after sorting actual events by executable
`phase`, then source ordinal, and generated twice in independent directories.
Both canonical JSON outputs were identical.

```text
CURRENT_FOOTPRINT_SCHEMA_CAN_EXPRESS_NORMATIVE_ROUTING=NO
PURE_BASE_LOCK_FOOTPRINT_RECORDS=75
PURE_BASE_LOCK_FOOTPRINT_MANIFEST_SHA256=cbd625f20925fd185b787683e9e2e1fe64938ce890092b1432438d405416e99a
PURE_BASE_CURRENT_FOOTPRINT=YES
PURE_BASE_FUTURE_FENCE_ENTRIES=0
PURE_BASE_FUTURE_PARENT_LOCK_ENTRIES=0
PURE_BASE_NORMATIVE_FIELDS=0
PURE_BASE_MANIFEST_REPRODUCIBLE=YES
PURE_BASE_GENERATOR_DETERMINISTIC=YES
```

## 3. Separate normative overlay and derived plan

`NORMATIVE_ROUTING_OVERLAY` is a separate 41-operation artifact. It contains
only future requirements: required fence sets, exact bootstrap pairs, fence-row
locks, explicit parent rows, broad-lock removal/narrowing, post-fence reread,
mutation placement, and restart behavior.

```text
PROPOSED_ACQUISITION_PLAN = APPLY(
  PURE_BASE_LOCK_FOOTPRINT,
  NORMATIVE_ROUTING_OVERLAY
)

NORMATIVE_ROUTING_OVERLAY_OPERATIONS=41
NORMATIVE_ROUTING_OVERLAY_SHA256=24b0af7cf365135a65d463a36e7458132b2dbff5795bb91018d52ac467141470
CURRENT_AND_PROPOSED_MODEL_SEPARATED=YES
PURE_BASE_CONTAINS_PROPOSED_BEHAVIOR=NO
PROPOSED_PLAN_CONTAINS_ALL_NORMATIVE_BEHAVIOR=YES
```

The corrected overlay first discovers the complete exact fence set without
locking it, sorts that set by `fence_kind_rank` and exact typed canonical scope,
then executes the complete primitive for each fence before the next fence. Only
after the entire fence phase may it lock ordinary parents, rederive identities
and authority, mutate the child, and write evidence.

Canonical phases are:

```text
00 ISOLATION_GUARD
10 DISCOVERY_NONAUTHORITATIVE
20 SORTED_EXACT_FENCE_PRIMITIVES
40 POST_FENCE_IDENTITY_REDERIVATION
50 EXPLICIT_PARENT_AND_ORDINARY_LOCKS
60 AUTHORITATIVE_REVALIDATION
70 TARGET_MUTATION
80 CONSTRAINT_TRIGGER_NESTED_EFFECTS
90 EVIDENCE
100 COMMIT
```

The phase-20 unit is a pair, not two global batches:

```text
F1.BOOTSTRAP_KEY -> F1.FENCE_ROW -> F2.BOOTSTRAP_KEY -> F2.FENCE_ROW
```

The relation within each pair is plan order; the key and row are distinct
physical resources.

## 4. Complete protected acquisition plans

The 27 material plans retain these fence families in global rank order:

| Operation | Required fence set |
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

The 14 synchronized wait-participant plans are:

| ID / operation | Fence set | Explicit parent rows | Child target |
|---|---|---|---|
| S01 `createStrategyRun` | tenant, transaction | outcome transaction; tenant | preservation_strategy_runs |
| S02 legacy mutation lease `create` | tenant, transaction | outcome transaction; tenant | mutation_leases |
| S03 execution run `create` | tenant, transaction | outcome transaction; tenant | execution_runs |
| S04 evidence receipt `create` | tenant, transaction, source version | source version; outcome transaction; tenant | evidence_receipts |
| S05 verification run `create` | tenant, transaction | outcome transaction; tenant | verification_runs |
| S06 criterion evidence `create` | tenant, transaction | outcome transaction; tenant | verification_criterion_evidence |
| S07 cost record `create` | tenant, transaction | outcome transaction; tenant | cost_records |
| S08 media storage `create` | tenant, asset | asset; tenant | media_storage |
| S09 semantic snapshot `create` | tenant, transaction | outcome transaction; tenant | semantic_snapshots |
| S10 CandidateAsset `create` | tenant, transaction, source version | source version; outcome transaction; tenant | candidate_assets |
| S11 preservation run `create` | tenant, transaction, source version | source version; outcome transaction; tenant | preservation_runs |
| S12 candidate preference `create` | tenant, transaction | outcome transaction; tenant | candidate_preferences |
| S13 preservation study `createCase` | transaction, source version | source version; outcome transaction | preservation_study_cases |
| W28 state commit `create` | tenant, transaction, asset, new version, nullable previous version | new version; optional previous version; asset; outcome transaction; tenant | state_commits |

All explicit parents use exact `FOR UPDATE` row ResourceIds before child DML.
The complete overlay validator reports:

```text
PROTECTED_PLAN_GLOBAL_RESOURCE_ORDER_MONOTONIC=41/41
ALL_14_WAIT_PARTICIPANT_FENCE_PLANS_COMPLETE=YES
ALL_14_WAIT_PARTICIPANT_PARENT_PLANS_COMPLETE=YES
ALL_14_WAIT_PARTICIPANTS_FUTURE_ROUTABLE=YES
ALL_27_MATERIAL_ACQUISITION_PLANS_COMPLETE=YES
ALL_27_MATERIAL_WRITERS_FUTURE_ROUTABLE=YES
PROTECTED_PLAN_UNRESOLVED_SYMBOLS=0
```

Candidate acquires `TENANT_AUTHORITY`, `OUTCOME_TRANSACTION`, and
`SOURCE_ASSET_VERSION`, then exact rows `tenants/$tenantId`,
`outcome_transactions/$outcomeTransactionId`, and
`asset_versions/$sourceVersionId`, all before its child insert.

```text
CANDIDATE_EXPLICIT_PARENT_LOCKS=3
CANDIDATE_PARENT_RESOURCE_UNIFICATION=3/3
W28_EXPLICIT_PARENT_PLAN_COMPLETE=YES
W28_002E_ROLE=WAIT_GRAPH_ONLY
W28_MATERIAL_REVISION_CREATED=NO
```

## 5. Complete symbolic identity model

Every symbolic occurrence in current and proposed row identities, table
lineage, unique keys, FK parents, fences, and bootstrap keys belongs to this
closed schema:

```text
SymbolicIdentity {
  variable_id,
  operation_template,
  instance_scope,
  source_expression,
  SQL_type,
  semantic_domain,
  provenance,
  canonical_equivalence_class,
  freshness_constraint,
  nullability,
  equality_constraints,
  disequality_constraints
}
```

R8 registers 448 template-scoped variables. Default classes are singleton;
SQL type and broad semantic domain never create equality. Reuse of the same
source expression within one instance is identity. Cross-instance values begin
`MAY_EQUAL`; exact lineage may promote them to `MUST_EQUAL`, while proven fresh
generation may constrain them `MUST_DIFFER`. Every promotion carries source,
catalog, FK, or canonical-lineage provenance. No corrected-base relation needed
an unproven cross-symbol `MUST_EQUAL`, so all 448 canonical classes remain
singleton in this generated surface.

```text
SYMBOLIC_RELATION_MODEL=MUST_EQUAL_MUST_DIFFER_MAY_EQUAL
SQL_TYPE_EQUALITY_IMPLIES_IDENTITY_EQUALITY=NO
SYMBOLIC_VARIABLES_TOTAL=448
SYMBOLIC_VARIABLES_REGISTERED=448
UNREGISTERED_SYMBOLIC_VARIABLES=0
SYMBOLIC_EQUIVALENCE_CLASSES_TOTAL=448
EVERY_SYMBOL_HAS_CANONICAL_CLASS=YES
UNPROVEN_MUST_EQUAL_RELATIONS=0
INSTANCE_SCOPED_SYMBOLIC_VARIABLES=YES
```

Every `OperationInstance` namespaces bindings, for example `$tenantId@A` and
`$tenantId@B`. The identity satisfiability solver first requires identical
resource family/schema/relation/key shape, then applies canonical lineage, FK
mapping, nullability, and all `MUST_EQUAL`/`MUST_DIFFER` constraints. Remaining
`MAY_EQUAL` pairs are conservatively unifiable. Different structural identities
are proven unequal; matching unresolved-looking values are retained as possible
aliases, preventing false negatives.

```text
RESOURCE_IDENTITY_UNIFICATION_SOLVER=YES
UNRESOLVED_SYMBOLIC_RESOURCE_IDENTITIES=0
RESOURCE_IDENTITY_INDEPENDENT_OF_LOCK_MODE=YES
FK_KEY_SHARE_AND_EXPLICIT_UPDATE_SHARE_RESOURCE_ID=YES
TABLE_LOCK_RESOURCE_UNIFICATION=YES
```

Canonical families are `ROW`, `TABLE`, `UNIQUE_KEY`,
`FENCE_BOOTSTRAP_KEY`, and `FENCE_ROW`. Mode is always an attribute.

## 6. Exact future fence table and bootstrap primitive

The only mechanically permitted conceptual relation is:

```sql
CREATE TABLE public.build002_material_fences (
    fence_kind text NOT NULL,
    identity_schema_version integer NOT NULL,
    canonical_scope_identity jsonb NOT NULL,
    material_revision bigint NOT NULL,
    serialization_revision bigint NOT NULL,
    PRIMARY KEY (
        fence_kind,
        identity_schema_version,
        canonical_scope_identity
    )
);
```

`canonical_scope_identity` is exact typed JSONB; no truncated hash may replace
it. Version starts at 1. The table has no enabled triggers, FKs, secondary
unique constraints, or secondary mutating effects.

The canonical primitive is exactly materially equivalent to:

```sql
INSERT INTO build002_material_fences (
    fence_kind,
    identity_schema_version,
    canonical_scope_identity,
    material_revision,
    serialization_revision
)
VALUES (
    p_fence_kind,
    1,
    p_canonical_scope_identity,
    0,
    0
)
ON CONFLICT (
    fence_kind,
    identity_schema_version,
    canonical_scope_identity
)
DO NOTHING;

SELECT
    fence_kind,
    identity_schema_version,
    canonical_scope_identity,
    material_revision,
    serialization_revision
FROM build002_material_fences
WHERE fence_kind = p_fence_kind
  AND identity_schema_version = 1
  AND canonical_scope_identity = p_canonical_scope_identity
FOR UPDATE;
```

Both statements execute in the same protected transaction. Existing rows take
the exact unique-conflict path then the exact row lock. Missing rows are
inserted and selected by the inserting transaction. Concurrent missing-row
materialization may wait on the uncommitted exact PK during uniqueness
resolution; after resolution, the exact row lock may wait again.

```text
FENCE_IDENTITY_SCHEMA_VERSION_INITIAL=1
FENCE_SCOPE_IDENTITY_EXACT_TYPED_JSONB=YES
FENCE_TABLE_ENABLED_TRIGGERS=0
FENCE_TABLE_FOREIGN_KEYS=0
FENCE_TABLE_SECONDARY_UNIQUE_CONSTRAINTS=0
FENCE_TABLE_SECONDARY_MUTATING_SIDE_EFFECTS=0
FENCE_BOOTSTRAP_PRIMITIVE=INSERT_ON_CONFLICT_DO_NOTHING_THEN_SELECT_FOR_UPDATE
FENCE_BOOTSTRAP_NOOP_UPDATE_USED=NO
EXISTING_FENCE_ROW_BOOTSTRAP_PATH_EXACT=YES
MISSING_FENCE_ROW_BOOTSTRAP_PATH_EXACT=YES
SAME_KEY_UNIQUE_WAIT_MODELED=YES
BOOTSTRAP_KEY_AND_FENCE_ROW_RESOURCE_IDS_DISTINCT=YES
BOOTSTRAP_TO_FENCE_ROW_PLAN_RELATION_ACCOUNTED=YES
FULL_FENCE_SET_SORTED_BEFORE_FIRST_BOOTSTRAP=YES
BOOTSTRAP_SUBSET_SUPERSET_CYCLE=NO
COMPLETE_FENCE_PHASE_BEFORE_DOWNSTREAM=YES
```

No client or service-role grant exposes this table. The statements occur only
inside protected server-owned functions; there is no generic bootstrap RPC.

```text
DIRECT_CLIENT_FENCE_INSERT=NO
DIRECT_SERVICE_ROLE_FENCE_INSERT=NO
GENERIC_BOOTSTRAP_RPC_EXPOSED=NO
FENCE_IDENTITY_SERVER_VALIDATED=YES
```

## 7. PostgreSQL 17.10 bootstrap proof

An ephemeral PostgreSQL 17.10 (`server_version_num=170010`) prototype used the
exact table and two-statement primitive with explicit barriers and `pg_locks` /
`pg_stat_activity` inspection:

| Class | Schedule | Observation |
|---|---|---|
| B01 | same missing key, two sessions | second INSERT waited on transactionid uniqueness resolution |
| B02 | existing same key, two sessions | second SELECT FOR UPDATE waited on first row owner |
| B03 | A input F1,F2; B input F2,F1 | both sorted F1,F2; one-way wait, no cycle |
| B04 | A F1,F2; B F2 | superset waited on subset at F2; no reverse request |
| B05 | three overlapping ordered sets | three observed lock waits formed a chain, not a cycle |

The probe completed all transactions, observed no SQLSTATE `40P01`, and used
no timeout to claim success. Diagnostic timeout was used only by the separate
same-template natural-key blocking probe.

```text
BOOTSTRAP_RUNTIME_PROBE_CLASSES=5
BOOTSTRAP_RUNTIME_DEADLOCKS=0
BOOTSTRAP_RUNTIME_FOOTPRINT_DERIVABLE=YES
BOOTSTRAP_RUNTIME_FOOTPRINT_MATCHES_MODEL=YES
```

## 8. Plan-order graph versus wait-for graph

R8 maintains two disjoint relations:

```text
PLAN_ORDER_EDGE:
  one instance acquired X before requesting Y

WAIT_FOR_EDGE A -> B iff:
  A.next_request conflicts with an element of B.held_lock_set
  AND A.instance_id != B.instance_id
  AND the two resource identities can unify
```

The state schemas are:

```text
OperationInstance {
  operation_template_id,
  instance_id,
  symbolic_bindings
}

TransactionWaitState {
  operation_template_id,
  instance_id,
  plan_position,
  held_lock_set,
  next_request,
  symbolic_bindings
}
```

Plan-order edges never enter SCC analysis. Bootstrap-key to exact fence-row is
plan order; a conflicting lock held by another transaction creates a separate
wait edge. States whose held sets already conflict are pruned as unreachable
simultaneous states. Row/table modes are normalized to PostgreSQL 17 names
before compatibility testing.

The model instantiates A and B for every one of the 75 templates. Equal
operation-template IDs are never suppressed. It generated 2,092 same-template
cross-instance wait edges and also supports cycles with repeated templates such
as A#1/B#1/A#2 or A#1/A#2/A#3. A synthetic single-template X→Y/Y→X schedule
produced a two-instance SCC.

```text
PLAN_ORDER_EDGE_IS_WAIT_EDGE=NO
WAIT_EDGE_CROSS_TRANSACTION_ONLY=YES
WAIT_STATE_HAS_INSTANCE_ID=YES
WAIT_STATE_HAS_HELD_LOCK_SET=YES
WAIT_STATE_HAS_NEXT_REQUEST=YES
GRAPH_NODE_IDENTITY_INCLUDES_INSTANCE_ID=YES
PROPOSED_GRAPH_NODES_WITH_INSTANCE_ID_GT_0=YES
EQUAL_OPERATION_TEMPLATE_PAIR_SUPPRESSION=NO
SAME_OPERATION_TYPE_CROSS_TRANSACTION_EDGES_SUPPORTED=YES
SAME_TEMPLATE_TWO_INSTANCE_ANALYSIS=75/75
REPEATED_OPERATION_TEMPLATE_CYCLES_MODELED=YES
```

## 9. Current/proposed graph differential

Both graphs are generated from acquisition-ordered events, complete symbolic
bindings, and two instances per template. Current contains only pure BASE;
proposed is BASE plus the exact overlay.

```text
CURRENT_GRAPH_CONTAINS_FUTURE_ROUTING=NO
PROPOSED_GRAPH_CONTAINS_COMPLETE_ROUTING=YES
PURE_CURRENT_WAIT_STATE_GRAPH_SHA256=d599bdaccd999de70e3a4cbd259c1f4d8d539a413bc7b38c4150a00c11a058ec
PROPOSED_WAIT_STATE_GRAPH_SHA256=dff0990ad6b79abc0e6456fa974a7f6d63ae7e24afd6fc34a6f985c786b3db79
PROPOSED_GRAPH_REPRODUCIBLE=YES
PROPOSED_GRAPH_GENERATOR_DETERMINISTIC=YES
PLAN_ORDER_EDGES_TOTAL=2012
WAIT_FOR_EDGES_TOTAL=161004
PLAN_ORDER_EDGES_INCLUDED_IN_SCC_GRAPH=NO
WAIT_FOR_EDGES_INCLUDED_IN_SCC_GRAPH=YES
PROPOSED_WAIT_FOR_SCC_GT1=0
PROPOSED_SELF_WAIT_EDGES=0
ONE_WAY_PATHS_IN_NONTRIVIAL_WAIT_SCC=0
DISJOINT_PATHS_WITH_PROPOSED_WAIT_EDGE=0
```

The corrected current graph retains the known Candidate/D3 control. One
satisfiable state has Candidate holding tenant `FOR KEY SHARE` and requesting
source version `FOR KEY SHARE`, while D3 holds source version `FOR UPDATE` and
requests tenant `FOR UPDATE`; equivalently reversed acquisition witnesses are
present after normalizing executable phases. The conservative SCC witness has
120 wait-state nodes and contains both operation templates.

The proposed Candidate plan reaches all three fence and parent locks in the
global order before child DML, so the Candidate/D3 cycle is absent. Since the
full proposed wait graph has no nontrivial SCC, the proposed Candidate cycle is
also absent.

```text
CURRENT_CANDIDATE_D3_CYCLE_CAPABLE=YES
CURRENT_CANDIDATE_D3_CYCLE_WITNESS_COMPLETE=YES
PROPOSED_CANDIDATE_D3_CYCLE_CAPABLE=NO
EVERY_MODELED_WAIT_EDGE_HAS_REAL_CONFLICT_SEMANTICS=YES
RUNTIME_WAIT_TO_MODEL_EDGE_COMPLETE=YES
RUNTIME_DEADLOCK_TO_MODEL_CYCLE_COMPLETE=YES
WAIT_GRAPH_IS_CONSERVATIVE_FOR_DEADLOCK_PROOF=YES
```

## 10. Environmental referential integrity

The intersecting reachable graph has one environmental parent,
`auth.users(id)`, reached through eight effective FKs. Each FK uses
`ON DELETE RESTRICT` and contributes two environmental mutation classes:
parent `DELETE` and referenced-key `UPDATE`.

| FK | Protected/reachable child operations | Parent mutation footprint | Reverse wait |
|---|---|---|---|
| `build002_delegability_admissions_principal_id_fkey` | admit delegability | auth.users target row UPDATE-class lock; RI child scan | yes |
| `build002_execution_attempt_reservations_principal_id_fkey` | reserve execution attempt | same | yes |
| `build002_execution_authorities_principal_id_fkey` | grant execution authority | same | yes |
| `build002_mutation_leases_principal_id_fkey` | grant/consume/reserve lease paths | same | yes |
| `build002_readiness_authority_commits_principal_id_fkey` | readiness authority commit | same | yes |
| `tenant_memberships_principal_id_fkey` | personal-tenant provisioning | same | yes |
| `tenants_personal_owner_principal_id_fkey` | personal-tenant provisioning | same | yes |
| `field_feedback_recorded_by_principal_id_fkey` | reachable field-feedback insert | same | yes |

The representative PostgreSQL 17.10 probe ran a child insert against parent
DELETE and legal referenced-key UPDATE. Both parent operations waited on a
`transactionid`; after child commit both ended with SQLSTATE `23503`, proving
the reverse RI edge.

The edge cannot close a full cycle for this FK shape. If child DML wins, its
parent `FOR KEY SHARE` blocks the conflicting parent mutation before the parent
RI scan. If the parent mutation wins, child DML blocks on the parent before it
can create/update the referencing child row. Thus the parent transaction cannot
simultaneously hold the conflicting auth row and wait on that same child
transaction. BUILD002 creates no authority over `auth.users`.

```text
ENVIRONMENTAL_PARENT_MUTATION_CLASSES_TOTAL=16
ENVIRONMENTAL_PARENT_MUTATION_CLASSES_ACCOUNTED=16
AUTH_USERS_RI_RUNTIME_PROBE=PASS
AUTH_USERS_REVERSE_RI_EDGE_POSSIBLE=YES
AUTH_USERS_ENVIRONMENTAL_CYCLE_UNACCOUNTED=0
UNACCOUNTED_ENVIRONMENTAL_RI_WAIT_EDGES=0
```

## 11. Executed negative tests and drift gates

Eight executable analysis-only mutations ran outside repository state:

1. add forbidden `required_fence` to the closed pure-base schema;
2. inject an unregistered ResourceId variable;
3. give the same row different lock-mode labels and require identity collapse;
4. remove one of Candidate's three explicit parents;
5. omit the SELECT FOR UPDATE half of a bootstrap primitive;
6. use one template with X→Y and Y→X across instances;
7. misclassify a one-instance X→Y plan edge as a wait edge;
8. omit an observed reverse `auth.users` RI class.

Each invalid mutation failed closed; the same-template mutation produced the
required SCC.

```text
PURE_BASE_CONTAMINATION_NEGATIVE_TEST=PASS
SYMBOLIC_UNREGISTERED_VARIABLE_NEGATIVE_TEST=PASS
RESOURCE_IDENTITY_NORMALIZATION_NEGATIVE_TEST=PASS
EXPLICIT_PARENT_LOCK_NEGATIVE_TEST=PASS
BOOTSTRAP_OMISSION_NEGATIVE_TEST=PASS
SAME_TEMPLATE_INSTANCE_NEGATIVE_TEST=PASS
PLAN_ORDER_AS_WAIT_EDGE_NEGATIVE_TEST=PASS
ENVIRONMENTAL_RI_REVERSE_EDGE_NEGATIVE_TEST=PASS
```

Future implementation verification regenerates the current-equivalent surface,
implemented overlay, symbol registry, identity constraints, exact SQL,
acquisition plans, environmental RI classes, both graphs, and SCC result from
its own candidate SHA.

```text
STATIC_MUTATION_SURFACE_DRIFT_FAILS_CLOSED=YES
DB_MUTATION_SURFACE_DRIFT_FAILS_CLOSED=YES
CONSTRAINT_SURFACE_DRIFT_FAILS_CLOSED=YES
LOCK_FOOTPRINT_SURFACE_DRIFT_FAILS_CLOSED=YES
ROUTING_OVERLAY_DRIFT_FAILS_CLOSED=YES
SYMBOLIC_IDENTITY_DRIFT_FAILS_CLOSED=YES
BOOTSTRAP_SEMANTICS_DRIFT_FAILS_CLOSED=YES
WAIT_GRAPH_DRIFT_FAILS_CLOSED=YES
```

## 12. Isolation, authority, retry, and scope firewalls

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
POSTGREST_RPC_READ_COMMITTED_PIN_REQUIRED=YES
RPC_RUNTIME_ISOLATION_GUARD=YES
SERIALIZATION_FAILURE_FULL_RESTART=YES
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES

WAIT_ONLY_FENCE_GRANTS_AUTHORITY=NO
WAIT_ONLY_FENCE_GRANTS_RETRY=NO
WAIT_ONLY_OPERATION_CREATES_MATERIAL_REVISION=NO
WAIT_ONLY_EVIDENCE_GRANTS_AUTHORITY=NO

PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
002E_DEFINES_RETRY_POLICY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO

FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO

GENERIC_DATABASE_LOCK_MODEL_CREATED=NO
GENERIC_LOCK_SERVICE_CREATED=NO
GENERIC_DATABASE_GOVERNANCE_PLATFORM_CREATED=NO
002E_SCOPE_EXPANSION_FOUND=NO
```

Post-fence statements reread current committed state under READ COMMITTED.
Material and serialization revisions plus append-only evidence keep durable
order reconstructable. Graph evidence never grants provider success, retry,
readiness, execution authority, or canonical commit authority.

## 13. Requirements and candidate result

The parent-traceable requirements remain exactly R01–R10. R03 is refined to
require the structurally pure current model, separate normative overlay, exact
PostgreSQL bootstrap, instance-aware wait graph, complete symbolic identity,
and environmental RI accounting. No new BUILD002 objective is introduced.

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0

PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
NEXT_GATE=BUILD002_002E_SPEC_R8_CANONICALIZATION_R1
```

R8 stops after specification-candidate creation.
