# BUILD002_C1 Canonical Objective

```text
AUTHORITY_TYPE=PROSPECTIVE_GOVERNANCE_REPAIR
HISTORICAL_UMBRELLA_AUTHORITY=ABSENT
RETROACTIVE_AUTHORIZATION=NO
EFFECTIVE_FROM=FIRST_COMMIT_CONTAINING_THIS_SPEC
```

## 1. Purpose

This document establishes the prospective umbrella authority for
`BUILD002_C1`. It defines the minimum coherent C1 objective, terminal criteria,
and terminal boundary that are traceable to pre-existing BUILD002 authority.

This document is governance authority only. It does not certify the current
product, authorize execution, change runtime behavior, or establish a D6.

## 2. Historical authority status

The historical record remains:

```text
HISTORICAL_C1_OBJECTIVE_AUTHORITY=NOT_PROVEN
HISTORICAL_C1_TERMINAL_CRITERIA=NOT_PROVEN
HISTORICAL_C1_COMPLETENESS_AT_D5=NOT_PROVEN
HISTORICAL_D6_REQUIREMENT=NOT_PROVEN
HISTORICAL_D6_SPEC=ABSENT
PROSPECTIVE_C1_AUTHORITY=YES
```

`PROSPECTIVE_C1_AUTHORITY=YES` becomes effective only from the first commit
containing this specification. It does not alter any historical verdict.

## 3. Parent authorities and provenance

### Source A — BUILD 002 Recommendation

```text
PATH=docs/architecture/vnext/06_BUILD002_RECOMMENDATION.md
SOURCE_COMMIT=a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e
SHA256=12f56ddf0f6532f91b607352409e9ca7c23a6a545c40783217b9e5c9c8cd5bd2
KNOWN_RELATION=ANCESTOR_OF_BASE_NOT_SUPERSEDED
```

Relevant authority clauses are its `INVARIANT`, `DOMAIN_OBJECTS`,
`AUTHORITY_BOUNDARY`, `PERSISTENCE_IMPACT`, `SECURITY_PROPERTIES`, and
`FAIL_CLOSED_BEHAVIOR` sections. They require a server-owned, evidence-backed,
current readiness decision; prevent readiness from granting execution or
commit authority; and fail closed without a delegation operation.

### Source B — BUILD 002 Implementation Sequence

```text
PATH=docs/builds/build-002/09_IMPLEMENTATION_SEQUENCE.md
SOURCE_COMMIT=2057ffeb4b63e878379da2e25c2252be2707a125
SHA256=75fb295746f06d14ed290a4940fc22db648411cd0fa656af48311723adfc2869
KNOWN_RELATION=ANCESTOR_OF_BASE_NOT_SUPERSEDED
```

Relevant authority clauses are `002-C Evaluation service`, `002-D Choke-point
integration and binding`, `002-E Stale/concurrency hardening`, and `002-R
Remote verification`. They distinguish readiness evaluation, the pre-provider
reservation/binding gate, later transactional concurrency hardening, and later
remote proof.

No D0-D5 stage-local source defines any objective or terminal criterion in this
document.

## 4. Prospective BUILD002_C1 objective

BUILD002_C1 prospectively establishes the server-owned boundary that produces
an immutable, non-capability-bearing delegation-readiness decision and permits
a readiness-execution reservation only when that decision is exact and current
and a separate valid `ExecutionAuthority` is present. The reservation binds the
readiness decision to the execution lineage before any provider side effect.
C1 ends at that reservation and binding boundary; it does not invoke an
executor or provider and does not commit an execution result or product state.

### Objective clause traceability

| Clause | Objective clause | Parent support | Authority mode |
| --- | --- | --- | --- |
| OBJ-01 | Readiness derivation is server-owned, persisted as an immutable snapshot, and is not capability-bearing. | Source A: `DOMAIN_OBJECTS`, `AUTHORITY_BOUNDARY`, `PERSISTENCE_IMPACT`; Source B: `002-C` invariant and STOP condition. | `DIRECT_PARENT_REQUIREMENT` |
| OBJ-02 | A readiness-execution reservation requires current exact `READY` and a separate valid `ExecutionAuthority`. | Source A: `INVARIANT`, `AUTHORITY_BOUNDARY`, `FAIL_CLOSED_BEHAVIOR`; Source B: `002-D` invariant. | `DIRECT_PARENT_REQUIREMENT` |
| OBJ-03 | The reservation binds readiness to the execution lineage before any provider side effect. | Source B: `002-D` invariant, scope, and exact downstream binding tests. | `DIRECT_PARENT_REQUIREMENT` |
| OBJ-04 | C1 stops at the reservation/binding boundary and does not invoke a provider or commit execution consequence. | Source A: `AUTHORITY_BOUNDARY`, `API_IMPACT`, `STOP_CONDITIONS`; Source B: `002-C` no-executor scope and `002-D` pre-provider boundary. | `PROSPECTIVE_BOUNDARY_DERIVATION` |

