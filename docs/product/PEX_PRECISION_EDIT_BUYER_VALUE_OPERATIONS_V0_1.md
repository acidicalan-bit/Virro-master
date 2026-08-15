# Precision Edit Buyer Value — Operations v0.1

**Operations status:** `FROZEN`
**EXPERIMENT_ID:** `PEX-PRECISION-EDIT-BUYER-VALUE-001`
**PROTOCOL_VERSION:** `0.1`
**Protocol tag:** `pex-precision-edit-buyer-value-v0.1`
**Protocol commit:** `350dd8f1cae044ef3921e58006ebf2431c107cf4`
**Protocol SHA-256:** `8fbb63a5d616e693ca0d4978d19c7d86d9e40f44c957c92f782737e0208cd7d9`
**Execution:** `NOT_STARTED`

The frozen protocol thresholds used operationally are
`DELIVERY_ACCEPTANCE >= 2/3` and
`MEDIAN_BUYER_EFFORT_RATIO <= 0.75`. Primary purchase is
`PURCHASED = REAL_PAYMENT`; maximum primary opportunity is one per
participant; the sample is 8–12 qualified opportunities with a maximum of
approximately 10 delivered Outcomes; participant compensation offsetting the
price is `PROHIBITED`; `NEW_FOUNDATION_WORK_REQUIRED = NO`.

This document is the single operating procedure for the frozen v0.1 buyer-
value experiment. It clarifies procedure but cannot change the protocol's
price, qualification, acceptance, refund, sample, denominator, effort,
economic, threshold, or invalidation semantics. It is documentation only:
there is no runtime, schema, payment, analytics, Supabase, or provider change.

## 1. Roles and authority

- **Experiment Operator:** one designated primary operator records factual
  process events, runs the controlled workflow, and maintains the ledger.
- **Experiment Reviewer:** optional second person checks completeness and
  provenance without rewriting buyer answers.
- **Experiment Stop Authority:** the designated security/privacy owner has
  unilateral authority to stop immediately for a security, privacy,
  cross-tenant, payment-compromise, or authority-boundary incident.

The operator may not override a buyer's commercial acceptance. Corrections
preserve the original value, corrected value, actor, timestamp, and reason.

## 2. Recruitment controls

### Allowed sources

Recruit only through bounded, direct channels:

- founder/network outreach;
- small-business operators;
- creators or marketers;
- designers/developers with an actual time-sensitive edit;
- nontechnical professionals with a real digital-asset need.

No public advertising, marketplace listing, acquisition campaign, or open beta
is used for v0.1.

### Relationship classification

Before screening, record exactly one of:

`FOUNDER_CLOSE_RELATION`, `PROFESSIONAL_CONTACT`, `WARM_NETWORK`,
`ARM_LENGTH_CONTACT`, `OTHER`.

Also record `LIKELY_SOCIAL_OBLIGATION = YES|NO`. A close relationship is not
automatically invalid, but if more than half of qualified opportunities have
`YES`, stop with `RECRUITMENT_SAMPLE_CONTAMINATED` and do not claim
`CONTROLLED_FIELD_EVIDENCE`.

### Frozen recruitment script

> Estoy ofreciendo un servicio piloto de edición digital precisa. Busco
> personas que ya tengan una tarea real y próxima —por ejemplo, corregir o
> ajustar un activo visual— y prefieran delegar su ejecución. El precio es
> MXN $500 antes de comenzar; te explicaría el alcance, la entrega y la regla
> de reparación antes de que decidas. ¿Tienes ahora una tarea así?

Do not describe success thresholds, desired conversion, architecture, or
provider details in the initial message. Do not promise free work, discounts,
future compensation, investment access, or reciprocity. If AI/provider use is
material to informed trust, disclose it before the commercial decision.

## 3. Screening and qualification

Apply the same script to every candidate, before showing any produced result:

1. ¿Qué tarea real necesitas resolver?
2. ¿Por qué importa y cuándo la necesitas?
3. Si no delegaras, ¿qué alternativa concreta usarías?
4. ¿Cuántos minutos activos esperas invertir en esa alternativa?
5. ¿Qué coste monetario tendría esa alternativa?
6. ¿Qué tendría que cumplir el resultado para aceptarlo?
7. ¿Puedes proporcionar los insumos necesarios de forma privada?

Record the minimum preregistered fields: task, importance, deadline,
alternative, expected alternative active minutes, expected alternative cost,
and mandatory acceptance conditions.

Return exactly one qualification result:

- `QUALIFIED_TASK`: real task, near-term need, realistic alternative,
  supported Precision Edit scope, required inputs available, and acceptable
  privacy/security conditions.
