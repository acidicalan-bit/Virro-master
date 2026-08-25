# BUILD002 C1 D6 Remediation Specification

```text
BUILD=BUILD002
CYCLE=C1
STAGE=D6
AUTHORITY_TYPE=PROSPECTIVE_REMEDIATION
RETROACTIVE_AUTHORIZATION=NO
PARENT_C1_AUTHORITY_COMMIT=0b0010d86c42caedfea5380d306f83b8219f6506
```

## 1. Authority status and purpose

This document is the first canonical prospective specification for
`BUILD002_C1_D6`. It is governance authority only. It neither implements D6
nor authorizes D6 implementation until this candidate has been independently
verified and canonicalized.

```text
D6_EXISTS_PROSPECTIVELY=YES
D6_REASON=REMEDIATE_CANONICALLY_CERTIFIED_C1_GAPS_TC04_TC05_TC06
D6_HISTORICALLY_EXISTED=NO
D6_IMPLEMENTATION_AUTHORIZED_BY_SPEC_CANDIDATE=NO
D6_POSITIVE_SCOPE_ENDS_BEFORE_PROVIDER_INVOCATION=YES
```

The historical record remains unchanged:

```text
HISTORICAL_D6_SPEC=ABSENT
HISTORICAL_D6_IMPLEMENTATION=ABSENT
HISTORICAL_D6_REQUIREMENT=NOT_PROVEN
PROSPECTIVE_D6_AUTHORITY=YES
RETROACTIVE_D6_AUTHORIZATION=NO
```

This prospective authority must not be used to rewrite any earlier review or
implementation as having operated under a historical D6 specification.

## 2. Frozen authority and product baseline

```text
CANONICAL_C1_AUTHORITY_COMMIT=0b0010d86c42caedfea5380d306f83b8219f6506
CANONICAL_C1_AUTHORITY_TREE=1c25326dfb78874335b0a7f835b61e721f7efe5c
CANONICAL_C1_AUTHORITY_SPEC=docs/builds/build-002/00_C1_CANONICAL_OBJECTIVE.md
CANONICAL_C1_AUTHORITY_SPEC_SHA256=6b60f1e32e6d1ec070b7ac95ff4965372fb903943fb71c72539e41d13cf25274
PRODUCT_BASE_SHA=e13224fd2bf2b370db209d9537e56672a4409ccb
PRODUCT_BASE_TREE=8e56edd3b67cdac0031e4e62aac48175c656f17d
```

The parent C1 authority and the product baseline are inputs to this document,
not subjects of modification.

## 3. Current gap authority

Creation of this prospective authority is limited to the following gaps,
which were independently reproduced against the unchanged product baseline:

```text
TC04_GAP_REPRODUCED=YES
GAP-C1-TC04=CANONICAL_RESERVATION_NOT_INTEGRATED_AS_FIELD_BETA_CHOKE_POINT

TC05_GAP_REPRODUCED=YES
GAP-C1-TC05=EXACT_EXECUTION_OR_ATTEMPT_LINEAGE_BINDING_NOT_PROVEN

TC06_GAP_REPRODUCED=YES
GAP-C1-TC06=SUPPORTED_FIELD_BETA_PATH_CAN_INVOKE_PROVIDER_WITHOUT_CANONICAL_C1_READINESS_OR_RESERVATION
```

The supported Field Beta call graph reaches provider execution through the
legacy orchestration path. That path creates a legacy mutation lease, binds a
legacy in-memory execution authority, and calls the executor without granting,
consuming, or revalidating the canonical BUILD002 D5 MutationLease.

The current canonical D5 model binds authority/currentness material including
`authorityCommitId`, `delegabilityAdmissionId`, execution authority ID and
hash, TaskSpec, transaction, asset, source, target, and operation category. It
does not establish an exact downstream `execution_id`, `attempt_id`, or
`lineage_id`. No downstream provider gate consumes and revalidates the
canonical reservation. A synthetic-provider test reproduces provider
invocation and candidate production without canonical C1 reservation.

