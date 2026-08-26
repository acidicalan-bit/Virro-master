# BUILD002 002-E — protected-cycle exclusion specification R9

```text
BUILD=BUILD002
STAGE=002-E
REVISION=R9
AUTHORITY_TYPE=DERIVED_FROM_EXISTING_GLOBAL_BUILD002_SEQUENCE
RETROACTIVE_AUTHORIZATION=NO
BASE_MAIN_SHA=58e69b4d7d683412a0bfa60b5121be82d5426eaa
SUPERSEDES_CANONICAL_SPEC=NO
REPLACES_BLOCKED_CANDIDATE_R8=YES
```

Status: `PREIMPLEMENTATION_SPEC_CANDIDATE`. This document is specification and
proof authority only. It does not implement 002-E, change product code or
migrations, authorize implementation, canonicalize itself, begin 002-R, D7, or
C2. Its only next gate is `BUILD002_002E_SPEC_R9_CANONICALIZATION_R1`.

R9 starts at canonical commit
`58e69b4d7d683412a0bfa60b5121be82d5426eaa`, tree
`a7d384c5c9d32f7b6e5b6f2ae6b34d1fa9ab0884`. R1–R8 and the stopped first R9
attempt are evidence, not ancestors. The stopped attempt produced no spec,
commit, or branch.

```text
R1_IN_R9_ANCESTRY=NO
R2_IN_R9_ANCESTRY=NO
R3_IN_R9_ANCESTRY=NO
R4_IN_R9_ANCESTRY=NO
R5_IN_R9_ANCESTRY=NO
R6_IN_R9_ANCESTRY=NO
R7_IN_R9_ANCESTRY=NO
R8_IN_R9_ANCESTRY=NO
FAILED_R9_ATTEMPT_HAS_COMMIT=NO
FAILED_R9_ATTEMPT_HAS_SPEC=NO
```

## 1. Authority, claim, and preserved foundation

The exact reachable partition remains 27 material writers, 14 synchronized
wait participants, and 34 current one-way paths. The protected set `P` is the
first 41; `O` is the remaining 34. Environmental transactions are separate.

The parent STOP prohibits inconsistent lock order in a graph introduced by or
intersecting 002-E. It does not grant authority to certify unrelated database
transactions. For any finite number `N >= 2` of legal concurrent PostgreSQL
transactions, R9 proves that no wait-for cycle contains an operation in `P`.
It does not certify outside-only cycles.

```text
GLOBAL_REACHABLE_DML_PATHS_TOTAL=75
MATERIAL_WRITER_PATHS_TOTAL=27
SYNCHRONIZED_WAIT_PARTICIPANTS_TOTAL=14
PROVEN_ONE_WAY_WAIT_PATHS_TOTAL=34
DISJOINT_REACHABLE_DML_PATHS_TOTAL=0
PROTECTED_002E_OPERATION_TEMPLATES=41
GLOBAL_DATABASE_DEADLOCK_FREE=NOT_CLAIMED
002E_PROTECTED_CYCLE_FREE_REQUIRED=YES
PARENT_REQUIRES_GLOBAL_DATABASE_DEADLOCK_FREEDOM=NO
PARENT_REQUIRES_002E_INTERSECTING_DEADLOCK_FREEDOM=YES
```

The structurally pure current footprint is unchanged. R8's role-ordered overlay
is rejected. R9 adds database-owned concrete-set ordering and therefore has a
new overlay hash.

```text
PURE_BASE_LOCK_FOOTPRINT_MANIFEST_SHA256=cbd625f20925fd185b787683e9e2e1fe64938ce890092b1432438d405416e99a
PURE_BASE_CURRENT_FOOTPRINT=YES
PURE_BASE_CHANGED_BY_R9_RETRY=NO
PURE_BASE_FUTURE_FENCE_ENTRIES=0
R8_NORMATIVE_ROUTING_OVERLAY_HASH_CANONICAL_FOR_R9=NO
R9_NORMATIVE_ROUTING_OVERLAY_SHA256=4e77f7ae9e8aeee664dd9bf9639f8df52128fa2c87dd1e307dbe278115729ae2
SYMBOLIC_VARIABLES_TOTAL=448
UNREGISTERED_SYMBOLIC_VARIABLES=0
UNRESOLVED_SYMBOLIC_RESOURCE_IDENTITIES=0
RANKED_RESOURCE_IDENTITY_USES_SYMBOLIC_UNIFICATION=YES
```