- `TASK_NOT_ELIGIBLE`: record one reason code:
  `NO_REAL_TASK`, `NO_NEAR_TERM_NEED`, `OUTSIDE_PRECISION_EDIT_SCOPE`,
  `NO_REQUIRED_INPUT`, `NO_REALISTIC_ALTERNATIVE`,
  `SECURITY_OR_PRIVACY_UNSUITABLE`, or `OTHER_PREDEFINED`.

Once qualified, create the immutable primary opportunity before showing the
offer. A qualified opportunity cannot be removed because the candidate
declines, abandons, pays, receives a refund, or rejects the result.

## 4. Frozen offer and decision

### Exact offer script

> El servicio realizará **[descripción de la edición]** sobre **[activo y
> alcance]** y entregará un resultado privado para que lo revises. Necesito
> **[insumos]**. El precio es **MXN $500**, pagado antes de comenzar. Incluye
> una sola ronda de reparación si una condición obligatoria registrada ahora
> no se cumple y la solicitud sigue dentro del alcance original. Si una
> condición obligatoria continúa incumplida después de esa reparación, o no
> podemos entregar, corresponde reembolso completo. Si cambias de opinión,
> cambias el alcance o rechazas una preferencia no obligatoria después de
> cumplir las condiciones obligatorias, no es un fallo del Outcome y no hay
> reembolso automático. ¿Aceptas este alcance y precio?

The operator does not negotiate, personalize, discount, or offer a free trial.
The decision is timestamped as exactly one of:

`PURCHASED_REAL_PAYMENT`, `DECLINED_PRICE`, `DECLINED_OTHER`,
`ABANDONED_PRE_PAYMENT`.

If the candidate requests time, use one uniform expiry: the earlier of the
stated task deadline or seven calendar days after the offer. On expiry, record
`ABANDONED_PRE_PAYMENT`; never pressure the candidate.

## 5. Payment confirmation

Use an already-safe manual payment mechanism. Do not add payment code or
record financial credentials. Before execution, the operator records:

- `payment_confirmed = YES|NO`;
- gross amount (must be MXN $500 for a primary purchase);
- timestamp;
- safe payment reference (non-secret);
- material payment fee, if known.

Execution may begin only after `PURCHASED_REAL_PAYMENT`. A commitment,
promise, or hypothetical willingness to pay is not a purchase numerator.

## 6. Task lock and scope changes

Before execution, lock one commercial Task Record containing:

- opportunity and pseudonymous participant IDs;
- source asset reference;
- requested edit and target scope;
- mandatory acceptance conditions;
- deadline;
- realistic alternative and expected alternative minutes/cost;
- MXN $500 price and the frozen refund terms.

A clarification that makes the original request unambiguous is
`CLARIFICATION_WITHIN_ORIGINAL_SCOPE` and is logged without changing
acceptance conditions. A new object, goal, or mandatory condition is
`MATERIAL_SCOPE_CHANGE`:

- before payment: record the original opportunity as declined/abandoned and
  do not create a second primary opportunity for that participant;
- after payment: do not execute the changed scope under v0.1; retain the
  original locked record and apply the frozen change-of-mind/abandonment or
  operator-failure refund rule as applicable.

Never rewrite the task after seeing an output.

## 7. Time measurement

### Buyer active time log

Record timestamped start/end or explicit duration for:

`INITIAL_SPECIFICATION`, `CLARIFICATION`, `REVIEW`, `REPAIR_FEEDBACK`,
`FINAL_ACCEPTANCE`.

Exclude provider waiting and passive delivery wait. Each duration is marked
`MEASURED` when timestamped by the operator/system or `SELF_REPORTED` when
provided by the buyer. Do not silently combine the labels. Compute the
protocol's individual ratio only when the pre-offer alternative estimate and
the active minutes exist:

```text
BUYER_EFFORT_RATIO_i = measured_buyer_active_minutes_i
                       / pre_offer_expected_alternative_active_minutes_i
```

`MEDIAN_BUYER_EFFORT_RATIO <= 0.75` is an effort-reduction proxy, not measured
counterfactual time saved. Record self-reported time saved separately.

### Operator intervention log

For every material intervention record start/end or duration, reason, and
Outcome ID under exactly one category:

`NORMAL_OPERATION`, `MANUAL_RECOVERY`, `MANUAL_QUALITY_FIX`,
`MANUAL_SPEC_TRANSLATION`, `MANUAL_DELIVERY`.

Provider waiting is not operator active time. Provider attempts and retries are
recorded separately and never hidden in operator minutes.

## 8. Execution precheck and provider accounting

