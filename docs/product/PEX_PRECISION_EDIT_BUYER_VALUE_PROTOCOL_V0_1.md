# Precision Edit Buyer Value Experiment Protocol v0.1

**Status:** `PREREGISTERED` · `NOT_STARTED`  
**Experiment ID:** `PEX-PRECISION-EDIT-BUYER-VALUE-001`  
**Protocol version:** `0.1`  
**Frozen baseline:** `main`/`origin/main` at `02812c228d3860ebf34292690e0d7353359a8f8e`  
**PROJECT_SPEC:** `1.4.0`  
**Price:** `MXN $500` per primary opportunity

This is a document-only preregistration. It does not recruit participants,
collect payment, execute Outcomes, call providers, or change the application.

## 1. Truth boundaries

### Product truth

The product hypothesis is that a buyer purchases back time, attention, and
execution risk through a bounded digital Outcome. Marketplace demand,
universal category demand, discovery, cross-sell, and public scale remain
unvalidated.

### System truth

The frozen system is an authenticated, internal Field Beta for Precision Edit.
It uses a controlled provider and private delivery. It has no public
marketplace, payment integration, public API, public Storage exposure, seller
system, queue, or public canonical-commit surface. Field Beta acceptance is
evidence for learning and is not a canonical commit.

### Experimental truth

The statements below are preregistered hypotheses and measurement rules. No
participant data exists yet, and no result is implied by the protocol.

## 2. Hypothesis and claim boundary

For a buyer with a real, near-term task, showing a concrete Precision Edit
offer at MXN $500 before execution will produce real payment and an accepted
Outcome that reduces active buyer effort and/or rework relative to the
buyer's realistic alternative.

The maximum supported claim is:

`INITIAL_BUYER_VALUE_EVIDENCE_FOR_CONTROLLED_PRECISION_EDIT`

This experiment does **not** establish marketplace demand, universal category
demand, discovery, cross-sell, public scale, or demand for another Outcome
class.

## 3. Buyer and task qualification

Eligible buyers are real potential buyers: small-business operators, creators
or marketers, time-pressured designers/developers, or nontechnical
professionals who need a finished digital asset.

Every primary participant must satisfy:

- `REAL_TASK = YES`;
- `CURRENT_OR_NEAR_TERM_NEED = YES`;
- `ABILITY_TO_CHOOSE_ALTERNATIVE = YES`.

Before the offer or output is shown, record the task, why it matters,
deadline/urgency, realistic alternative, expected alternative active minutes,
expected alternative monetary cost, current pain/importance, and mandatory
acceptance conditions. Classify the task as `QUALIFIED_TASK` or
`TASK_NOT_ELIGIBLE`. Toy, fabricated, favor-only, or unsupported tasks are
rejected.

One participant contributes at most one `QUALIFIED_PURCHASE_OPPORTUNITY` to
the primary v0.1 funnel. A later request is recorded as
`SECONDARY_REPEAT_SIGNAL` and excluded from primary metrics.

## 4. Offer and economic commitment

The same offer is shown before every execution:

- one bounded Precision Edit Outcome;
- defined source asset, instruction, and target scope;
- required inputs and private delivery expectation;
- one included repair round within the original scope;
- price: **MXN $500**;
- full-refund rule in Section 5.

`PURCHASED` means `REAL_PAYMENT` only. The primary numerator excludes
`REAL_COMMITMENT` without payment and `HYPOTHETICAL_ONLY`; those may be logged
as secondary observations.

Payment is handled manually through an already-safe operational mechanism.
No payment infrastructure is built and no financial credentials are stored
in the repository. If real payment cannot be collected, stop with
`PROTOCOL_PAYMENT_DEPENDENCY_BLOCKED`; do not downgrade the evidence silently.

Participant compensation that offsets the MXN $500 decision is prohibited:
no rebate, gift card, study coupon, cash reward, or purchase-contingent
compensation. A contractual refund for Outcome failure is not compensation.

## 5. Frozen refund and acceptance contract

The included repair is triggered when a mandatory acceptance condition recorded
before execution is unsatisfied, while the request remains within the agreed
scope and the buyer has not changed the task. There is exactly **one** included
repair round.

Full refund is due when the provider/operator cannot deliver, or when a
mandatory acceptance condition remains unsatisfied after that one repair. A
security/privacy failure attributable to the delivery also requires stopping
the experiment and refunding the affected transaction.

Buyer change-of-mind, a changed scope, new requirements, invalid or missing
inputs, or rejection of an explicitly non-mandatory preference after all
mandatory conditions are met is not an Outcome failure and does not create an
automatic refund.

If the buyer stops responding or abandons after payment, classify the
opportunity as `ABANDONED`; it remains in the appropriate denominators. No
refund is automatic unless the provider/operator failure rule above applies.

Acceptance is contractual, not a mood rating:

- `ACCEPTED`: all mandatory conditions pass;
- `ACCEPTED_WITH_KNOWN_LIMITATION`: the buyer explicitly accepts, all
  mandatory conditions pass, no refund is owed, and the limitation is recorded;
- `REJECTED`: any mandatory condition remains unsatisfied or the buyer does
  not accept the delivered result.

`ACCEPTED_WITH_KNOWN_LIMITATION` counts as accepted only under those exact
conditions. Technical verification and internal human acceptance remain
separate from buyer acceptance.

## 6. Sample and funnel

Target 8–12 qualified opportunities and at most approximately 10 delivered
Outcomes. Stop when 12 qualified opportunities or 10 delivered Outcomes is
reached, whichever comes first. Fewer than 8 qualified opportunities makes
the experiment `EXPERIMENT_INVALID`.

Primary funnel:

```text
Qualified Need → Offer Shown → REAL_PAYMENT → Outcome Delivered → Outcome Accepted
```

```text
PURCHASE_CONVERSION = REAL_PAYMENT_COUNT / QUALIFIED_OFFERS
ACCEPTED_PURCHASE_RATE = ACCEPTED_PAID_OUTCOMES / QUALIFIED_OFFERS
DELIVERY_ACCEPTANCE = ACCEPTED_PAID_OUTCOMES / DELIVERED_PAID_OUTCOMES
```

`DELIVERY_ACCEPTANCE` must meet the exact threshold `>= 2/3`; ratios are never
rounded to make a cohort pass. All rates report numerator and denominator.

### Denominator contract

| Unit | Entry condition | Exit condition | Denominator membership |
|---|---|---|---|
| `QUALIFIED_OPPORTUNITIES` | One participant has a real eligible task and passes qualification | Offer is shown or the opportunity is recorded as not offered | Remains in the primary qualified denominator forever |
| `OFFERS_SHOWN` | Frozen offer is presented before execution | Buyer pays, declines, or abandons | Remains in qualified and offers-shown counts; never silently deleted |
| `REAL_PAYMENTS` | Payment of MXN $500 is confirmed before execution | Reversal/refund may later change net economics, not the historical payment count | Remains in qualified, offers-shown, and payment counts; primary purchase numerator |
| `DELIVERED_PAID_OUTCOMES` | A paid opportunity receives a private delivered result | Buyer accepts, rejects, or abandons | Remains in every prior count and is the denominator of delivery acceptance |
| `ACCEPTED_PAID_OUTCOMES` | Buyer explicitly accepts under Section 5 | Terminal | Remains in every prior count and is the accepted numerator |
| `REFUNDED_OUTCOMES` | Refund or reversal is actually issued | Terminal | Remains in all reached historical counts; excluded from accepted counts |
| `REJECTED_OUTCOMES` | Mandatory condition fails or buyer rejects | Terminal after repair/refund decision | Remains in all reached historical funnel counts |
| `ABANDONED_OUTCOMES` | Buyer stops responding or withdraws without a qualifying operator failure | Terminal after the fixed abandonment window | Remains in all qualified/offered/paid counts already reached |

## 7. Effort and rework

Measure active buyer minutes for specification, clarification, review,
revision feedback, and final acceptance. Exclude passive waiting.

For every purchased participant with a recorded alternative estimate:

```text
BUYER_EFFORT_RATIO_i =
  MEASURED_BUYER_ACTIVE_MINUTES_i /
  PRE_OFFER_EXPECTED_ALTERNATIVE_ACTIVE_MINUTES_i
```

```text
MEDIAN_BUYER_EFFORT_RATIO = median(BUYER_EFFORT_RATIO_i)
```

The threshold `<= 0.75` is an `EFFORT_REDUCTION_PROXY`, not an objectively
measured counterfactual time saving. Report measured effort and
`SELF_REPORTED_TIME_SAVED` separately.

Record clarification rounds, repair rounds, rejected candidates, final
acceptance, and every operator intervention. Report
`REWORK_ROUNDS_PER_ACCEPTED_OUTCOME`.

## 8. Economics

Record, per opportunity:

- `OFFER_PRICE`;
- `GROSS_PAYMENT`;
- `REFUND`;
- `REVERSAL`;
- `MATERIAL_PAYMENT_FEE`;
- `NET_COLLECTED_PRICE`;
- provider variable cost;
- other variable cost;
- operator active minutes;
- buyer active minutes.

```text
NET_COLLECTED_PRICE =
  GROSS_PAYMENT - REFUNDS - REVERSALS - MATERIAL_PAYMENT_FEES

CONTRIBUTION_PROXY =
  NET_COLLECTED_PRICE
  - provider_variable_cost
  - other_variable_cost
  - operator_minutes × MXN 200/hour
```

Unknown costs remain `UNKNOWN`, never zero. Refunded or rejected Outcomes do
not retain fictional revenue. `GROSS_PROFIT_PER_ACCEPTED_OUTCOME` is labelled
`MEASURED`, `PROXY`, or `UNKNOWN`; this pilot cannot claim mature Gross Profit
when material costs are unknown.