## 4. Narrow D6 objective

> Establish one canonical server-owned pre-provider execution-attempt reservation boundary for all supported Field Beta provider invocations, using the existing D5 authority/currentness guarantees as an input, binding the reservation to exactly one downstream execution attempt, and ensuring rejected or invalid reservations cannot produce executor invocation, provider invocation, provider effect, or state commit.

This is the complete positive D6 objective. Requirements outside remediation
of TC04, TC05, TC06, or necessary D0-D5 regression preservation are outside
D6 authority.

## 5. Architectural decision

D6 preserves the proven D5 primitive and adds an exact-attempt admission layer:

```text
immutable D5 MutationLease
        |
        v
immutable D6 ExecutionAttemptReservation
        |
        v
append-only D6 ReservationConsumption
        |
        v
Provider Invocation
```

The D5 MutationLease remains immutable authority/currentness evidence. D6 adds
exact downstream attempt identity, immediately pre-provider consumption, and
one shared supported-path choke point.

```text
D5_SEMANTICS_REDEFINED=NO
D5_REGRESSION_PRESERVATION_REQUIRED=YES
```

D6 must not silently make `build002_mutation_leases` mutable by adding a
`consumed=true` lifecycle. A later implementation may choose an equivalent
model only if it preserves auditability and immutability and documents why the
preferred wrapper is impossible.

## 6. ExecutionAttemptId

D6 introduces the conceptual primitive `ExecutionAttemptId` with all of these
properties:

```text
SERVER_OWNED
UNIQUE
EXACT
IMMUTABLE
NON_CLIENT_AUTHORITY
BOUND_TO_ONE_PROVIDER_ATTEMPT
```

It is an opaque identity assigned by the server. A client-supplied value is
never authoritative. It must not be derived solely from tenant ID, TaskSpec,
transaction, execution authority, resource ID, or operation category because
distinct attempts can share every one of those values. UUID or another
suitable opaque identifier may be used; custom cryptography is not required.

## 7. ExecutionAttemptReservation

`ExecutionAttemptReservation` is an immutable record that conceptually carries:

```text
reservation_id
execution_attempt_id
mutation_lease_id
dataspace/tenant binding where applicable
readiness authority binding
delegability admission binding
execution authority ID
execution authority hash
TaskSpec hash
operation binding
value binding
transaction/resource/source/target binding
created_at
valid_until
canonical hash / integrity material where required
```

Its exact implementation representation remains an implementation-design
decision. The stored data and authoritative readback must make this chain
reconstructable and testable without semantic substitution:

```text
reservation
  -> exact D5 lease
  -> exact readiness authority
  -> exact execution authority
  -> exact execution attempt
```

## 8. ReservationConsumption

`ReservationConsumption` is an append-only record of successful admission. A
supported Field Beta provider invocation requires an immediately preceding
successful consumption of the exact reservation for the exact attempt:

```text
ProviderInvocation(A) => SuccessfulReservationConsumption(A)
```

Consumption must be atomic with respect to competing consumers. Exactly one
successful consumption per reservation/attempt is allowed:

```text
SuccessfulConsumptions(reservation) <= 1
SuccessfulProviderAdmissions(execution_attempt_id) <= 1
```

These are exactly-once admission guarantees at the D6 boundary. They do not
promise provider-level exactly-once execution.

## 9. Consequence-time revalidation and failure

Immediately before successful consumption, the canonical gate must revalidate
all material currentness required at the provider-admission boundary. The
implementation design must determine the exact authoritative checks, including
at minimum whether each of the following is material:

```text
lease freshness
readiness currentness
execution authority currentness
execution authority hash
TaskSpec hash
operation binding
value binding
execution_attempt_id
```

Validity when the reservation was issued is insufficient where canonical
currentness may have changed before provider admission.

Consumption must fail closed for:

```text
missing reservation
unknown reservation
expired reservation/lease
wrong execution_attempt_id
already consumed reservation
stale readiness
stale execution authority
authority hash mismatch
TaskSpec mismatch
operation mismatch
value mismatch
inconsistent readback
```

