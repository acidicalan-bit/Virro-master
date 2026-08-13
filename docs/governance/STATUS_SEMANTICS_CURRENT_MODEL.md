# Status semantics current model

`VERIFY-SEMANTICS-001` is current: Machine Verification, Machine Same-Spec
Conformance, Human Acceptance, Outcome Acceptance and Canonical Commit
Eligibility are distinct dimensions.

| Dimension | Meaning | Storage | Authority |
|---|---|---|---|
| Machine Verification | The machine verification process produced valid evidence/results. | Persisted `field_outcomes.machine_verification_status` | Machine evidence and verifier |
| Machine Same-Spec | Machine evidence conforms to the immutable Task Spec's machine-verifiable criteria. | Derived read model from status, snapshots and binding | Server-side semantic projection |
| Human Acceptance | An authorized evaluator accepted/rejected the delivered outcome. | Durable `field_feedback` | Server-derived tenant/source/recorder checks |
| Outcome Acceptance | Policy composition of machine and human dimensions. | Derived | Blueprint policy + evidence + feedback |
| Commit Eligibility | Whether policy and server authority permit canonical mutation. | Derived; no Field Beta commit endpoint | `VERIFIED_HUMAN_ACCEPTED_ONLY`, proof, authority, stale-head checks |

The historical `same_spec_status` column is **LEGACY_ONLY**. Its values remain
unchanged for provenance. New authority uses `semanticStatus.machineSameSpecStatus`
and never treats `BLOCKED` as human rejection. A valid binding plus machine pass
projects to machine Same-Spec `PASSED`; missing binding is `INCOMPLETE`.

Field Beta has no canonical commit endpoint. `ELIGIBLE` is a policy projection,
not proof that a commit occurred. No Proof, No Commit remains unchanged.

## Semantic matrix

| Machine | Human | Outcome | Eligibility |
|---|---|---|---|
| PASS | PENDING | AWAITING_HUMAN | NO |
| PASS | ACCEPTED | ACCEPTED | YES when policy + authority hold |
| PASS | REJECTED | REJECTED | NO |
| FAIL | ACCEPTED | MACHINE_FAILED | NO |
| INCOMPLETE | any | INCOMPLETE | NO |

Foreign-tenant or client-recorded feedback projects to PENDING and cannot create
acceptance. Historical blocked values are not rewritten.
