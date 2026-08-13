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