```text
OBJECTIVE_ALL_CLAUSES_SOURCE_TRACEABLE=YES
```

The candidate phrase "fresh pre-execution reservation/lease authority" is
narrowed here to "current exact readiness-execution reservation." Source B
names a reservation but does not establish a lease as the canonical global
term. Transaction-bound freshness and serialization belong to `002-E`, not to
this C1 boundary.

## 5. Parent sequence mapping

No pre-existing parent source directly maps the identifier `BUILD002_C1` to a
specific BUILD002 sequence unit.

```text
C1_PARENT_SEQUENCE_HISTORICAL_MAPPING=NOT_PROVEN
C1_PARENT_SEQUENCE_HISTORICAL_MAPPING_SOURCE=NOT_FOUND_IN_PRE_EXISTING_PARENT_AUTHORITY
```

Prospectively, C1 maps to the non-transport readiness-authority boundary of
`002-C` and the pre-provider reservation and execution-lineage binding boundary
of `002-D`. This mapping does not absorb all work assigned globally to either
unit and does not absorb `002-E` or `002-R`.

```text
C1_PARENT_SEQUENCE_PROSPECTIVE_MAPPING=002-C_READINESS_AUTHORITY_TO_002-D_PRE_PROVIDER_RESERVATION_AND_BINDING
AUTHORITY_MODE=PROSPECTIVE_MAPPING
HISTORICALLY_PROVEN=NO
```

## 6. Terminal criteria

C1 is conformant to this prospective authority only when every criterion below
is proven by a later current-baseline certification. This specification does
not perform that certification.

### C1-TC-01 — Server-owned readiness authority

The server deterministically derives qualification and readiness status and
persists immutable qualification, dependency, and readiness evidence bound to
the exact tenant, subject, context, provenance, requirements, evaluator, and
dependency identities required by the decision. The returned readiness record
is not capability-bearing.

```text
PARENT_SOURCE=SOURCE_A_AND_SOURCE_B
PARENT_SOURCE_CLAUSE=SOURCE_A_DOMAIN_OBJECTS_PERSISTENCE_IMPACT_SECURITY_PROPERTIES;SOURCE_B_002-C_INVARIANT_AND_STOP
WHY_REQUIRED_FOR_C1_BOUNDARY=THE_BOUNDARY_REQUIRES_AN_AUTHORITATIVE_NON_CAPABILITY_READINESS_INPUT
AUTHORITY_MODE=DIRECT_PARENT_REQUIREMENT
```

### C1-TC-02 — Fail-closed exact readiness

Only exact `READY` is eligible. Every critical requirement must be qualified,
and missing, unknown, contradictory, expired, stale, unauthorized, or
hash-mismatched material must remain non-delegable. Caller-supplied status or
provenance cannot upgrade readiness.

```text
PARENT_SOURCE=SOURCE_A_AND_SOURCE_B
PARENT_SOURCE_CLAUSE=SOURCE_A_INVARIANT_STATE_MACHINE_SECURITY_PROPERTIES_FAIL_CLOSED_BEHAVIOR;SOURCE_B_002-A_STOP_AND_002-D_INVARIANT
WHY_REQUIRED_FOR_C1_BOUNDARY=THE_PARENT_INVARIANT_FORBIDS_DELEGATION_FROM_ANY_NON_CURRENT_NON_EXACT_READY_STATE
AUTHORITY_MODE=DIRECT_PARENT_REQUIREMENT
```

### C1-TC-03 — Separate execution authority

Readiness grants no executor capability, storage authority, private-context
access, or commit authority. A separate valid `ExecutionAuthority` remains
mandatory and readiness never replaces it.

```text
PARENT_SOURCE=SOURCE_A_AND_SOURCE_B
PARENT_SOURCE_CLAUSE=SOURCE_A_AUTHORITY_BOUNDARY_API_IMPACT;SOURCE_B_002-D_INVARIANT_AND_STOP
WHY_REQUIRED_FOR_C1_BOUNDARY=THE_PARENT_BOUNDARY_EXPLICITLY_SEPARATES_READINESS_FROM_EXECUTION_AUTHORITY
AUTHORITY_MODE=DIRECT_PARENT_REQUIREMENT
```