Before every paid execution confirm:

- verified Auth principal;
- active tenant and active membership;
- private source asset;
- supported Precision Edit scope;
- controlled provider available;
- no canonical commit or `StateCommit` path;
- private delivery path available.

If any check fails, return `OUTCOME_EXECUTION_BLOCKED`; do not use a public or
unsafe workaround. Apply the frozen contractual refund/repair handling.

For each real provider attempt record attempt number, provider, latency,
success/failure, known variable cost, and whether it belongs to the original
execution or included repair. Hidden retries are prohibited.

## 9. Delivery, repair, acceptance, and refund

### Delivery

Deliver privately through the existing controlled workflow with the final
artifact, enough inspection context, and the acceptance conditions. Do not
tell the buyer that a verifier passed or steer the commercial judgment.

### Acceptance script

> Revisa el resultado contra estas condiciones obligatorias: **[lista
> congelada]**. Selecciona una opción: `ACCEPTED`,
> `ACCEPTED_WITH_KNOWN_LIMITATION`, o `REJECTED`.

For `ACCEPTED_WITH_KNOWN_LIMITATION`, record the limitation, confirm every
mandatory condition still passes, and confirm no refund is due. An unmet
mandatory condition is `REJECTED`. The operator cannot override the buyer.

For reporting, `DELIVERY_ACCEPTANCE` is
`ACCEPTED_PAID_OUTCOMES / DELIVERED_PAID_OUTCOMES` and must meet exactly
`>= 2/3`; no rounding or denominator changes are permitted.

### Repair procedure

When a mandatory condition fails within the original scope:

1. record `repair_triggered = YES`, failed criterion, and buyer feedback;
2. record operator minutes and provider attempts;
3. perform exactly one included repair;
4. deliver the repaired result;
5. obtain a second independent acceptance decision.

No extra discretionary repair round is allowed.

### Refund procedure

Record `refund_due`, `refund_amount`, `refund_timestamp`, and reason. Full
refund is due when the provider/operator cannot deliver or a mandatory
condition remains unsatisfied after the single included repair. Buyer
change-of-mind, changed scope, invalid/missing inputs, or rejection of a
non-mandatory preference after mandatory conditions pass is not an automatic
refund. A nonresponsive buyer is `ABANDONED`; no automatic refund applies
unless the operator-failure rule applies.

Economic records use:

```text
NET_COLLECTED_PRICE = GROSS_PAYMENT - REFUNDS - REVERSALS - MATERIAL_PAYMENT_FEES
CONTRIBUTION_PROXY = NET_COLLECTED_PRICE - provider_variable_cost
                      - other_variable_cost - operator_minutes × MXN 200/hour
```

Unknown costs remain `UNKNOWN`; refunded/rejected Outcomes do not retain
fictional revenue.

## 10. Minimum opportunity record

Use one access-restricted, append-oriented structured record per opportunity;
no new database is required for this pilot.

```text
opportunity_id
participant_pseudonym
segment
relationship_class
likely_social_obligation
qualification_status
qualification_reason
qualified_timestamp
task_summary
importance
deadline
alternative
expected_alternative_minutes
expected_alternative_cost
mandatory_acceptance_conditions
offer_shown_timestamp
offer_price
decision
decision_timestamp
real_payment
gross_payment
material_payment_fee
refund
reversal
net_collected_price
source_asset_reference
outcome_id
provider_attempts
provider_variable_cost
other_variable_cost
operator_minutes_by_category
buyer_minutes_by_phase
buyer_measurement_source_by_phase
delivery_timestamp
repair_count
acceptance_state
acceptance_limitation
trust_concerns
confirmed_security_privacy_incident
denominator_flags
invalidity_flags
notes
```

The participant controls their acceptance, alternative, and trust answers.
The operator controls factual timestamps, attempts, costs, and interventions.
The reviewer may check completeness. Corrections append provenance rather than
overwriting history.

## 11. Event ledger

Append one event for each material transition:

```text
timestamp
actor_role
event
opportunity_id
old_state
new_state
reason
source_record_reference
correction_of_event_id (optional)
```

Allowed primary events:

`QUALIFIED`, `OFFERED`, `PAID`, `EXECUTION_STARTED`, `DELIVERED`,
`REPAIR_TRIGGERED`, `ACCEPTED`, `REJECTED`, `REFUNDED`, `ABANDONED`.

Never delete a failure or choose a denominator after observing the result.

## 12. Stop and pause matrix

