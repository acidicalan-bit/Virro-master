# BUILD002 002-E — Stale/concurrency hardening specification

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R10
EXECUTION_ID=BUILD002_002E_SPEC_R10_RETRY_R1
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
BASE_MAIN_TREE=a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R9=YES
002E_IMPLEMENTATION_AUTHORIZED=NO
```

## 1. Authority, boundary, and preserved foundation

R1 through R9 are evidence only and none is in R10 ancestry. The failed first
R10 attempt created no commit, branch, or specification. This candidate starts
directly from the SHA and tree above and changes only this document.

The RFC and the existing global BUILD002 sequence remain authority. R10 changes
the proposed routing overlay only where necessary to serialize
`SupabasePreservationStudyRepository.createCase` on its existing study parent.
It creates no product migration, application code, generic lock service, or new
BUILD002 fence identity.

```text
GLOBAL_REACHABLE_DML_PATHS_TOTAL=75
MATERIAL_WRITER_PATHS_TOTAL=27
SYNCHRONIZED_WAIT_PARTICIPANTS_TOTAL=14
PROVEN_ONE_WAY_WAIT_PATHS_TOTAL=34
DISJOINT_REACHABLE_DML_PATHS_TOTAL=0
PROTECTED_002E_OPERATION_TEMPLATES=41
PURE_BASE_LOCK_FOOTPRINT_MANIFEST_SHA256=cbd625f20925fd185b787683e9e2e1fe64938ce890092b1432438d405416e99a
PURE_BASE_CHANGED_BY_R10=NO
FENCE_IDENTITIES_TOTAL=19
NEW_R10_FENCE_IDENTITIES=0
MATERIAL_DEPENDENCY_CLASSES=17
```

## 2. R10 routing delta

R9 did not explicitly lock the study parent before the case INSERT. R10 adds
exactly this ordinary parent ResourceId to the protected `createCase` route:

```text
ROW|public|preservation_value_studies|id=$studyId
MODE=FOR_UPDATE
SOURCE=EXPLICIT_SELECT
PROVENANCE=preservation_study_cases_study_id_fkey
```

It is acquired after the complete canonical-fence phase and post-fence identity
rederivation, as part of the complete explicit-parent set, and before
`preservation_study_cases` INSERT. `studyId` is already present in the current
call contract. It is used only as a synchronization and FK identity and grants
the caller no authority.

The effective schema proves `study_id uuid NOT NULL REFERENCES
preservation_value_studies(id)`. The study row is an ordinary PostgreSQL row,
not a BUILD002 material fence.

```text
R9_NORMATIVE_ROUTING_OVERLAY_SHA256=4e77f7ae9e8aeee664dd9bf9639f8df52128fa2c87dd1e307dbe278115729ae2
R9_ROUTING_OVERLAY_CANONICAL_FOR_R10=NO
R10_ROUTING_CHANGE_REQUIRED=YES
R10_NORMATIVE_ROUTING_OVERLAY_SHA256=7143ec055935ab664443e540119b45673d59f3dbc21aa01085d05ab6267fa4fd
R9_R10_ROUTING_OVERLAY_EQUAL=NO
PRESERVATION_STUDY_CASE_NEW_FENCE_REQUIRED=NO
PRESERVATION_CASE_STUDY_FK_PRESENT=YES
PRESERVATION_CASE_STUDY_ID_NOT_NULL=YES
STUDY_ID_AVAILABLE_PRE_DML=YES
STUDY_ID_CALLER_AUTHORITY_GRANTED=NO
PRESERVATION_STUDY_PARENT_LOCK_MODE=FOR_UPDATE
STUDY_ROW_LOCK_AFTER_COMPLETE_FENCE_PHASE=YES
STUDY_ROW_LOCK_BEFORE_CASE_INSERT=YES
```

## 3. Parent order extension

`public.preservation_value_studies` is appended at rank 20 of the controlled
explicit-parent family domain. The prior ranks 0 through 19 do not change.
Appending is valid because no protected plan acquires this family and then a
lower-ranked parent; `createCase` acquires `asset_versions(0)`,
`outcome_transactions(15)`, then `preservation_value_studies(20)`.

For each protected operation the full fence set and full parent set are known,
deduplicated by exact ResourceId, and database-sorted before acquisition.
Semantic role and input order are not tiebreakers.

```text
PRESERVATION_VALUE_STUDIES_PARENT_RANK=20
PARENT_ROW_ORDER_TOTAL=YES
PARENT_ROW_ORDER_WELL_FOUNDED=YES
PROTECTED_BOUNDARY_RANK_MONOTONIC=41/41
PROTECTED_BOUNDARY_RANK_DESCENTS=0
```

## 4. Same-study and cross-study lemmas

For any two routed case creations A and B:

```text
A.study_id = B.study_id
=> ROW(public.preservation_value_studies,A.study_id)
 = ROW(public.preservation_value_studies,B.study_id)