The protected provider path must not silently renew, reissue, replace, or
repair an authority or reservation after consumption failure.

## 10. Shared Field Beta choke point

Every supported Field Beta provider path must converge through one canonical
logical boundary:

```text
Field Beta supported entrypoint
        |
        v
ExecutionAttempt reservation
        |
        v
Canonical provider gateway
        |-- validate exact attempt
        |-- consume exact reservation
        |-- verify same attempt
        `-- invoke provider only on success
```

```text
SUPPORTED_FIELD_BETA_PROVIDER_CALL => CANONICAL_C1_D6_GATE
```

No supported legacy path may remain around the gate. Direct provider-adapter
invocation from supported Field Beta orchestration must become structurally
unavailable or be explicitly rejected by architectural tests. Code may be
organized differently only if the same invariant is enforced.

## 11. Positive boundary and negative guarantee

D6 owns the pre-provider admission transition only. Its positive scope ends
after successful consumption and before provider invocation. Provider business
logic, response semantics, candidate acceptance, provider result commit,
StateCommit, and post-execution processing remain outside positive C1 scope.

For every D6 rejection:

```text
ReservationConsumption = 0
ExecutorInvocation = 0
ProviderInvocation = 0
ProviderEffect = 0
StateCommit = 0
```

This is a negative safety guarantee and does not place successful provider
execution inside positive C1 scope.

## 12. Exact lineage invariant

`D6-I-LINEAGE` is exact equality:

```text
Reservation.execution_attempt_id == Consumption.execution_attempt_id == ProviderInvocationContext.execution_attempt_id
```

No semantic substitute is permitted. The gate must reject a reservation for
attempt A used by attempt B, a reservation reused by another execution, the
same TaskSpec with a different attempt, the same authority with a different
attempt, and the same transaction with a different attempt.

## 13. Retry and crash-window semantics

D6 preserves the existing D5 retry/lease invariants:

```text
EXPIRED_LEASE_RETURNED=NO
EXPIRED_LEASE_ACCEPTED=NO
EXPIRED_LEASE_REISSUED=NO
```

A new provider attempt after a consumed or failed attempt must not reuse a
consumed execution-attempt reservation. It requires a new exact attempt
admission under canonical retry authority that is still valid. If current D5
uniqueness prevents safe fresh admission, implementation must report that
conflict rather than weaken uniqueness.

The architecture acknowledges this crash window:

```text
successful consumption
  -> process crash
  -> provider not invoked
