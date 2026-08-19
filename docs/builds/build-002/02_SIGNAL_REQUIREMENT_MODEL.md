# Signal and Requirement Model

## Requirement source decision

Use an immutable requirement snapshot compiled from the existing versioned
`OutcomeBlueprint` (decision B from the pre-implementation options). Do not
create independent caller-authored `SignalRequirement` definitions.

The blueprint variables, conditional rules, security profile, capability policy
and policy/version inputs are the authoritative semantic source. The compiler
may emit a normalized requirement snapshot for the transaction, but it must
include the exact `blueprintId`, `blueprintVersion`, `blueprintHash` and a
canonical `requirementDefinitionHash`. `TaskSpec.inputRequirements` remains a
compatibility projection and must verify against the same blueprint/hash.

Criticality, accepted provenance and qualification rules are server-owned
blueprint/policy data. No caller field can mark a signal critical, accepted, or
ready.

## Requirement snapshot

Each requirement snapshot contains:

- stable `requirementId` and subject kind;
- semantic type/shape and deterministic qualification rule version;
- `critical: true|false` from the blueprint/policy;
- accepted provenance set from the server definition;
- source/dependency selectors that materially affect validity;
- blueprint and policy IDs/versions/hashes;
- canonical definition hash and creation timestamp.

The snapshot is immutable. A new blueprint or rule version creates a new hash;
old readiness cannot silently qualify against it.

## Signal record

A server-created Signal is bound to:

- `signalId`, tenant root and `OutcomeTransaction` subject ID;
- requirement ID and value/payload (stored separately from qualification);
- source reference and source version/hash, when applicable;
- server-assigned provenance;
- captured-at time and optional valid-until/expiry;
- dependency identity, content hash and schema version;
- immutable creation metadata.

The server derives tenant and subject from authenticated authority and the
transaction lineage. A caller may submit raw input or a source reference, but
cannot submit tenant ownership, accepted provenance, qualification status,
requirement criticality, readiness state, definition hash or dependency hash.

## Provenance versus knowledge status

Provenance describes how a value entered the system; it is not a truth oracle.
The minimum server vocabulary is:

- `CUSTOMER_STATED`: supplied by the authenticated user;
- `OBSERVED`: measured from an authorized artifact/source;
- `SYSTEM_DERIVED`: deterministic derivation from bound inputs;
- `INFERRED`: model/compiler inference, never silently sufficient for a
  critical requirement;
- `APPROVED`: explicit pre-execution human confirmation, only where a
  requirement permits it;
- `UNKNOWN`: a recorded indeterminate value, not a substitute for no Signal.

Qualification separately describes whether the signal satisfies a requirement.
`UNKNOWN` provenance or knowledge cannot upgrade a critical requirement. A
caller-provided `provenance=CONFIRMED` or `status=READY` is rejected as an
untrusted field, not interpreted as authority.

## Qualification outcomes

Per requirement, the authoritative evaluator may return only the outcomes
needed by the evidence:

- `QUALIFIED`: exact rule, provenance and dependency checks pass;
- `MISSING`: no signal is bound to the requirement;
- `UNKNOWN`: a signal exists but its value cannot be determined;
- `INCOMPATIBLE_PROVENANCE`: source class is not accepted by the requirement;
- `CONTRADICTORY`: two authoritative current signals disagree;
- `STALE_SOURCE`: source/dependency hash no longer matches;
- `INVALID`: schema, tenant, subject, integrity or rule validation failed;
- `REQUIRES_HUMAN_REVIEW`: the requirement explicitly requires a review action.

The evaluator stores requirement-definition hash, signal IDs/hashes, subject,
tenant, evaluator version/hash, dependency snapshot and a deterministic reason.
The caller supplies neither the outcome nor its reason.

## Contradictions

Only deterministic conflicts supported by the requirement are contradictions:
for example, two current authoritative observations for one single-valued
field disagree, or a source version conflicts with the signal dependency.
There is no AI truth oracle and no silent precedence rule. An unresolved
contradiction is non-ready.
