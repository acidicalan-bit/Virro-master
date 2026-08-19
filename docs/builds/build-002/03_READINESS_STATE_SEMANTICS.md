# Delegation Readiness State Semantics

## Assessment versus validity

`DelegationReadiness` is an immutable evaluation snapshot. Its assessment state
and current validity are separate dimensions:

- assessment state records what the evaluator decided at creation;
- validity is derived by comparing the stored dependency snapshot with the
  current subject/dependency state and expiry policy.

`STALE` is therefore a current-validity result, not an in-place rewrite of a
historical READY row. Historical snapshots remain auditable.

## Assessment states

| State | Meaning | Delegable |
| --- | --- | --- |
| `NEEDS_CONTEXT` | Required subject/context identity is absent or not yet authorized | No |
| `INSUFFICIENT_SIGNAL` | At least one critical requirement is missing, unknown, incompatible, contradictory, invalid or stale | No |
| `READY_WITH_CONDITIONS` | All critical requirements qualify, but explicit non-critical conditions remain | No; no silent promotion |
| `READY` | All critical requirements qualify, no blocking condition exists, and policy permits delegation | Yes, only if current |
| `HUMAN_REVIEW_REQUIRED` | A server-defined requirement requires a distinct pre-execution review | No |
| `BLOCKED_BY_POLICY` | Authorization, policy, capability or tenant rule blocks evaluation/delegation | No |

`HUMAN_REVIEW_REQUIRED` is not a synonym for missing signal. It is emitted only
when a requirement explicitly requires a review operation. BUILD 002 may initially
return this state without implementing a review-write workflow; it must not
reuse BUILD 001 post-execution Human Acceptance.

## Current validity overlays

The current evaluator returns `CURRENT`, `STALE`, `EXPIRED`, or `NOT_FOUND` for
an assessment lookup. `STALE` means any material dependency differs; `EXPIRED`
means the requirement-defined expiry has elapsed even if hashes match. A
historical READY is evidence of a past decision, never current permission by
itself.

## State transitions

These are evaluation outcomes, not a mutable linear lifecycle. A new evaluation
may produce any state allowed by the current inputs. A material dependency
change does not mutate old history; it makes the old snapshot non-current.
`READY_WITH_CONDITIONS` can become `READY` only through a new server evaluation
after explicit conditions are satisfied. No numeric readiness score exists.

## Delegation rule

`DELEGABLE_STATES = { READY }` and only when:

1. current validity is `CURRENT`;
2. exact requirement, signal, source, policy and subject hashes match;
3. the caller's current `ExecutionAuthority` is valid for the same tenant,
   project, asset, transaction, TaskSpec and mutation lease;
4. the execution reservation is created at the database linearization point.

Every other state produces zero executor/provider invocations and no execution
reservation.