## 9. Alternative, trust, and operator records

Before payment, record one realistic alternative:

`DIY_WITH_GENERIC_AI`, `DIY_WITH_EXISTING_TOOL`, `FREELANCER`,
`EMPLOYEE/COLLEAGUE`, `DO_NOT_DO_TASK`, or `OTHER`, plus the reason for
delegation: speed, attention saved, certainty, quality, urgency, skill gap,
interruption avoidance, or other.

Record trust concerns separately: asset privacy, AI use, ownership, delivery
confidence, quality uncertainty, payment trust, retention, or other.
`TRUST_CONCERN` is a learning signal and does not invalidate the study.
`CONFIRMED_SECURITY_PRIVACY_INCIDENT` immediately stops and invalidates the
experiment.

Operator interventions are classified as `NORMAL_OPERATION`,
`MANUAL_RECOVERY`, `MANUAL_QUALITY_FIX`, `MANUAL_SPEC_TRANSLATION`, or
`MANUAL_DELIVERY`.

## 10. Decision rule

### `BUYER_VALUE_SIGNAL_POSITIVE`

All conditions are required:

- at least 8 qualified opportunities;
- at least 3 `REAL_PAYMENT` events;
- exact `REAL_PAYMENT_COUNT / QUALIFIED_OFFERS >= 30%`;
- `ACCEPTED_PURCHASE_RATE >= 25%`;
- `DELIVERY_ACCEPTANCE >= 2/3`;
- `MEDIAN_BUYER_EFFORT_RATIO <= 0.75`;
- average rework ≤1 round per accepted Outcome;
- aggregate contribution proxy is positive after failed/refunded Outcomes;
- all material costs are known;
- confirmed security/privacy incidents = 0.

### `BUYER_VALUE_SIGNAL_NEGATIVE`

The study is valid, but at least one strong absence-of-value condition holds:

- `PURCHASE_CONVERSION < 20%`; or
- `ACCEPTED_PURCHASE_RATE < 10%`; or
- `DELIVERY_ACCEPTANCE < 1/2`; or
- no reduction in the preregistered effort proxy and persistently low
  acceptance.

### `BUYER_VALUE_SIGNAL_MIXED`

The study is valid, does not meet every positive condition, and does not meet
the negative rule. Report exact counts and exploratory patterns only.

### `EXPERIMENT_INVALID`

Invalidation includes fictional tasks, post-delivery price disclosure,
offsetting compensation, changed acceptance/price/refund rules, hidden or
deleted failures, missing operator effort, public/unauthorized flows, a
security/privacy incident, material protocol changes, use of canonical commit,
or fewer than 8 qualified opportunities.

## 11. Immutability and versioning

The cohort is frozen as:

- `EXPERIMENT_ID = PEX-PRECISION-EDIT-BUYER-VALUE-001`;
- `PROTOCOL_VERSION = 0.1`.

A material change to price, offer, refund, qualification, acceptance, primary
metrics, thresholds, sample, or economic semantics ends this cohort. The next
cohort must use protocol version `0.2` or later and must not be pooled with
v0.1.

## 12. Data and privacy

Keep participant identity, task assets, commercial decisions, and Outcome
evidence logically separate. Use pseudonymous participant IDs in research
records; do not store secrets or payment credentials. Assets and results stay
private under the existing authenticated tenant boundary. Operationally delete
participant assets 30 days after the final decision unless explicit retention
consent exists; retain only de-identified evidence references needed for audit.
This retention step is manual for v0.1 and does not add analytics or storage
infrastructure.

## 13. Start, stop, and architecture gate

Before participant 1, the operator must confirm that this frozen protocol,
offer script, refund rule, acceptance checklist, safe manual payment method,
private handoff, authenticated Field Beta path, and effort/rework ledger are
ready. No participant starts on a partially configured path.

Stop immediately for a confirmed security/privacy incident, unauthorized
public exposure, payment or refund handling that differs from Section 5, or a
material protocol change. Such a stop invalidates the cohort; it is not a
reason to reinterpret the data.

### Technical precondition and architecture gate

The existing authenticated Field Beta workflow, controlled provider, and
private delivery are sufficient. The experiment deliberately does not require
public API, public Storage, recovery, queue, rate limiter, seller system,
payment infrastructure, or canonical `StateCommit`.

`EXPERIMENT_DEPENDS_ON_CANONICAL_COMMIT = NO`  
`NEW_FOUNDATION_WORK_REQUIRED = NO`

Foundation work remains deferred during this cohort. No participant is
recruited until the start criteria, safe manual payment mechanism, and private
handoff are confirmed operationally.

## 14. Status and preregistration

`PREREGISTERED`  
`NOT_STARTED`  
`REAL_OPENAI_PROVIDER_CALLS = 0`

This document is the canonical v0.1 protocol. Historical drafts, if retained,
are superseded and are not active protocols. No participant data exists.