## 2. Concrete-set acquisition protocol

Semantic roles describe use, never order. Each protected PostgreSQL function
first discovers all candidate fence identities, constructs exact typed JSONB
scopes, removes exact duplicates, and sorts the resulting set before executing
the first statement. Application code neither orders the set nor reimplements
JSONB comparison.

```text
FENCE_ORDER_KEY(F)=(fence_kind_rank(F.kind),canonical_scope_identity(F.scope))
CANONICAL_SCOPE_RUNTIME_TYPE=jsonb
CANONICAL_SCOPE_ORDER_AUTHORITY=POSTGRESQL17_JSONB_BTREE_ORDER
APPLICATION_REIMPLEMENTS_JSONB_ORDER=NO
COMPLETE_FENCE_SET_DISCOVERED_BEFORE_SORT=YES
EXACT_DUPLICATE_FENCE_IDENTITIES_DEDUPED=YES
FIRST_BOOTSTRAP_BEFORE_COMPLETE_SORT=NO
FENCE_SORT_TOTAL=YES
FENCE_SORT_DETERMINISTIC=YES
FENCE_SORT_RUNTIME_DATABASE_OWNED=YES
SEMANTIC_ROLE_CAN_DEFINE_ACQUISITION_ORDER=NO
FENCE_ORDER_DEPENDS_ON_SEMANTIC_ROLE=NO
```

The complete total `fence_kind_rank` is:

| Rank | Kind | Rank | Kind |
|---:|---|---:|---|
| 0 | PERSONAL_TENANT_OWNER_PRINCIPAL | 10 | SIGNAL_UNIVERSE |
| 1 | TENANT_AUTHORITY | 11 | READINESS_EVALUATION_UNIVERSE |
| 2 | MEMBERSHIP_AUTHORITY | 12 | READINESS_AUTHORITY_UNIVERSE |
| 3 | OUTCOME_TRANSACTION | 13 | DELEGABILITY_ADMISSION_SCOPE |
| 4 | ASSET_HEAD | 14 | TASKSPEC_FIELD_OUTCOME_UNIVERSE |
| 5 | SOURCE_ASSET_VERSION | 15 | INTENT_PATCH_UNIVERSE |
| 6 | TRANSACTION_REQUIREMENT_BINDING | 16 | EXECUTION_AUTHORITY_SCOPE |
| 7 | BLUEPRINT_FAMILY | 17 | MUTATION_LEASE_SCOPE |
| 8 | REQUIREMENT_PROFILE_FAMILY | 18 | EXECUTION_ATTEMPT_SCOPE |
| 9 | SIGNAL_REQUIREMENT_UNIVERSE |  |  |

For every sorted fence `F`, the same transaction executes exactly:

```text
INSERT ... ON CONFLICT DO NOTHING(F)
SELECT exact F FOR UPDATE
```

before beginning the next pair. It never bootstraps all keys as a batch before
locking rows.

```text
FENCE_BOOTSTRAP_PRIMITIVE=INSERT_ON_CONFLICT_DO_NOTHING_THEN_SELECT_FOR_UPDATE
FENCE_PRIMITIVE_PAIR_ATOMIC_IN_PLAN_ORDER=YES
FENCE_BOOTSTRAP_NOOP_UPDATE_USED=NO
BOOTSTRAP_TO_FENCE_ROW_PLAN_RELATION_ACCOUNTED=YES
```

After the fence phase, the function constructs and deduplicates the complete
set of explicit parent ResourceIds. It orders that set by:

```text
(parent_resource_family_rank,schema,table,key_column,typed_key_value)
```

UUID values use PostgreSQL 17 UUID B-tree order. The exact family precedence
derived from all 41 controlled plans is:

```text
asset_versions < assets < build002_delegability_admissions
< build002_delegation_readiness < build002_dependency_snapshots
< build002_execution_attempt_reservations < build002_execution_authorities
< build002_mutation_leases < build002_readiness_authority_commits
< field_outcomes < build002_signal_requirements < build002_signals
< outcome_blueprints < outcome_requirement_profiles
< outcome_transaction_requirement_bindings < outcome_transactions
< partial_intents < tenant_memberships < tenants < transaction_patches
```