### C1-TC-04 — Current exact readiness-execution reservation

The supported BUILD002 path has one shared server gate at which current exact
`READY` and a separate valid `ExecutionAuthority` are both required before a
readiness-execution reservation can be created. The reservation must exist
before any provider side effect.

```text
PARENT_SOURCE=SOURCE_B
PARENT_SOURCE_CLAUSE=SOURCE_B_002-D_INVARIANT_AND_SCOPE
WHY_REQUIRED_FOR_C1_BOUNDARY=THE_RESERVATION_IS_THE_PARENT_DEFINED_PRE_PROVIDER_CHOKE_POINT
AUTHORITY_MODE=DIRECT_PARENT_REQUIREMENT
```

### C1-TC-05 — Execution-lineage binding

The reservation additively binds the exact readiness decision and separate
execution authority to the execution lineage used downstream. No supported
BUILD002 executor path may bypass that binding.

```text
PARENT_SOURCE=SOURCE_B
PARENT_SOURCE_CLAUSE=SOURCE_B_002-D_SCOPE_TESTS_AND_STOP
WHY_REQUIRED_FOR_C1_BOUNDARY=THE_PARENT_SEQUENCE_REQUIRES_EXACT_DOWNSTREAM_BINDING_AND_FORBIDS_GATE_BYPASS
AUTHORITY_MODE=DIRECT_PARENT_REQUIREMENT
```

### C1-TC-06 — Zero consequence on rejection

Non-`READY`, stale, mismatched, unauthorized, malformed, or otherwise invalid
material must fail closed without creating the reservation, invoking an
executor or provider, or reaching a commit operation through the C1 boundary.

```text
PARENT_SOURCE=SOURCE_A_AND_SOURCE_B
PARENT_SOURCE_CLAUSE=SOURCE_A_INVARIANT_FAIL_CLOSED_BEHAVIOR_TEST_LANES;SOURCE_B_002-D_TESTS_AND_STOP
WHY_REQUIRED_FOR_C1_BOUNDARY=REJECTION_MUST_PRESERVE_THE_PARENT_NO_DELEGATION_AND_ZERO_INVOCATION_INVARIANT
AUTHORITY_MODE=DIRECT_PARENT_REQUIREMENT
```

### Criterion provenance table

| CRITERION_ID | CRITERION_TEXT | PARENT_SOURCE | PARENT_SOURCE_COMMIT | PARENT_CLAUSE | AUTHORITY_MODE | STAGE_LOCAL_SOURCE_USED_TO_DEFINE_CRITERION |
| --- | --- | --- | --- | --- | --- | --- |
| C1-TC-01 | Server-owned immutable non-capability readiness authority. | Source A; Source B | `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`; `2057ffeb4b63e878379da2e25c2252be2707a125` | A: `DOMAIN_OBJECTS`, `PERSISTENCE_IMPACT`, `SECURITY_PROPERTIES`; B: `002-C` invariant/STOP | `DIRECT_PARENT_REQUIREMENT` | `NO` |
| C1-TC-02 | Exact current readiness fails closed. | Source A; Source B | `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`; `2057ffeb4b63e878379da2e25c2252be2707a125` | A: `INVARIANT`, `STATE_MACHINE`, `SECURITY_PROPERTIES`, `FAIL_CLOSED_BEHAVIOR`; B: `002-A` STOP, `002-D` invariant | `DIRECT_PARENT_REQUIREMENT` | `NO` |
| C1-TC-03 | Execution authority remains separate and mandatory. | Source A; Source B | `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`; `2057ffeb4b63e878379da2e25c2252be2707a125` | A: `AUTHORITY_BOUNDARY`, `API_IMPACT`; B: `002-D` invariant/STOP | `DIRECT_PARENT_REQUIREMENT` | `NO` |
| C1-TC-04 | A shared gate creates a current exact readiness-execution reservation before provider effects. | Source B | `2057ffeb4b63e878379da2e25c2252be2707a125` | B: `002-D` invariant/scope | `DIRECT_PARENT_REQUIREMENT` | `NO` |
| C1-TC-05 | The reservation binds readiness and execution authority to execution lineage without bypass. | Source B | `2057ffeb4b63e878379da2e25c2252be2707a125` | B: `002-D` scope/tests/STOP | `DIRECT_PARENT_REQUIREMENT` | `NO` |
| C1-TC-06 | Rejection produces zero reservation, invocation, provider effect, or commit consequence through C1. | Source A; Source B | `a96daee76b4ff47a7b3dabcb3d9c67a9f81fa82e`; `2057ffeb4b63e878379da2e25c2252be2707a125` | A: `INVARIANT`, `FAIL_CLOSED_BEHAVIOR`, `TEST_LANES`; B: `002-D` tests/STOP | `DIRECT_PARENT_REQUIREMENT` | `NO` |

