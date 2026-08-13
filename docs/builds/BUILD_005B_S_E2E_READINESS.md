# BUILD 005-B.S — E2E readiness evidence

## Result

`E2E_READINESS_GREEN` for the zero-provider boundary. This is not provider or
market evidence. `REAL_OPENAI_PROVIDER_CALLS = 0`.

The prior HTTP 500 was reproduced before project/transaction creation when
`IMAGE_EDIT_PROVIDER=openai` and `OPENAI_API_KEY` was absent. The exact path was
`createFieldBetaService()` → `createPreservationVerificationService()` →
`new OpenAIImageEditExecutor()`, whose constructor rejects the missing key.

`IMAGE_EDIT_PROVIDER=controlled` now selects an SDK-free deterministic executor.
The actual HTTP route against disposable Supabase returned 200 and created a
transaction, execution, one RAW, P1/P2/P3 preservation records, verification
PASS, and a field outcome. Invocation count was 1; cost remained null.

## Stabilization closure

The controlled executor requires both `IMAGE_EDIT_PROVIDER=controlled` and the
explicit server-side `FIELD_BETA_CONTROLLED_EXECUTOR=true`; it is rejected in
production and cannot be selected by request payload. It reports only
`controlled-fixture` / `controlled-field-beta-v0.1` provenance.

Fault seams are test-only (`NODE_ENV=test`) and cover transaction creation,
post-transaction, pre-RAW, post-RAW, post-verification and pre-field-outcome
boundaries. They are not exposed by the HTTP request contract.

Recovery is exercised from persisted `executionRunId` plus trusted
`internal-lab` authority after resetting application factories. A second fresh
context reuses the existing RAW, ladder and field outcome; no executor/provider
call or duplicate artifact is permitted. Corrupt context hashes and foreign or
missing authority fail closed.

## Matrices

| Readiness precondition | Result |
|---|---|
| Exact feature flag / valid payload / safe PNG | PASS |
| Provider geometry / controlled boundary | PASS |
| Supabase schema and persistence | PASS |
| Server-bound `internal-lab` authority | PASS |
| Blueprint, Task Spec, recovery context | PASS |

| Checkpoint | Durable | Safe retry | External repetition |
|---|---:|---:|---:|
| Transaction / Task Spec | yes | yes | no |
| Executor / RAW | yes | yes | no |
| Preservation / verification | yes | yes | no |
| Field outcome | yes | idempotent | no |

### Fault-injection closure

| Boundary | Durable state observed | Recovery / next action | Provider repetition | Canonical inconsistency |
|---|---|---|---|---|
| Before transaction | transaction NO; execution NO; RAW NO; verification NO; field outcome NO | retry the request | no prior executor result | NO |
| After transaction | transaction YES; execution NO; RAW NO; verification NO; field outcome NO | retry creates the missing execution checkpoint | no prior executor result | NO |
| After executor, before RAW | transaction YES; execution NO; RAW NO; verification NO; field outcome NO | retry is a new execution under current semantics; do not claim recovery of an undurable result | controlled executor may repeat; OpenAI guarantee not inferred | NO |
| After RAW persistence | transaction YES; execution YES; RAW YES; verification NO; field outcome NO | load `REDRIVABLE` context and continue downstream | no provider/executor repetition | NO |
| After verification PASS | transaction YES; execution YES; RAW YES; verification YES; field outcome NO | load `REDRIVABLE` context and project the field outcome | no provider/executor repetition | NO |
| Before field-outcome persistence | transaction YES; execution YES; RAW YES; verification YES; field outcome NO | repeat idempotent projection after integrity checks | no provider/executor repetition | NO |

The missing-key regression proves a pre-transaction failure leaves no
transaction and performs no provider call. Existing tests cover snapshot
corruption, tenant rejection, ladder cardinality, and recovery. Complete
stage evidence is captured by the bounded matrix tests. The next real
provider gate remains separately authorized and is not implied by this report.

Infrastructure: structured logging and sanitized error boundary are sufficient
for this internal gate; persistence, idempotency, recovery and provider
preflight are sufficient; auth/ownership is REQUIRED_NOW before public use;
migration control is REQUIRED_NOW; ORM, cache and queue/jobs remain DEFERRED.

