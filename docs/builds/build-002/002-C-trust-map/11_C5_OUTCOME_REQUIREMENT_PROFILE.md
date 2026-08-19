# C5 OutcomeRequirementProfile

## Conceptual immutable artifact

`OutcomeRequirementProfile` is a system/catalog-owned, published definition
of required information. It contains no tenant runtime subject, Signal values,
qualification outcome, readiness state, executor data, or secrets.

```text
schemaVersion
id
version
previousVersionHash
hash
status: PUBLISHED | RETIRED
publishedAt
blueprint: { id, version, hash }
policy: { id?, hash? }
requirements: [{
  requirementId,
  semanticType,
  critical,
  acceptedProvenance[],
  qualificationRule: { version, cardinality, humanReviewRequired },
  dependencySelectors: [{ identity, required }]
}]
```

The Profile references an exact Blueprint id/version/hash. A nullable policy is
explicitly `POLICY_IN_C0 = NULLABLE_DEFERRED`; no synthetic policy hash is
created.

## Hash and version invariants

The profile hash covers the exact Blueprint reference, optional policy
reference, schema version, and normalized complete requirement definitions.
Requirement order, accepted-provenance order, and dependency-selector order do
not affect the hash. Duplicate requirement IDs are rejected; conflicting
definitions for an ID are rejected. A published `(id, version)` cannot be
updated. A new semantic definition is a new profile version linked by
`previousVersionHash`.

The Profile is distinct from `SignalRequirement`: the Profile is the
versioned source; compiled SignalRequirements add subject/runtime creation
metadata and are persisted by BUILD002-B.