=> their FOR UPDATE requests conflict before either child INSERT
```

Therefore only one same-study transaction can enter the child UNIQUE suffix.
Both composite unique sites begin with `study_id`:

- `(study_id, plan_case_id)` equality implies the same study row. With default
  `NULLS DISTINCT`, a NULL `plan_case_id` does not create an equal-key conflict.
- `(study_id, transaction_id)` equality implies the same study row; no tenant
  implication is needed.

For different studies neither composite tuple can be equal. Different-study
transactions can share only the globally scoped `PRIMARY KEY(id)` conflict.

```text
SAME_STUDY_CREATECASE_SERIALIZED_PRE_INSERT=YES
STUDY_PLANCASE_UNIQUE_FUNCTIONALLY_DOMINATED_BY_STUDY_ROW=YES
STUDY_PLANCASE_NULL_SEMANTICS_ACCOUNTED=YES
STUDY_TRANSACTION_UNIQUE_FUNCTIONALLY_DOMINATED_BY_STUDY_ROW=YES
CROSS_STUDY_COMPOSITE_UNIQUE_CONFLICT_POSSIBLE=NO
PRESERVATION_CASE_CORRECTNESS_DEPENDS_ON_UNIQUE_INDEX_ORDER=NO
POSTGRESQL_MULTI_UNIQUE_INTERNAL_ORDER_AUTHORITY=NONE
```

PostgreSQL's documented per-index uniqueness waiting semantics are used, but no
order between multiple unique indexes is claimed. The proof is valid for all
six logical permutations of PK, study/plan, and study/transaction checks.

```text
PRESERVATION_CASE_UNIQUE_ORDER_PERMUTATIONS=6
PRESERVATION_CASE_UNIQUE_ORDER_PERMUTATIONS_SAFE=6/6
PRESERVATION_CASE_UNIQUE_ORDER_PERMUTATIONS_SHA256=3d5e3b27a73577d2e3cb5830fa3de89f14f68305680d57a170005bca1648fac8
```

## 5. Global case-ID terminal gate

The effective schema uses `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` and
the repository omits `id`. R10 does not require preallocation and does not use
collision probability as correctness. A theoretical equal UUID across studies
remains legal in the model.

Suppose A in S1 and B in S2 both generate X and B waits for A on
`preservation_study_cases_pkey(X)`. A cannot subsequently wait on a composite
unique resource owned by B because the studies differ. A cannot wait on a
same-study transaction C because A already owns S1 `FOR UPDATE` and C is
stopped before INSERT. All relevant FK suffixes are prelocked or conflict-safe,
and no enabled user trigger fires on INSERT. Commit or abort releases X without
a new protected acquisition.

Thus the PK is a real wait-capable resource but a terminal no-return gate:

```text
CASE_ID_GENERATED_DURING_INSERT=YES
UUID_COLLISION_PROBABILITY_USED_AS_CORRECTNESS=NO
CASE_ID_COMMON_STUDY_SERIALIZER=NO
CASE_ID_CROSS_STUDY_CONFLICT_POSSIBLE=YES
PRESERVATION_CASE_ID_PKEY_TREATMENT=DIRECTLY_RANKED_TERMINAL_CONFLICT
CASE_ID_WINNER_COMPOSITE_UNIQUE_DOWNSTREAM_WAIT=NO
PRESERVATION_CASE_ID_TERMINAL_GATE_LEMMA_PROVEN=YES
TERMINAL_CONFLICT_CAN_WAIT=YES
TERMINAL_CONFLICT_CAN_CARRY_RETURN_EDGE=NO
```

The three-way model A(S1,X), B(S2,X), C(S1,conflicting composite) stops C on
the S1 parent. The four-way model additionally stops D(S2,conflicting
composite) on B's S2 parent. A and B share only the PK.

```text
C_BLOCKED_ON_STUDY_ROW_BEFORE_INSERT=YES
A_CANNOT_WAIT_ON_C_COMPOSITE_UNIQUE=YES
THREE_WAY_CASE_UNIQUE_CYCLE=NO
C_BLOCKED_PRE_INSERT_BY_A_STUDY_ROW=YES
D_BLOCKED_PRE_INSERT_BY_B_STUDY_ROW=YES
A_B_ONLY_SHARED_UNIQUE_SITE=PRIMARY_KEY_ID
FOUR_WAY_CASE_UNIQUE_CYCLE=NO
```

## 6. FK and trigger suffix

Effective catalog replay contains seven `preservation_study_cases` FKs:

1. `study_id` → `preservation_value_studies`
2. `transaction_id` → `outcome_transactions`
3. `execution_run_id` → `execution_runs`
4. `preservation_run_id` → `preservation_runs`
5. `source_version_id` → `asset_versions`
6. `raw_candidate_id` → `candidate_assets`
7. `preserved_candidate_id` → `candidate_assets`

The study, transaction, and source-version parents are exact explicit locks.
The later study FK request is reentrant against the exact study row. Remaining
FK `FOR KEY SHARE` requests are compatible with every protected update mode on
their parent identities, and their lineage is revalidated before INSERT. They
cannot return from the terminal PK to a protected waiter.

The sole enabled user trigger on the table is UPDATE/DELETE-only
`reject_study_mutation`; no user trigger applies to INSERT.

```text
PRESERVATION_CASE_FK_SITES_TOTAL=7
PRESERVATION_CASE_FK_SITES_PRELOCKED_OR_PROVEN_SAFE=7
STUDY_FK_POSTLOCK_REENTRANT=YES
CASE_ID_WINNER_FK_DOWNSTREAM_BOUNDARY_WAIT=NO
PRESERVATION_CASE_ENABLED_TRIGGERS_TOTAL=0
PRESERVATION_CASE_POST_UNIQUE_TRIGGER_BOUNDARY_WAITS=0
```

## 7. PostgreSQL 17.10 runtime evidence

An ephemeral PostgreSQL 17.10 instance used an exact study table, child PK,
both composite UNIQUE constraints, and the proposed parent `FOR UPDATE`.

- Same study: B waited on the parent row before its child INSERT was issued.
- Same-study composite collision: the sessions never reached child uniqueness
  concurrently.
- Different studies with forced equal child ID: B waited on the PK; A committed
  without a downstream lock wait; B received `23505`; no deadlock occurred.

```text
POSTGRESQL_RUNTIME_VERSION_NUM=170010
B_BLOCKS_BEFORE_CASE_INSERT=YES
SAME_STUDY_CHILD_UNIQUE_STATE_BEFORE_LOCK_WIN=NO
COMPOSITE_CONFLICT_SERIALIZED_AT_STUDY_ROW=YES
COMPOSITE_CONFLICT_REACHES_UNIQUE_WAIT_CONCURRENTLY=NO
CROSS_STUDY_PK_WAIT_PROVEN=YES
PK_WINNER_DOWNSTREAM_WAIT=NO
CROSS_STUDY_PK_RUNTIME_DEADLOCKS=0
```

## 8. Global protected multi-UNIQUE audit

`Remaining` counts cross-serializer conflict sites after common serialization;
these are terminal global PKs or fixed cross-table DML-order sites. `Order?=NO`
means no proof depends on PostgreSQL's internal order among indexes of one
INSERT.

| Operation | UNIQUE/EXCLUDE sites | Common pre-INSERT serializer | Remaining | Order? | Final proof |
|---|---|---|---:|---|---|
| FieldBeta.createStrategyRun | pkey; tenant/transaction/strategy | tenant + transaction | 1 | NO | composite dominated; PK terminal |
| FieldBeta.createOutcome | pkey; transaction | transaction | 1 | NO | transaction dominated; PK terminal |
| AssetVersion.create | asset/version; pkey | asset head | 1 | NO | natural key dominated; PK terminal |
| OutcomeTransaction.create (two paths) | owner/id; pkey | outcome transaction | 1 | NO | owner/id refines PK; cross-tenant PK terminal |
| EvidenceReceipt.create | execution; pkey | transaction via execution lineage | 1 | NO | execution dominated; PK terminal |
| VerificationRun.create | execution; pkey | transaction via execution lineage | 1 | NO | execution dominated; PK terminal |
| CriterionEvidence.create | tenant/verification/criterion; pkey | transaction via verification lineage | 1 | NO | composite dominated; PK terminal |
| StateCommit.create | pkey; transaction | outcome transaction | 1 | NO | transaction dominated; PK terminal |
| MediaStorage.create | pkey; storage key | tenant via server `tenants/{uuid}/` namespace | 1 | NO | storage key dominated; PK terminal |
| SemanticSnapshot.create | pkey; transaction | outcome transaction | 1 | NO | transaction dominated; PK terminal |
| CandidateAsset.create | partial execution; pkey | transaction via execution lineage | 1 | NO | execution dominated; PK terminal |
| PreservationRun.create | execution; pkey | transaction via execution lineage | 1 | NO | execution dominated; PK terminal |
| CandidatePreference.create | pkey; transaction | outcome transaction | 1 | NO | transaction dominated; PK terminal |
| PreservationStudy.createCase | pkey; study/plan; study/transaction | study row | 1 | NO | composites dominated; PK terminal |
| provisionPersonalTenant | tenant personal owner; tenant pkey; membership pkey; tenant/principal | personal-owner + membership | 2 | NO | natural keys dominated; fixed cross-table order |
| grantMutationLease | execution-authority/path/category; pkey | mutation-lease scope | 1 | NO | natural key dominated; PK terminal |
| insertDependencySnapshot | four snapshot keys; two child composite PKs | transaction + readiness universe | 1 | NO | composites dominated; PK terminal |
| insertQualification | qualification composite; qualification pkey; signal composite PK | transaction + signal universes | 1 | NO | composites dominated; PK terminal |
| insertReadiness | readiness composite; pkey; qualification composite PK | transaction + readiness universe | 1 | NO | composites dominated; PK terminal |
| insertRequirementSnapshot | three composites; pkey | transaction + requirement universe | 1 | NO | composites dominated; PK terminal |
| insertSignal | three composites; pkey | transaction + signal universe | 1 | NO | composites dominated; PK terminal |
| commitAcceptedFieldOutcome | asset-version natural/pkey; state-commit pkey/transaction | asset head + transaction | 2 | NO | natural keys dominated; fixed cross-table order |
| admitDelegability | tenant/commit/principal/hash; pkey | tenant + admission scope | 1 | NO | composite dominated; PK terminal |
| reserveExecutionAttempt | execution, lease, pair, reservation pkey; mutation-lease natural/pkey | attempt + lease scopes | 1 | NO | natural keys dominated; PK terminal |
| consumeExecutionAttempt | attempt, consumption pkey, reservation; mutation-lease natural/pkey | attempt + lease scopes | 1 | NO | natural keys dominated; PK terminal |
| grantExecutionAuthority | idempotency; pkey | tenant encoded in server key + authority scope | 1 | NO | idempotency dominated; PK terminal |
| commitReadinessAuthority | requirement, snapshot, qualification, readiness and authority keys | transaction + readiness universes | 1 | NO | composites dominated; fixed cross-table order |
| publishBlueprint | id/version/hash; id/version pkey | blueprint family | 0 | NO | both keys share family serializer |
| publishRequirementProfile | id/version/hash; id/version pkey | requirement-profile family | 0 | NO | both keys share family serializer |
| createAssetWithInitialVersion | asset pkey; version natural/pkey; repeated asset pkey | asset head + source version | 2 | NO | repeated asset request reentrant; fixed DML order |

```text
PROTECTED_MULTI_UNIQUE_OPERATIONS_TOTAL=31
PROTECTED_MULTI_UNIQUE_OPERATIONS_ACCOUNTED=31
PROTECTED_MULTI_UNIQUE_INTERNAL_ORDER_DEPENDENCIES=0
UNRESOLVED_PROTECTED_MULTI_UNIQUE_OPERATIONS=0
PROTECTED_MULTI_UNIQUE_AUDIT_SHA256=2c4cd18bdeca51e92bb36b1d3d208ad57fbfc402adca366d5f677cdbfc43dc4a
```

## 9. Outside unordered suffixes

Eighteen of the 34 outside paths contain at least two UNIQUE sites. Their
within-INSERT suffix is conservatively unordered; global certification is not
required. The prior boundary nonreturn proof remains valid. The new case is
`ensureStudy`: it may hold a newly inserted study row and block protected
`createCase`, but it performs no later protected acquisition, so the edge is
one-way and cannot return to the protected core.

```text
OUTSIDE_MULTI_UNIQUE_OPERATIONS_TOTAL=18
OUTSIDE_MULTI_UNIQUE_INTERNAL_ORDER_CERTIFIED=NOT_REQUIRED
OUTSIDE_MULTI_UNIQUE_RETURN_PATHS_UNACCOUNTED=0
OUTSIDE_MULTI_UNIQUE_AUDIT_SHA256=edf9c5b6f61386e34c986ad0d3685ce912ff434da92b56a0b76abf85f418aa08
BOUNDARY_NONRETURNING_PATHS=34/34
PREVIOUS_NP_BOUNDARY_PROOFS=28/28
OUTSIDE_CHAIN_RETURN_PATH_TO_PROTECTED=NO
```

## 10. Corrected implicit classification and graphs

Every implicit boundary event uses exactly one of:
`PRELOCK_REENTRANT`, `FUNCTIONALLY_DOMINATED_BY_COMMON_FENCE`,
`DIRECTLY_RANKED_TERMINAL_CONFLICT`, `STABLE_POSTGRESQL_ORDER_PROVEN`, or
`UNCONTROLLED`. Functional domination is a universal equality implication;
global UUID collision probability is never a premise. Terminal means a real
wait is allowed but no later protected return is possible.

The protected unique suffix graph retains all single-column global PK sites,
deduplicates repeated same-resource acquisitions, and uses fixed SQL DML order
only across different target tables. It uses no same-INSERT index order.

The finite two-instance wait-state graph is diagnostic only; the parametric
proof supplies arbitrary multiplicity. Every protected core transition either
strictly increases the total rank or reaches a terminal no-return gate. An
alleged cycle can do neither indefinitely and cannot return after a terminal
gate.

```text
R10_IMPLICIT_EVENT_JUSTIFICATION_MANIFEST_SHA256=9ca7717ead1274a01734b2e2dec7731656692d7ae07151d1569fe9406cec4aba
IMPLICIT_BOUNDARY_EVENTS_UNCONTROLLED=0
ALL_PROTECTED_WAITS_REQUIRE_COMMON_FENCE=NO
PROTECTED_BOUNDARY_RESOURCES_TOTAL=187
PROTECTED_BOUNDARY_RESOURCE_SET_COMPLETE=YES
PROTECTED_UNIQUE_SUFFIX_GRAPH_NODES=33
PROTECTED_UNIQUE_SUFFIX_GRAPH_EDGES=15
PROTECTED_UNIQUE_SUFFIX_GRAPH_SHA256=fb74f22a13bf37436e23e7af53bff7e785bf05b74223d2dc89af92cba1500624
PROTECTED_UNIQUE_SUFFIX_GRAPH_SCC_GT1=0
R10_PROPOSED_ACQUISITION_PLANS_SHA256=9abd17d070ec70f25bfa0b514180458ab63ac466cee93dfe28697ba4efbad9de
R10_PROPOSED_WAIT_STATE_GRAPH_SHA256=9c8c028ea8ee584bbe31909c53c1b7010c3fd0b7a490ee926c137bb3415f8572
R10_PROPOSED_WAIT_STATE_GRAPH_NODES=2314
R10_PROPOSED_WAIT_FOR_EDGES=161146
R10_PROPOSED_WAIT_FOR_SCC_GT1=0
R10_PROPOSED_GRAPH_REPRODUCIBLE=YES
PROTECTED_RESOURCE_RANK_TOTAL_ON_BOUNDARY=YES
PROTECTED_RESOURCE_RANK_WELL_FOUNDED=YES
PARAMETRIC_PROTECTED_CYCLE_THEOREM_PROVEN=YES
ARBITRARY_TRANSACTION_MULTIPLICITY_COVERED=YES
002E_PROTECTED_CYCLE_FREE_FOR_ARBITRARY_MULTIPLICITY=YES
GLOBAL_DATABASE_DEADLOCK_FREE=NOT_CLAIMED
```

## 11. Negative controls and drift gates

The R10 preservation controls reject: omitted study lock, compatible weak
study lock, a composite key that loses study identity, a synthetic downstream
trigger wait, a PK suffix return, and an outside return edge. Positive controls
cover same-study composite domination, cross-study composite disjointness, and
the three-way blocker. All nine pass. Earlier parent-order, multiplicity,
candidate/D3, boundary-rank, and environmental RI controls also pass.

Future implementation verification fails closed if a unique/exclusion site or
conflict key changes; the study parent lock is missing or weakened; a parent
rank changes; a terminal suffix gains a wait; an INSERT trigger/nested effect
appears; the tenant namespace/idempotency encoding changes; or the routing
overlay differs.

```text
R10_PRESERVATION_NEGATIVE_TESTS=9/9_PASS
BOUNDARY_RANK_DESCENT_NEGATIVE_TEST=PASS
CANDIDATE_D3_BOUNDARY_THEOREM_CONTROL=PASS
ENVIRONMENTAL_RI_REVERSE_EDGE_NEGATIVE_TEST=PASS
IMPLICIT_EVENT_CLASSIFICATION_DRIFT_FAILS_CLOSED=YES
COMMON_FENCE_DOMINATION_DRIFT_FAILS_CLOSED=YES
TERMINAL_CONFLICT_SUFFIX_DRIFT_FAILS_CLOSED=YES
UNIQUE_SUFFIX_GRAPH_DRIFT_FAILS_CLOSED=YES
STUDY_ROW_SERIALIZATION_DRIFT_FAILS_CLOSED=YES
```

## 12. Isolation, scope, and gate result

R10 preserves `READ COMMITTED`, D6 retry semantics, unknown post-consumption
outcomes, and the absence of an external exactly-once claim. Database waiting
grants no authority and creates no material revision. Field Beta positive
canonical reachability remains unproven and 002-E may not remediate it.

```text
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES
D6_RETRY_SEMANTICS_PRESERVED=YES
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO
WAIT_ON_DATABASE_UNIQUE_GRANTS_AUTHORITY=NO
TERMINAL_CONFLICT_GATE_CREATES_MATERIAL_REVISION=NO
FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0
002E_SCOPE_EXPANSION_FOUND=NO
GENERIC_UNIQUE_LOCK_SERVICE_CREATED=NO
GENERIC_DATABASE_LOCK_PLATFORM_CREATED=NO
PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
MAIN_CHANGED=NO
```

All specification-creation gates close. This document is a candidate only. It
does not authorize implementation, canonicalization, 002-R, D7, or C2. The next
gate is `BUILD002_002E_SPEC_R10_CANONICALIZATION_R1`.

```text
BUILD002_002E_SPEC_R10_STATUS=VERIFIED_CANDIDATE
FINAL_VERDICT=BUILD002_002E_SPEC_R10_VERIFIED_CANDIDATE
```