Reconciliation inputs: TEST-001 no paid execution before synthetic proof;
TEST-002 independently test expensive boundaries; TEST-003 fault-inject
recovery-critical boundaries.

## Real-provider evidence reconciliation — 2026-08-12

This section is the current reconciled truth for the real-provider gate. It
does not authorize another provider call.

### Attempts

| Attempt | Durable result | Interpretation |
|---|---|---|
| Initial operator attempt | No attributable durable execution or HTTP response | Historical ambiguous attempt; not used as evidence |
| Final real HTTP attempt | Durable successful OpenAI execution below | Canonical real-provider evidence |

Connectivity to `https://api.openai.com/v1/models` returned HTTP 200 before the
final attempt. The final `/api/field-beta` request returned HTTP 200 in 36,044
ms and created the following durable records:

- transaction: `f5844216-aa90-41be-8553-5c814748a9d3`
- execution: `3b37261d-e977-47a7-8aa3-40972d8b7d45`
- field outcome: `0042b988-ea3a-4617-a60a-b9a1a7556a33`
- provider/model: `openai` / `gpt-image-2`
- provider latency: 20,782 ms
- requested/actual geometry: 1024×1024 / 1024×1024
- provider cost: `UNKNOWN` / `null`
- real provider invocation count for this gate: `1`

Durable readback proves exactly one `RAW_PROVIDER` and three preserved
candidates (P1, P2, P3), all linked to the same execution and raw candidate.
Machine verification is `PASSED`; the verification run is `PASSED`; tenant is
the trusted `internal-lab` tenant; no controlled-fixture provenance appears in
this execution.

### Machine and human status separation

Persisted Blueprint hash:
`c2dc397b1d5600141b61838ebfa737658825b679cd493cfc67b9b7ac363412d7`.

Persisted Task Spec hash (compiled, execution, verification and readback):
`93c706f06ffdcc07064ca61904697c0c59a2a6d95badde42920a33d9d1577d2b`.

Independent machine Same-Spec conformance is `PASSED`: the persisted Task
Spec identity and hashes agree, and the machine evidence covers the available
critical executable criteria. The persisted `field_outcome.same_spec_status`
is `BLOCKED` because the Blueprint also contains the critical
`HUMAN_ACCEPTED`/`HUMAN_REVIEW` criterion and no human evidence existed at
creation time. These are separate concepts; `same_spec_status` is currently a
historical aggregate projection and is not recomputed after feedback.

Canonical feedback readback for field outcome
`0042b988-ea3a-4617-a60a-b9a1a7556a33` returned no rows. Therefore:

`HUMAN_ACCEPTANCE_STATUS = NOT_RECORDED`.

No feedback was created or modified by this reconciliation.

### Recovery and idempotency

Fresh-context recovery using only execution ID plus trusted `internal-lab`
authority returned `REDRIVABLE`. A subsequent completion reused the durable
execution, RAW, ladder and outcome without another provider call or duplicate
artifact. No canonical commit was authorized by this gate.

### Semantic impact and reconciliation candidate

Current `sameSpecStatus` is `MACHINE_AND_HUMAN_AGGREGATE`, calculated in
`FieldBetaService` by `verifySameSpecExecution`; human feedback does not mutate
or recompute the historical field outcome row. In the current Build 005-B flow
this is informational: no StateCommit or canonical commit transition is
authorized. It is therefore recorded as:

`P1 — SAME_SPEC_HUMAN_ACCEPTANCE_SEMANTIC_DEBT`

Reconciliation candidate: `VERIFY-SEMANTICS-001` — keep Machine Verification,
Machine Same-Spec Conformance, Human Acceptance and Overall Outcome Acceptance
as separate states. `API_DELTA = NONE`; `DATA_MIGRATION_DELTA = NONE`.

### Current gate classification

`HUMAN_ACCEPTANCE_REQUIRED`: all technical real-provider evidence is durable
and valid, but genuine human acceptance has not been recorded in canonical
Field Beta feedback. This is not a provider failure and does not justify a
second OpenAI call.