```text
PARENT_ROW_ORDER_TOTAL=YES
PARENT_ROW_ORDER_DATABASE_SEMANTIC=YES
PARENT_ROW_ORDER_DEPENDS_ON_SEMANTIC_ROLE=NO
DUPLICATE_EXPLICIT_PARENT_RESOURCE_DEDUPED=YES
```

## 3. Same-kind and same-family audit

Exactly one protected plan has two same-kind fences and exactly one has two
distinct explicit parents in one family; both are W28
`SupabaseStateCommitRepository.create`.

| Operation | Surface | Kind/family | Roles | Concrete expressions | Old order | R9 order |
|---|---|---|---|---|---|---|
| W28 StateCommit.create | fence | SOURCE_ASSET_VERSION | new, previous | exact JSONB scopes containing `$newSourceVersionId`, nullable `$previousSourceVersionId` | input role | deduplicated JSONB B-tree set |
| W28 StateCommit.create | parent | public.asset_versions(id) | new, previous | typed UUID ResourceIds | input role | deduplicated UUID B-tree set |

For `v1 != v2` and `scope(v1) < scope(v2)`, both role assignments
`new=v1,previous=v2` and `new=v2,previous=v1` acquire `v1,v2`. The separate
role map survives sorting and later binds the correct mutation fields. If both
roles name `v1`, one fence pair and one parent lock are acquired.

```text
SAME_KIND_MULTI_FENCE_PLANS_TOTAL=1
SAME_KIND_MULTI_FENCE_PLANS_CANONICALLY_SORTED=1/1
ROLE_ORDERED_SAME_KIND_FENCE_PLANS=0
SAME_KIND_ROLE_PERMUTATION_INVARIANCE=YES
SAME_FAMILY_MULTI_PARENT_PLANS_TOTAL=1
SAME_FAMILY_PARENT_ROLE_ORDER_VIOLATIONS=0
W28_A_FENCE_ORDER=v1,v2
W28_B_FENCE_ORDER=v1,v2
W28_SWAPPED_ROLE_FENCE_ORDER_EQUAL=YES
W28_ROLE_BINDING_PRESERVED_AFTER_SORT=YES
SAME_KIND_EQUAL_IDENTITY_DEDUPED=YES
W28_SOURCE_VERSION_PARENT_ORDER_ROLE_INDEPENDENT=YES
W28_SWAPPED_ROLE_PARENT_ORDER_EQUAL=YES
SWAPPED_BINDING_TEST_CASES_TOTAL=2
SWAPPED_BINDING_TEST_CASES_PASS=2
ROLE_PERMUTATION_PROPERTY_TEST=PASS
RHO_SEMANTIC_ROLE_FIELDS=0
RHO_INPUT_ORDINAL_TIEBREAKERS=0
```

PostgreSQL 17.10 runtime probes used the exact bootstrap primitive and two
existing `asset_versions` rows. In both phases transaction B presented the
roles in reverse order while A retained both canonical locks. B blocked on the
same first resource, then completed after A committed. The alias variant
acquired one resource.

```text
W28_VARIANT_A_ORDER=canonical(v1,v2)
W28_VARIANT_B_ORDER=canonical(v1,v2)
W28_VARIANT_C_ORDER=v1
W28_SWAPPED_BINDING_BOOTSTRAP_RUNTIME_TEST=PASS
W28_SWAPPED_BINDING_BOOTSTRAP_DEADLOCKS=0
W28_SWAPPED_BINDING_PARENT_RUNTIME_TEST=PASS
W28_SWAPPED_BINDING_PARENT_DEADLOCKS=0
POSTGRESQL_RUNTIME_VERSION_NUM=170010
```

## 4. Protected boundary and rank

`B` is the canonical union of every resource a proposed protected operation may
hold or request and every same-identity conflicting lock exposed by reachable
outside or environmental behavior. Symbol names are normalized through the R8
MUST_EQUAL/MUST_DIFFER/MAY_EQUAL solver; lock mode is not part of identity.

The closed template domain has 187 canonical ResourceId shapes:

| Family | Count |
|---|---:|
| FENCE_BOOTSTRAP_KEY | 19 |
| FENCE_ROW | 19 |
| ROW | 30 |
| TABLE | 40 |
| UNIQUE/EXCLUSION | 79 |
| **Total** | **187** |

Every one of the 75 templates has a boundary projection, including an explicit
empty projection for nonboundary-only templates. Intermediary resources are
retained whenever they can carry a wait from one boundary resource to another.

```text
PROTECTED_BOUNDARY_RESOURCES_TOTAL=187
PROTECTED_BOUNDARY_RESOURCE_SET_COMPLETE=YES
BOUNDARY_PROJECTIONS_TOTAL=75
BOUNDARY_PROJECTIONS_COMPLETE=75/75
RUNTIME_WAIT_TO_BOUNDARY_MODEL_COMPLETE=YES
RUNTIME_002E_DEADLOCK_TO_BOUNDARY_CYCLE_COMPLETE=YES
NONBOUNDARY_ONLY_CYCLE_CERTIFIED_SAFE=NOT_CLAIMED
```

The role-independent well-founded rank is the following lexicographic tagged
union. All strings are schema/catalog identifiers and all typed values use the
corresponding PostgreSQL 17 B-tree comparator.

```text
PROTECTED_RESOURCE_RANK_SCHEMA=
  FENCE_BOOTSTRAP:
    (0,fence_kind_rank,jsonb_scope,0)
  FENCE_ROW:
    (0,fence_kind_rank,jsonb_scope,1)
  EXPLICIT_OR_ORDINARY_ROW:
    (1,parent_family_rank,schema,table,key_column,typed_key)
  TARGET_TABLE_OR_ROW:
    (2,target_family_rank,schema,table,resource_kind,typed_key)
  CONTROLLED_UNIQUE_OR_EXCLUSION:
    (3,schema,table,constraint_name,typed_conflict_key)
  CONTROLLED_FK_OR_RI:
    (4,parent_family_rank,schema,table,key_column,typed_key)
  CONTROLLED_TRIGGER_OR_NESTED:
    (5,source_function_rank,canonical_resource_identity)
```

For fences, `(kind,scope,0) < (kind,scope,1)` and for `scope1 < scope2`,
`(kind,scope1,1) < (kind,scope2,0)`. Therefore W28's two swapped bindings both
satisfy:

```text
rho(bootstrap(v1)) < rho(row(v1))
 < rho(bootstrap(v2)) < rho(row(v2))
```

```text
BOOTSTRAP_PRECEDES_OWN_FENCE_ROW=YES
FENCE_PAIR_SEQUENCE_STRICTLY_MONOTONIC=YES
W28_SWAPPED_BINDING_RHO_CYCLE=NO
W28_FENCE_RHO_MONOTONIC=YES
PROTECTED_RESOURCE_RANK_TOTAL_ON_BOUNDARY=YES
PROTECTED_RESOURCE_RANK_WELL_FOUNDED=YES
```

## 5. Implicit PostgreSQL resources

R9 does not derive authority from array order, source order, unique-index OID
order, or an undocumented RI order. Each implicit boundary event has exactly
one treatment:

| Treatment | Exact use |
|---|---|
| `ALREADY_PRELOCKED_SAME_RESOURCE` | FK parent row is the exact explicit `FOR UPDATE`/`FOR SHARE` ResourceId already held. |
| `POSTLOCK_REENTRANT` | Target or parent request is the same canonical row already locked; the later compatible/weaker request cannot wait. |
| `DOMINATED_BY_COMMON_CANONICAL_SERIALIZATION` | Equality sufficient for a reverse unique/FK wait also proves equality of an earlier canonical fence, so a competitor cannot reach the implicit suffix concurrently. No internal order is used in rho. |
| `STABLE_POSTGRESQL_ORDER_PROVEN` | PostgreSQL 17 fires same-event triggers by trigger name; the exact catalog manifest is drift-gated. This is used only for the four outside field-beta projections. |

No event remains `UNCONTROLLED`. Multiple UNIQUE checks are assigned no
invented internal sequence: same-constraint contention is dominated by the
earlier canonical fence, while distinct constraint ResourceIds cannot unify.
Constraint FK checks after an exact prelock are reentrant; remaining protected
RI suffixes are dominated by the common lineage fence. Table `ROW EXCLUSIVE`
locks are compatible throughout the reachable DML surface and do not carry a
wait edge.