```text
C1_TERMINAL_CRITERIA_TOTAL=6
C1_TERMINAL_CRITERIA_DIRECT_PARENT_REQUIREMENT=6
C1_TERMINAL_CRITERIA_PROSPECTIVE_BOUNDARY_DERIVATION=0
C1_TERMINAL_CRITERIA_STAGE_RETROFIT=0
C1_TERMINAL_CRITERIA_UNTRACEABLE=0
```

### Candidate property-family disposition

| Candidate property family | SOURCE_TRACEABLE | C1 disposition |
| --- | --- | --- |
| `SERVER_OWNED_READINESS_AUTHORITY` | `YES` | C1-TC-01 |
| `EXACT_AND_CURRENT_READY_REQUIRED` | `YES` | C1-TC-02 and C1-TC-04 |
| `CURRENTNESS_REVALIDATION` | `YES` | Currentness must be checked at the C1 reservation gate; transaction-bound race serialization remains outside C1 under `002-E`. |
| `EXECUTION_AUTHORITY_BINDING` | `YES` | C1-TC-03 and C1-TC-05 |
| `TASKSPEC_OR_OPERATION_BINDING` | `YES` only as execution-lineage binding | C1-TC-05; a TaskSpec-specific mechanism is not prescribed by this authority. |
| `PRE_EXECUTION_RESERVATION_OR_LEASE` | `YES` only as reservation | C1-TC-04; no lease mechanism is prescribed. |
| `CONSEQUENCE_TIME_REVALIDATION` | `NO` for C1 | Source B assigns transaction-bound revalidation and READY-to-execution race handling to `002-E`. |
| `STALE_OR_MISMATCHED_AUTHORITY_REJECTION` | `YES` | C1-TC-02 and C1-TC-06 |
| `ZERO_CONSEQUENCE_ON_REJECTION` | `YES` | C1-TC-06 |

## 7. Explicit exclusions

C1 ends after the authoritative readiness-execution reservation is bound to
execution lineage and before execution consequence. The following are outside
this prospective C1 boundary:

| EXCLUSION | SOURCE_REASON |
| --- | --- |
| `ACTUAL_PROVIDER_SIDE_EFFECT` | Source B `002-D` places the reservation before any provider side effect; Source A forbids readiness from invoking execution directly. |
| `EXECUTION_START` | Source B `002-D` requires the gate/reservation and downstream binding, not execution start; Source A preserves separate execution authority. |
| `PROVIDER_RESULT_COMMIT` | Source A denies readiness canonical commit authority; this occurs after the pre-provider C1 boundary. |
| `STATE_COMMIT` | Source A preserves existing current OWNER commit reauthorization and denies readiness commit authority. |
| `POST_EXECUTION_EFFECT_PROCESSING` | It occurs after provider execution and therefore after the C1 terminal boundary. |
| `AUTHENTICATED_EVALUATION_OPERATIONS` | Source B assigns transport operations to the wider `002-C` scope; they are not necessary to define this narrow C1 authority boundary. |
| `REMOTE_ENVIRONMENT_VERIFICATION` | Source B assigns deployed remote proof to the separate `002-R` unit. |
| `BROADER_FUTURE_HARDENING` | Source B assigns locks, transaction-bound revalidation, and multi-session race proof to `002-E`; Source A rejects platform expansion. |

```text
C1_EXCLUSIONS_TOTAL=8
```

## 8. Non-retroactivity

The creation of this specification does not prove that D0-D5 were historically
authorized by an umbrella C1 terminal contract.

Historical C1 completeness at D5 remains `NOT_PROVEN` because no canonical
umbrella authority existed at that time.

Historical D0-D5 evidence may be used in a later current-baseline conformance
certification only when provenance, code identity, migration identity,
environment requirements, and evidence portability remain valid.

Such use proves current conformance to the prospective specification. It does
not retroactively prove historical C1 completion.

## 9. Evidence portability rules

This document defines portability checks but makes no finding that any prior
evidence is portable. A later certification must evaluate every applicable
check independently:

1. `SOURCE_PRODUCT_SHA_OR_TREE_BINDING`: prove the exact product commit/tree to
   which the evidence applies and its relationship to the certification base.
