# BUILD 002 Recommendation

## BUILD002_NAME

`Signal Sufficiency and Delegation Readiness`

## PROBLEM

BUILD 001 safely verifies and commits an outcome once a transaction, TaskSpec,
execution and evidence chain exists. It does not provide one authoritative
pre-execution decision that the available signal is sufficient to delegate.
Current `IntentContract` and TaskSpec `READY` states are useful but split,
partly interpretation-derived, and not a durable evidence-backed readiness
claim.

## WHY_NOW

The trust kernel is promoted and stable. Adding another authority or executor
abstraction before resolving signal sufficiency would create work that can
still be based on ambiguous or stale intent. A small readiness boundary is the
first missing invariant and directly controls buyer effort, rework, latency and
risk without claiming business value.

## INVARIANT

```text
No sufficient, qualified, current signal
  -> no DELEGATION_READY claim
  -> no delegation/execution request may be issued through the BUILD 002 path.
```

Readiness is a state, not a numeric confidence score. Every critical signal
must have compatible provenance and an unchanged dependency snapshot.

## IN_SCOPE

- A generic Signal Requirement definition with criticality and provenance rules.
- A Signal record bound to an intent/context subject and exact source/provenance.
- Deterministic Signal Qualification with contradiction and missing-signal rules.
- A Delegation Readiness record and state machine.
- Dependency/version/hash snapshot and stale invalidation for readiness.
- Tenant/resource authorization using existing AuthorityContext and Context Lens.
- A narrow server-mediated read/evaluate operation before execution.
- Audit evidence sufficient to explain every readiness decision.

## OUT_OF_SCOPE

No generic Work Contract replacement, TaskSpec rename, new authority subsystem,
executor registry, multi-executor orchestration, RAG/vector database,
knowledge graph, billing/payments, learning engine, causal optimizer,
marketplace, mobile app, universal SDK, UI redesign, F3-F9 changes, or BUILD
002 economic claims.

## DOMAIN_OBJECTS

- `SignalRequirement`: required signal id, subject, criticality, accepted
  provenance classes, qualification rule version, and invalidation dependencies.
- `Signal`: one observed/stated/derived value with source reference, provenance,
  captured-at time, subject binding, and content hash.
- `SignalQualification`: deterministic result per requirement, with compatible
  evidence references, status, reasons, and evaluator definition hash.
- `DelegationReadiness`: aggregate state, exact subject/context identity,
  requirement/qualification set, dependency snapshot, created-at/expiry, and
  invalidation reason when stale.

These are conceptual names for BUILD 002 design; this gate adds no schema.

## STATE_MACHINE

```text
NEEDS_CONTEXT
  -> INSUFFICIENT_SIGNAL
  -> READY_WITH_CONDITIONS
  -> READY

Any state -> HUMAN_REVIEW_REQUIRED
Any non-terminal state -> STALE when a material dependency changes
Any state -> BLOCKED_BY_POLICY on authorization/policy failure
```

`READY` requires every critical requirement to be qualified. `READY_WITH_CONDITIONS`
must list explicit non-critical conditions and must never be silently treated as
`READY`. `HUMAN_REVIEW_REQUIRED`, `STALE`, and `BLOCKED_BY_POLICY` are not
delegable states.

## AUTHORITY_BOUNDARY

Readiness may read only the tenant/resource context already authorized by
AuthorityContext and an immutable Context Lens. Context usefulness cannot
expand access. A readiness record grants no execution capability, no storage
write, no private-context access, and no canonical commit authority. Existing
ExecutionAuthority and current OWNER commit reauthorization remain mandatory.

## PERSISTENCE_IMPACT

One additive, tenant-owned persistence slice for requirements, signals,
qualifications, and readiness snapshots is expected. Every row must carry a
tenant root and subject identity, immutable content/dependency hashes, and
lineage to the relevant IntentContract or future Work Contract. Writes should
be server-mediated with RLS for reads and no direct client authority over
readiness status. No existing BUILD 001 migration is rewritten.

## API_IMPACT

Add a narrow authenticated operation to evaluate or retrieve readiness for a
specific authorized subject. The operation returns a typed readiness state and
explanatory reasons, never a capability-bearing object. Existing execution and
commit APIs remain unchanged and must reject calls that lack a separate valid
execution contract.

## UI_IMPACT

No redesign is required. A future UI may show missing requirements, conditions,
staleness, or review needs. It must not display a readiness score as authority
and must not offer an execute action for non-READY states.

## SECURITY_PROPERTIES

- Tenant and resource identity are server-derived and lineage-checked.
- Caller-supplied signals cannot upgrade provenance or readiness.
- Critical UNKNOWN, missing, contradictory, or stale signals fail closed.
- Readiness never grants executor capabilities or commit authority.
- Exact requirement/evaluator/dependency hashes prevent semantic drift.
- Historical readiness remains an audit record; it is not automatically current.
- Cross-tenant and foreign-subject references are rejected.

## FAIL_CLOSED_BEHAVIOR

Malformed input, missing requirement, incompatible provenance, contradiction,
unknown critical value, changed dependency, expired readiness, unauthorized
context, evaluator mismatch, or unavailable qualification returns a non-ready
state and no delegation operation. No fallback to numeric confidence or caller
assertion is allowed.

## MIGRATION_STRATEGY

Additive migration only after a BUILD 002 pre-implementation trust map. Start
with local deterministic persistence/tests, then apply to disposable staging,
then prove RLS and cross-tenant rejection remotely. No historical rows are
backfilled into readiness; unknown historical signal remains unknown.

## TEST_LANES

- Pure domain tests for provenance, contradiction, readiness transitions and
  stale invalidation.
- Authority/context tests proving lens subset and tenant isolation.
- API tests proving non-ready states cannot invoke execution.
- Property tests for permutation/order and dependency-hash determinism.
- Regression suite for F1-F9 and existing intent/spec/assurance tests.
- Native PostgreSQL/RLS tests for row ownership and server-mediated writes.
- Negative tests for caller-supplied status, provenance and callbacks.

## REMOTE_PROOF_REQUIRED

Remote staging must prove tenant RLS, foreign-subject rejection, readiness
staleness after dependency change, authenticated API behavior, and that a
non-READY result cannot reach an executor or commit RPC. No production target
or credential is required.

## STOP_CONDITIONS

Stop without repair if any test can promote missing/UNKNOWN/stale signal,
caller-controlled provenance, or numeric confidence into `READY`; if context
expands authority; if readiness invokes execution directly; if an existing
BUILD 001 invariant regresses; if RLS/remote behavior cannot be proven; or if
scope expands into generic Work Contract, Canon, RAG, executor marketplace,
learning, or economic optimization.

## DEPENDENCIES

Existing IntentContract/Compiler, TaskSpec hashes, AuthorityContext,
SpecLens, tenant repository scope, canonical hashing, existing assurance
result semantics, and current release governance. No dependency on a new
executor or retrieval service.

## EXPECTED_REUSABLE_COMPONENTS_FROM_BUILD001

`AuthorityContext`, `ExecutionAuthority` as a downstream boundary,
`MutationLease`, tenant-scoped factories/storage, canonical hashing and
immutable snapshots, exact evidence/provenance result semantics, F1/F3/F4
atomic commit and immutability, F5 scope controls, F6/F7 verifier/assurance
patterns, and F8/F9 lineage triggers.
