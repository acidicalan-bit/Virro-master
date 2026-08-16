# BUILD 001-F7-R1.1 - Independence model

## Declared participants

Each receipt carries nullable executor and verifier bindings. A present binding has a stable `actorId`, a stable `contextId`, and a typed role: `EXECUTION`, `VERIFICATION`, or `AUTOMATED_GATE`. Existing free-form executor/verifier names remain display metadata.

## Derived state

`deriveStructuralIndependence` emits one of:

- `STRUCTURALLY_INDEPENDENT`: executor and verifier have present, distinct stable actor and context IDs, with execution and verification roles respectively;
- `AUTOMATED_GATE`: complete typed executor and automated-gate bindings satisfy the existing automated alternative;
- `NOT_STRUCTURALLY_INDEPENDENT`: the relationship is incomplete, non-distinct, or incorrectly classified.

The evaluation records reason codes for each failed condition.

## Self-asserted field

The old authoritative `independence` field is removed from the strict schema. `declaredIndependence` preserves the caller's description as non-authoritative metadata. It is never an input to eligibility; a conflict is exposed as `DECLARED_INDEPENDENCE_CONFLICTS_WITH_DERIVED_RELATIONSHIP`.

## Authenticity boundary

Stable identifiers prevent display-name comparison and make the relationship explicit. R1.1 does not authenticate those identifiers, their contexts, the receipt signer, or artifacts. The derived state is structural, not `AUTHENTICATED_INDEPENDENT`; provenance authenticity remains an open F7 R2 issue.