2. `RELEVANT_FILE_IDENTITY`: prove byte or Git-blob identity for every product,
   test, fixture, workflow, and evidence file material to the claimed result.
3. `MIGRATION_FILENAME_SET`: prove the ordered migration filename set is
   identical or explain, authorize, and reverify any difference.
4. `MIGRATION_CONTENT_IDENTITY_IF_REQUIRED`: prove content identity for all
   migrations material to schema, RLS, functions, triggers, and test setup.
5. `TEST_COMMAND_BINDING`: prove the historical command, arguments, fixtures,
   dependencies, and asserted result are known and still applicable.
6. `ENVIRONMENT_BINDING`: prove every material runtime, service, credential
   class, configuration, and isolation property matches the evidence claim.
7. `DATABASE_VERSION_BINDING`: prove the PostgreSQL engine, extensions, and
   relevant settings are compatible with the historical result.
8. `PROVENANCE_BINDING`: prove evidence authorship, immutable result identity,
   source ancestry, and chain of custody.
9. `NO_SUPERSEDING_MUTATION`: prove no later mutation invalidated the tested
   artifact, authority boundary, or environmental premise.

Failure to prove any required binding makes the affected historical evidence
non-portable. It does not by itself prove product nonconformance; the later
certification must obtain current evidence.

## 10. Current-baseline certification rules

A separate, explicitly authorized execution must determine current conformance.
It must:

1. freeze the prospective objective and criteria before inspecting D0-D5;
2. evaluate C1-TC-01 through C1-TC-06 individually;
3. bind each finding to current product, migration, configuration, and
   environment identities;
4. reuse historical evidence only after the portability rules in section 9
   pass for that evidence;
5. classify each criterion as `SATISFIED`, `UNSATISFIED`, or `NOT_PROVEN`;
6. preserve `HISTORICAL_C1_COMPLETENESS_AT_D5=NOT_PROVEN`; and
7. avoid naming or authorizing additional implementation unless an explicit
   prospective criterion is unsatisfied and a later authority step approves
   the work.

```text
CURRENT_BASELINE_CONFORMS_TO_PROSPECTIVE_C1_AUTHORITY=NOT_EVALUATED
HISTORICAL_PRODUCT_EVIDENCE_STATUS=PASS_AT_VERIFIED_UNCHANGED_D5_PRODUCT_BASELINE
PRODUCT_CHECKS_EXECUTED_BY_THIS_SPEC=NO
```

## 11. Future-scope firewall

Prior closeout discoveries are classified without retrofitting C1:

| ITEM | PARENT_AUTHORITY_REQUIRES_INSIDE_C1 | DISPOSITION |
| --- | --- | --- |
| `PRE_PROVIDER_SERIALIZED_RECHECK_AND_EXECUTION_START` | `NO_AS_STATED` | C1 requires current exact readiness at reservation only. Transaction-bound serialization and execution start remain `NEW_SCOPE_OR_FUTURE_BUILD_CANDIDATE` under `002-E` or a later execution stage. |
| `EXECUTION_LINEAGE_BINDING` | `YES` | Source B `002-D` explicitly requires additive binding to execution lineage; included as C1-TC-05. |
| `STALENESS_AND_CONCURRENCY_HARDENING` | `NO` | Preserved as `NEW_SCOPE_OR_FUTURE_BUILD_CANDIDATE`; Source B assigns it to `002-E`. |
| `REMOTE_VERIFICATION` | `NO` | Preserved as `NEW_SCOPE_OR_FUTURE_BUILD_CANDIDATE`; Source B assigns it to `002-R`. |
| `AUTHENTICATED_EVALUATION_OPERATIONS` | `NO` | Preserved as `NEW_SCOPE_OR_FUTURE_BUILD_CANDIDATE`; it is wider `002-C` transport scope, not necessary to close C1. |

No best practice, stage-local implementation detail, or post-D5 discovery may
become a C1 criterion without a new explicit authority amendment traceable to
the parent BUILD002 boundary.

## 12. D6 semantics

```text
D6_EXISTENCE=NOT_ESTABLISHED_BY_THIS_SPEC
D6_REQUIRED=NOT_DETERMINED_BY_AUTHORITY_REPAIR
D6_SPEC_CREATED=NO
D6_IMPLEMENTATION_AUTHORIZED=NO
```

A later current-baseline conformance audit decides whether any canonical C1
criterion remains unsatisfied. Only an explicit unsatisfied C1 criterion can
justify considering additional C1 implementation work. Even then, that work is
not automatically named D6 and requires a separate deliberate authority step.
