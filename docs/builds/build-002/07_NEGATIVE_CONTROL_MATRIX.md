# BUILD 002 Negative Control Matrix

All rows below require zero executor/provider invocations and no execution
reservation unless explicitly marked as the positive control.

| Case | Expected result |
| --- | --- |
| No readiness snapshot | Deny `READINESS_NOT_FOUND` |
| `NEEDS_CONTEXT` | Deny; no side effect |
| `INSUFFICIENT_SIGNAL` | Deny; no side effect |
| `READY_WITH_CONDITIONS` | Deny; no implicit condition acceptance |
| `HUMAN_REVIEW_REQUIRED` | Deny until a separate server review operation exists |
| `STALE` or expired readiness | Deny after current dependency/expiry check |
| `BLOCKED_BY_POLICY` | Deny |
| Critical qualification `MISSING` or `UNKNOWN` | Deny |
| Incompatible provenance or invalid signal | Deny |
| Contradictory current signals | Deny; no silent winner |
| Requirement/qualification/dependency hash mismatch | Deny |
| Signal/source hash mismatch | Deny |
| Dependency changes after evaluation but before reservation | Lock/recompute detects mismatch; deny |
| Foreign readiness or subject | Tenant/subject FK and authority check deny |
| Caller-created fake `READY` or caller provenance | Schema/server-owned field rejection; deny |
| Readiness from another transaction/TaskSpec | Exact subject/spec binding deny |
| Missing current `ExecutionAuthority` | Deny even with current READY |
| Revoked OWNER at later commit | Existing F4 commit RPC denies and rolls back canonical writes |
| Valid READY, unchanged exact snapshot, valid authority | **Positive control:** one reservation and executor invocation may occur |

The test harness must count invocations at the executor port, not infer them
from transaction status. It must also inspect the database for absence of a
reservation/run/candidate on every denial.

## Existing BUILD 001 controls retained

F1 atomic rollback, F2 legacy route isolation, F3 StateCommit immutability, F4
current OWNER linearization, F5 tenant scope, F6 exact verification, F7
provenance/authority, F8 ownership triggers and F9 PreservationRun lifecycle
remain separate regression lanes. BUILD 002 may not weaken their SQL or route
contracts.