```text
PROTECTED_CONSTRAINT_POSTLOCK_RANK_SAFE=YES
UNCONTROLLED_INTERNAL_ORDER_USED_AS_RHO_AUTHORITY=NO
IMPLICIT_BOUNDARY_RESOURCES_UNCONTROLLED=0
PROTECTED_BOUNDARY_RANK_MONOTONIC=41/41
PROTECTED_BOUNDARY_RANK_DESCENTS=0
```

The 41/41 universal checker expands each template over arbitrary symbolic
bindings, applies exact deduplication and PostgreSQL comparators, and checks
only satisfiable, conflict-carrying transitions. Same-resource later requests
must be reentrant; dominated suffixes must carry a proven common-fence
witness. It contains no A/B small-model assumption.

## 6. Outside boundary audit

Ranks below use `F` (field_outcomes), `T` (tenant), `A` (auth.users RI gate),
and `L` (compatible/terminal later row). `∅` is an empty boundary projection.
`none` means no hold→request edge capable of blocking a protected lock.

| ID | Operation | Boundary resources / acquisition sequence | Hold→request edges | Min..max | Descent | Return to P | Proof class |
|---|---|---|---|---|---|---|---|
| O01 | FieldBeta.createPolicy | `T` | none | T..T | no | no | SINGLE_BOUNDARY_SERIALIZATION_POINT |
| O02 | FieldBeta.createFeedback | `F→T→A→L(execution,candidate)` | F→T; A gate | F..A | no | no | RI_GATE_ORDER |
| O03 | FieldBeta.createRegressionCandidate | `F→T` | F→T | F..T | no | no | STRICT_BOUNDARY_RANK_INCREASE |
| O04 | FieldBeta.createGoldenCase | `F→T` | F→T | F..T | no | no | STRICT_BOUNDARY_RANK_INCREASE |
| O05 | FieldBeta.createEvaluationSample | `F→T→L(candidate)` | F→T | F..T | no | no | STRICT_BOUNDARY_RANK_INCREASE |
| O06 | FieldBeta.createEvaluationJudgment | `T` | none | T..T | no | no | SINGLE_BOUNDARY_SERIALIZATION_POINT |
| O07 | Project.update | compatible project target row | none | row..row | no | no | TARGET_ROW_ONLY |
| O08 | ExecutionRun.updateMetadata | compatible execution target | none | row..row | no | no | TARGET_ROW_ONLY |
| O09 | ImageEvidence.create | `T` | none | T..T | no | no | SINGLE_BOUNDARY_SERIALIZATION_POINT |
| O10 | CandidateAsset.markCommitted | compatible candidate target | none | row..row | no | no | TARGET_ROW_ONLY |
| O11 | PreservationRun.update | compatible target→candidate | none | row..row | no | no | TARGET_ROW_ONLY |
| O12 | PreservationEvidence.create | candidate→`T`→preservation; only T conflicts | none | T..T | no | no | SINGLE_BOUNDARY_SERIALIZATION_POINT |
| O13 | CandidatePreference.recordAcceptance | table→compatible candidate | none | table..row | no | no | TARGET_ROW_ONLY |
| O14 | Project.create | `T` | none | T..T | no | no | SINGLE_BOUNDARY_SERIALIZATION_POINT |
| O15 | PreservationStudy.createRating | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O16 | PreservationStudy.createPairwise | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O17 | PreservationStudy.createAcceptance | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O18 | PreservationStudy.ensureStudy | `∅` | none | n/a | no | no | NATURAL_KEY_ONLY |
| O19 | TenantCoreLineage.createProject | `T` | none | T..T | no | no | SINGLE_BOUNDARY_SERIALIZATION_POINT |
| O20 | IntentModelFailure.create | `∅` | none | n/a | no | no | TARGET_ROW_ONLY |
| O21 | IntentFeedback.create | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O22 | Benchmark.saveRun | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O23 | BlindEvaluation.importSet INSERT set | `∅` | none | n/a | no | no | NATURAL_KEY_ONLY |
| O24 | BlindEvaluation.importSet INSERT case | `∅` | none | n/a | no | no | NATURAL_KEY_ONLY |
| O25 | BlindEvaluation.importSet DELETE set | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O26 | BlindEvaluation.createSession | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O27 | BlindEvaluation.completeSession | `∅` | none | n/a | no | no | TARGET_ROW_ONLY |
| O28 | BlindEvaluation.createComparison | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O29 | BlindEvaluation.createJudgment | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O30 | BlindEvaluation.createHumanIntent | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O31 | BlindEvaluation.linkHumanIntentToComparison | `∅` | none | n/a | no | no | TARGET_ROW_ONLY |
| O32 | BlindEvaluation.createStepRating | `∅` | none | n/a | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |
| O33 | IntentRun.create | `∅` | none | n/a | no | no | TARGET_ROW_ONLY |
| O34 | PreservationStudy.lockIntentAndPresentation | compatible candidate rows only | none | row..row | no | no | NONBOUNDARY_INTERNAL_CYCLE_IRRELEVANT |

