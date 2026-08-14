# Status semantics current model

`VERIFY-SEMANTICS-001` is current: Machine Verification, Machine Same-Spec
Conformance, Human Acceptance, Outcome Acceptance and Canonical Commit
Eligibility are distinct dimensions.

| Dimension | Meaning | Storage | Authority |
|---|---|---|---|
| Machine Verification | The machine verification process produced valid evidence/results. | Persisted `field_outcomes.machine_verification_status` | Machine evidence and verifier |
| Machine Same-Spec | Every critical machine-verifiable Task Spec criterion has valid durable criterion evidence with exact bindings. | Derived read model from `verification_criterion_evidence` | Server-side semantic projection; aggregate statuses/hashes are insufficient |
| Human Acceptance | An authorized evaluator accepted/rejected the delivered outcome. | Durable `field_feedback` | Server-derived tenant/source/recorder checks |
| Outcome Acceptance | Policy composition of machine and human dimensions. | Derived | Blueprint policy + evidence + feedback |
| Commit Eligibility | Whether policy and server authority permit canonical mutation. | Derived; no Field Beta commit endpoint | `VERIFIED_HUMAN_ACCEPTED_ONLY`, proof, authority, stale-head checks |

The historical `same_spec_status` column is **LEGACY_ONLY**. Its values remain
unchanged for provenance and have no authority. New authority uses
`semanticStatus.machineSameSpecStatus`, derived only from the complete set of
durable `verification_criterion_evidence` rows. Aggregate verification PASS,
matching hashes, or a valid Task Spec binding cannot substitute for missing
criterion evidence. A missing, invalid, foreign, stale, or ambiguous receipt
projects to `INCOMPLETE`; a valid criterion FAIL projects to `FAILED`.

The exact historical BUILD 005-B FIELD_READY record therefore remains valid as
historical evidence while its v1.4 Machine Same-Spec projection is
`INCOMPLETE`; no receipts are backfilled retroactively.

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
