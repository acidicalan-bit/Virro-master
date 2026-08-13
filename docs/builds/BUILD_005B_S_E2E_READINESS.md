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

The missing-key regression proves a pre-transaction failure leaves no
transaction and performs no provider call. Existing tests cover snapshot
corruption, tenant rejection, ladder cardinality, and recovery. A complete
stage-by-stage fault-injection harness remains P1 follow-up.

Infrastructure: structured logging and sanitized error boundary are sufficient
for this internal gate; persistence, idempotency, recovery and provider
preflight are sufficient; auth/ownership is REQUIRED_NOW before public use;
migration control is REQUIRED_NOW; ORM, cache and queue/jobs remain DEFERRED.

Reconciliation inputs: TEST-001 no paid execution before synthetic proof;
TEST-002 independently test expensive boundaries; TEST-003 fault-inject
recovery-critical boundaries.