For O02–O05 a fresh PostgreSQL 17.10 catalog replay reproduced the exact
INSERT trigger-name order. `field_outcomes` precedes `tenants`; O02 then reaches
`auth.users`, `execution_runs`, and `candidate_assets`. The final two are
`FOR KEY SHARE` and compatible with every protected lock on those relations,
so they cannot return. Trigger-name or catalog drift fails closed.

```text
ONE_WAY_BOUNDARY_AUDIT=34/34
BOUNDARY_NONRETURNING_PATHS=34/34
PREVIOUSLY_PROVEN_BOUNDARY_PATHS=6/6
PREVIOUS_NP_BOUNDARY_PROOFS=28/28
TARGET_ROW_BOUNDARY_PROOFS=8/8
NEW_SYNCHRONIZED_WAIT_PARTICIPANTS=0
ALL_14_WAIT_PARTICIPANTS_FUTURE_ROUTABLE=YES
ALL_27_MATERIAL_WRITERS_FUTURE_ROUTABLE=YES
DIRECT_DML_ROUTING_REQUIRES_BUSINESS_SEMANTIC_CHANGE=NO
```

## 7. Natural keys and blind delete

The protected boundary contains 79 unique resources: 40 primary keys and 39
natural/idempotency unique resources. Opposite orders between different
constraints cannot unify. Same-constraint equality is either reentrant or
proves equality of an earlier canonical fence. Outside-only natural unique
resources do not return to B.

```text
BOUNDARY_NATURAL_KEY_RESOURCES_TOTAL=39
BOUNDARY_NATURAL_KEY_RESOURCES_COMPLETE=YES
BOUNDARY_NATURAL_KEY_REVERSE_ORDER=NO
```

Fresh PostgreSQL 17.10 catalog replay found exactly two FKs whose parent is
`blind_evaluation_sets(id)`:

| Child FK | Delete action | Boundary membership |
|---|---|---|
| blind_evaluation_cases(evaluation_set_id) | CASCADE | NONBOUNDARY |
| blind_evaluation_sessions(evaluation_set_id) | NO ACTION | NONBOUNDARY |

No protected operation touches the parent, either child relation, or their RI
row resources. The delete may expose an outside-only wait but cannot return to
P.

```text
BLIND_SET_DELETE_RI_CHILD_LOCK_SURFACE_COMPLETE=YES
BLIND_SET_DELETE_RI_CHILD_RELATIONS=2
BLIND_SET_DELETE_BOUNDARY_RETURN_PATH=NO
```

## 8. Environmental RI gate

Eight effective FKs reach `auth.users(id)` and expose 16 environmental parent
mutation classes (DELETE and referenced-key UPDATE per FK). PostgreSQL 17.10
runtime probes reproduced the reverse RI wait and the three-session schedule.

If a protected child obtains parent `FOR KEY SHARE` first, a conflicting parent
mutation blocks before it can acquire the downstream child state needed for a
reverse leg. If the parent mutation obtains its row lock first, the child
blocks before creating/updating referencing state. Multiple child tables do
not change this gate. `auth.users` is not a BUILD002 fence.