```

Failing without invocation is preferable to unsafe double invocation. A
consumed reservation must not be replayed merely because provider outcome is
unknown. The state must be explicitly diagnosable as
`ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN` or equivalent. Full
provider recovery is outside D6 unless existing canonical authority requires
it.

## 14. Terminal requirements

### D6-R01 — Shared supported-path gate

All supported Field Beta provider invocation paths traverse the canonical D6
gate.

### D6-R02 — Exact execution attempt identity

Each provider attempt admitted by D6 has one server-owned exact
`execution_attempt_id`.

### D6-R03 — D5 authority binding

Each execution-attempt reservation is bound to the exact underlying D5
authority/currentness material.

### D6-R04 — Exact lineage binding

The reservation is bound to the exact execution attempt eventually presented
to the provider invocation boundary.

### D6-R05 — Atomic single consumption

A reservation can be successfully consumed at most once.

### D6-R06 — Consequence-time validation

Consumption revalidates all current material required at the
provider-admission boundary.

### D6-R07 — Fail closed

Any invalid, stale, mismatched, or consumed reservation produces no provider
admission.

### D6-R08 — Zero downstream consequence on rejection

Rejected D6 admission produces zero executor invocations, zero provider
invocations, zero provider effects, and zero state commits.

### D6-R09 — No supported bypass

The currently supported legacy Field Beta bypass is removed or made
unreachable as a supported path.

### D6-R10 — D5 regression preservation

All relevant D0-D5 authority, hash, currentness, ACL, lease, and concurrency
invariants remain valid.

## 15. Requirement-to-gap mapping

```text
D6-R01 → TC04 + TC06
D6-R02 → TC05
D6-R03 → TC04 + TC05
D6-R04 → TC05
D6-R05 → TC05 + TC06
D6-R06 → TC02 + TC04 + TC06
D6-R07 → TC04 + TC05 + TC06
D6-R08 → TC06
D6-R09 → TC04 + TC06
D6-R10 → regression preservation
```

`D6-R06` references proven TC02 only because consequence-time validation must
preserve that established readiness/currentness invariant while remediating
TC04 and TC06. Every D6 requirement therefore traces to TC04, TC05, TC06, or
necessary regression preservation.

```text
D6_REQUIREMENTS_TOTAL=10
D6_REQUIREMENTS_GAP_TRACEABLE=10
D6_REQUIREMENTS_UNTRACEABLE=0
```

## 16. Database change policy and preferred shape

A later, separately authorized D6 implementation may require additive
persistence for reservations, consumptions, and supporting RPCs, constraints,
or indexes. This specification does not create a migration or prescribe unsafe
migration mechanics before repository inspection.

Any implementation must keep the existing 40 migrations immutable, add only
new migrations, pass clean replay, fail ACLs closed, use service-role-only
protected RPCs where appropriate, and prevent normal application roles from
directly writing canonical tables.

The preferred, non-binding shape is:

```text
build002_execution_attempt_reservations
  reservation_id
  execution_attempt_id
  mutation_lease_id
  created_at
  ...

build002_execution_attempt_consumptions
  consumption_id
  reservation_id
  execution_attempt_id
  consumed_at
  ...
```

Recommended properties are exact foreign keys, append-only records, unique
consumption per reservation, and uniqueness of `execution_attempt_id` wherever
semantically required. Final schema must follow repository conventions and
canonical identifiers.

## 17. Required future verification

The separately authorized implementation must include at least these
adversarial cases:

```text
A01 provider call without reservation
A02 wrong reservation
A03 wrong attempt ID
A04 reservation from another attempt
A05 same TaskSpec different attempt
A06 same authority different attempt
A07 expired lease
A08 stale readiness
A09 stale execution authority
A10 authority hash mismatch
A11 TaskSpec mismatch
A12 operation mismatch
A13 value mismatch
A14 duplicate consumption sequential
A15 duplicate consumption concurrent
A16 bypass through legacy Field Beta path
A17 forged client attempt identity
A18 inconsistent DB readback
A19 consumption failure with provider spy
A20 consumption failure with candidate/effect spy
```

Every applicable negative case must assert:

```text
provider_invocations = 0
provider_effects = 0
state_commits = 0
```

The positive synthetic-provider test must prove that valid readiness, valid
execution authority, a fresh D5 lease, an exact execution-attempt reservation,
and one successful consumption produce exactly one provider invocation. No
real external provider is required.

The concurrency test must start at least two simultaneous consumers of the
same reservation and prove one successful consumption and at most one provider
admission. A deadlock or silent timeout is not success.

## 18. Explicit non-goals

D6 does not include:

```text
provider implementation redesign
provider result commit
StateCommit redesign
post-execution processing
remote environment verification
authenticated evaluation operations
multi-region changes
marketing changes
DNS
mail
UI redesign
broader BUILD002 hardening
new data platform architecture
UDR implementation
```

## 19. Candidate authorization boundary

This candidate changes governance documentation only. It creates no D6
implementation, migration, RPC, provider gateway, consumption operation, or
runtime authorization. Implementation may begin only after this specification
candidate is independently verified and canonicalized under separate execution
authority.

```text
PRODUCT_CHANGED=NO
APPLICATION_CODE_CHANGED=NO
MIGRATIONS_CHANGED=NO
CI_CHANGED=NO
AUTHORITY_C1_CHANGED=NO
MAIN_CHANGED=NO
D6_IMPLEMENTATION_CREATED=NO
D6_IMPLEMENTATION_AUTHORIZED=NO
```