| Condition | Action | Classification |
|---|---|---|
| Confirmed security/privacy incident, cross-tenant exposure, compromised payment handling, unauthorized public delivery, or authority failure | Stop immediately; preserve evidence; do not continue cohort | `EXPERIMENT_STOPPED_SECURITY` or `EXPERIMENT_INVALID` |
| Canonical commit or `StateCommit` becomes necessary | Stop the opportunity; apply contract; no workaround | `EXPERIMENT_INVALID` |
| Repeated execution failure, provider outage, unexpected cost escalation, repeated manual recovery, ambiguous acceptance, or payment/refund operations fail | Pause and review; do not change protocol or pool a changed workflow | Operational pause; resume only when the same frozen procedure is safe |
| 12 qualified opportunities or 10 delivered Outcomes | Stop recruitment/execution under v0.1 | Normal protocol stop |
| Fewer than 8 qualified opportunities after the bounded recruitment window | Stop and classify invalid | `EXPERIMENT_INVALID` |

The Experiment Stop Authority may stop without commercial approval.

## 13. Manual running counts

Maintain these counts daily:

`CONTACTED`, `SCREENED`, `QUALIFIED`, `OFFERED`, `REAL_PAID`, `DELIVERED`,
`ACCEPTED`, `REJECTED`, `REFUNDED`, `ABANDONED`.

Contacted and screened are operational counts only. The primary denominator
remains the immutable qualified-opportunity population from protocol v0.1.

Do not target easier buyers after weak conversion, discount after refusals,
exclude difficult qualified tasks, or stop early because a provisional rate
looks positive.

## 14. Participant privacy disclosure

Before task intake, tell the buyer what source asset and task information are
needed, that the asset is used to produce and evaluate the requested delivery,
that access is private and controlled, the intended 30-day operational
deletion window unless retention is explicitly agreed, and whether a provider
processes the asset. Do not make unsupported legal/compliance claims and do
not collect unnecessary sensitive information.

## 15. Daily operator checklist

Before each operating day:

- confirm protocol tag and operations document hashes/versions;
- confirm participant, payment, Outcome, and provider counts;
- confirm private Auth/RLS and delivery boundary;
- confirm no protocol, price, threshold, or acceptance change;
- confirm payment/refund ledger access is restricted;
- review open pauses and stop conditions.

After each opportunity:

- append the event ledger;
- complete buyer and operator time logs;
- reconcile payment, fee, refund, and net economics;
- record acceptance and repair state;
- check denominator flags and invalidity flags;
- preserve original answers and correction provenance.

## 16. Fictional dry run

`OPS_DRY_RUN = PASS`. The following is fictional data only; it created no
participant, payment, Outcome, provider call, or Supabase row.

### Normal accepted branch: `DRY-001`

1. Fictional creator is classified `ARM_LENGTH_CONTACT`, social obligation
   `NO`.
2. Screening identifies a real-in-the-scenario near-term poster edit, a
   freelancer as alternative, 120 expected alternative minutes, and fixed
   acceptance conditions. Result: `QUALIFIED_TASK`.
3. Immutable qualified opportunity is created; frozen MXN $500 offer is shown.
4. Hypothetical payment is marked only in the dry-run simulation; the real
   ledger remains at zero.
5. Task Record is locked; precheck passes in the simulation.
6. Mock delivery is made; buyer selects `ACCEPTED`.
7. Event ledger records QUALIFIED → OFFERED → PAID → EXECUTION_STARTED →
   DELIVERED → ACCEPTED. No repair or refund is due.

### Repair/refund branch: `DRY-REFUND`

1. Fictional buyer is qualified under the same script and task lock.
2. Mock delivery fails one mandatory condition; `REPAIR_TRIGGERED = YES`.
3. Exactly one mock repair is attempted and still fails the mandatory
   condition; final state is `REJECTED`.
4. `refund_due = YES`, full refund is recorded, and net collected price is
   zero. The paid, delivered, rejected, and refunded historical counts remain
   present; no failure is deleted.

The dry run covered candidate → screening → qualification → offer → simulated
payment confirmation → task lock → precheck → mocked delivery → acceptance,
repair, refund, and record completion without exercising any real system.

## 17. Frozen operating state

```text
PROTOCOL_STATUS = PREREGISTERED_FROZEN
OPERATIONS_STATUS = FROZEN
EXECUTION_STATUS = NOT_STARTED
PARTICIPANTS = 0
QUALIFIED_OPPORTUNITIES = 0
REAL_PAYMENTS = 0
DELIVERED_OUTCOMES = 0
REAL_PROVIDER_CALLS = 0
```

The protocol remains immutable at v0.1. A material operational change ends
this cohort and requires a new operations/protocol review; it must not be
pooled silently with v0.1.