```text
ENVIRONMENTAL_PARENT_MUTATION_CLASSES_TOTAL=16
ENVIRONMENTAL_PARENT_MUTATION_CLASSES_ACCOUNTED=16
AUTH_USERS_REVERSE_RI_EDGE_POSSIBLE=YES
AUTH_USERS_MULTI_CHILD_CYCLE_POSSIBLE=NO
AUTH_USERS_THREE_SESSION_RI_PROBE=PASS
AUTH_USERS_RI_GATE_LEMMA_PROVEN=YES
AUTH_USERS_BOUNDARY_RANK_EXCEPTION_SAFE=YES
UNACCOUNTED_ENVIRONMENTAL_RI_WAIT_EDGES=0
```

## 9. Parametric theorem

**Theorem P-CYCLE-EXCLUSION.** For every finite `N >= 2` and every legal set of
`N` concurrent PostgreSQL transactions, no reachable wait-for cycle contains a
protected 002-E operation.

Proof. Project each wait edge of a supposed cycle containing P onto its exact
conflicting boundary ResourceId. Symbolic unification is conservative, so no
runtime equality is omitted. A protected transaction's conflict-carrying
projection strictly increases `rho`; exact repeated resources are nonblocking
reentrant requests. An implicit suffix classified dominated cannot be entered
concurrently by a reverse participant because equality needed for the reverse
edge also identifies an earlier held canonical fence. Every O projection is
strictly increasing, a single serialization point, compatible terminal, or
empty. The auth.users lemma terminates the only environmental exception before
the reverse child state can coexist. Locks persist to transaction end.

Traversing a finite cycle would therefore have to return to its starting
boundary ResourceId through strict increases, a terminal projection, or a
closed RI gate. Terminals and gates cannot return, and a strict well-founded
order cannot return to its start. Contradiction. The argument depends on no
bound on N and makes no claim about a cycle wholly inside the nonboundary
outside subgraph. ∎

```text
MULTI_INSTANCE_PROOF_MODEL=BOUNDARY_RANK_PARAMETRIC
PARAMETRIC_PROTECTED_CYCLE_THEOREM_PROVEN=YES
ARBITRARY_TRANSACTION_MULTIPLICITY_COVERED=YES
002E_PROTECTED_CYCLE_FREE_FOR_ARBITRARY_MULTIPLICITY=YES
GLOBAL_DATABASE_DEADLOCK_FREE=NOT_CLAIMED
```

## 10. Finite regression graph and negative controls

The current graph remains pure BASE. R9's graph includes the corrected overlay
metadata and was generated twice independently with byte-identical canonical
JSON. It remains regression evidence rather than the arbitrary-multiplicity
proof.

```text
PURE_CURRENT_WAIT_STATE_GRAPH_SHA256=d599bdaccd999de70e3a4cbd259c1f4d8d539a413bc7b38c4150a00c11a058ec
R8_PROPOSED_GRAPH_HASH_CANONICAL_FOR_R9=NO
R9_PROPOSED_WAIT_STATE_GRAPH_SHA256=e1dc51ced2b37fca52b6e74d5ebdb1e31feb44b8fa587ff1ce9fb91ce8322ce7
R9_PROPOSED_GRAPH_REPRODUCIBLE=YES
R9_PROPOSED_GRAPH_NODES=2312
R9_PROPOSED_WAIT_FOR_EDGES=161004
R9_PROPOSED_WAIT_FOR_SCC_GT1=0
FINITE_GRAPH_IS_PRIMARY_ARBITRARY_MULTIPLICITY_PROOF=NO
FINITE_GRAPH_IS_REGRESSION_EVIDENCE=YES
CURRENT_CANDIDATE_D3_CYCLE_CAPABLE=YES
PROPOSED_CANDIDATE_D3_CYCLE_CAPABLE=NO
```

The retry controls detected the old role-ordered four-resource rank cycle,
normalized both input permutations identically, and repeated the property for
parent rows. The five parametric controls detected a protected three-instance
cycle, accepted an outside-only X/Y/Z cycle as out of scope, rejected a
high-to-low boundary request, rejected the P/O/O/P cross-template cycle, and
made current Candidate/D3 fail while proposed Candidate/D3 passed.

```text
ROLE_ORDER_RANK_CYCLE_NEGATIVE_TEST=PASS
INPUT_ORDER_INVARIANCE_NEGATIVE_TEST=PASS
PARENT_ROLE_ORDER_NEGATIVE_TEST=PASS
PARAMETRIC_BOUNDARY_3_INSTANCE_CYCLE_TEST=PASS
OUTSIDE_ONLY_SCOPE_NEGATIVE_TEST=PASS
BOUNDARY_RANK_DESCENT_NEGATIVE_TEST=PASS
CROSS_TEMPLATE_PARAMETRIC_CYCLE_NEGATIVE_TEST=PASS
CANDIDATE_D3_BOUNDARY_THEOREM_CONTROL=PASS
R9_PARAMETRIC_NEGATIVE_TESTS=5/5_PASS

PURE_BASE_CONTAMINATION_NEGATIVE_TEST=PASS
SYMBOLIC_UNREGISTERED_VARIABLE_NEGATIVE_TEST=PASS
RESOURCE_IDENTITY_NORMALIZATION_NEGATIVE_TEST=PASS
EXPLICIT_PARENT_LOCK_NEGATIVE_TEST=PASS
BOOTSTRAP_OMISSION_NEGATIVE_TEST=PASS
SAME_TEMPLATE_INSTANCE_NEGATIVE_TEST=PASS
PLAN_ORDER_AS_WAIT_EDGE_NEGATIVE_TEST=PASS
ENVIRONMENTAL_RI_REVERSE_EDGE_NEGATIVE_TEST=PASS
```

## 11. Drift, scope, and authority firewalls

Future implementation verification regenerates the pure/equivalent footprint,
implemented overlay, exact comparator contracts, symbol registry, B, rho, 75
projections, implicit classifications, environmental lemmas, theorem inputs,
and finite graph. Any new same-kind role order, comparator, parent order,
trigger manifest, or surface fails closed.

```text
SAME_KIND_ORDER_DRIFT_FAILS_CLOSED=YES
CANONICAL_SCOPE_COMPARATOR_DRIFT_FAILS_CLOSED=YES
PARENT_RESOURCE_ORDER_DRIFT_FAILS_CLOSED=YES
BOUNDARY_RESOURCE_SURFACE_DRIFT_FAILS_CLOSED=YES
BOUNDARY_RANK_DRIFT_FAILS_CLOSED=YES
BOUNDARY_PROJECTION_DRIFT_FAILS_CLOSED=YES
IMPLEMENTATION_SURFACE_DRIFT_FAILS_CLOSED=YES

FENCE_IDENTITIES_TOTAL=19
NEW_R9_FENCE_IDENTITIES=0
MATERIAL_DEPENDENCY_CLASSES=17
CANONICAL_002E_ISOLATION_LEVEL=READ_COMMITTED
ORDER_RECONSTRUCTABLE_FROM_CANONICAL_DB_STATE=YES

WAIT_ONLY_FENCE_GRANTS_AUTHORITY=NO
WAIT_ONLY_OPERATION_CREATES_MATERIAL_REVISION=NO
PERMANENT_GLOBAL_SINGLE_WINNER_REQUIRED=NO
002E_DEFINES_RETRY_POLICY=NO
D6_RETRY_SEMANTICS_PRESERVED=YES
POST_CONSUMPTION_UNKNOWN_OUTCOME_PRESERVED=YES
002E_EXTERNAL_EXACTLY_ONCE_CLAIM=NO

FIELD_BETA_POSITIVE_CANONICAL_REACHABILITY=NOT_PROVEN
002E_MAY_REMEDIATE_FIELD_BETA_REACHABILITY=NO
GENERIC_DATABASE_LOCK_PLATFORM_CREATED=NO
002E_SCOPE_EXPANSION_FOUND=NO
```

The parent-traceable requirements remain exactly R01–R10. R03 now requires the
role-independent database-owned boundary rank and the interacting
outside/environmental proof; it adds no global deadlock-freedom objective.

```text
002E_REQUIREMENTS_TOTAL=10
002E_REQUIREMENTS_PARENT_TRACEABLE=10
002E_REQUIREMENTS_UNTRACEABLE=0

PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
MAIN_CHANGED=NO
002E_IMPLEMENTATION_AUTHORIZED=NO
NEXT_GATE=BUILD002_002E_SPEC_R9_CANONICALIZATION_R1
```

R9 stops after candidate creation.
