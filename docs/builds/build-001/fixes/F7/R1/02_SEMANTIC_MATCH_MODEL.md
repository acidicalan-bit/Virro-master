# BUILD 001-F7-R1 - Semantic match model

## Authoritative identifiers

`src/assurance/development-evidence.mts` defines closed enums for assurance subjects, controls, boundaries and environment classes. Matching is exact; there is no fuzzy text, control family inheritance or inferred subordinate boundary.

## Qualification sequence

1. Select exact build, spec and criterion IDs.
2. Match criterion version and definition hash.
3. Match subject ID.
4. Match control ID.
5. Match required boundary ID.
6. Require an explicitly accepted environment class.
7. Require the minimum evidence level.
8. Enforce the criterion independence policy.
9. Interpret PASS/FAIL only after all preceding checks succeed.

The evaluation output includes `compatibleEvidenceIds` and structured incompatibility reason codes. A high incompatible PASS remains visible but cannot become proof.

## Criterion hash

SHA-256 is computed over canonical JSON containing:

```text
criterionId
criterionVersion
subjectId
controlId
requiredBoundaryId
sorted acceptedEnvironmentClasses
minimumEvidenceLevel
independenceRequirement
```

Claim schema validation rejects a hash that does not match these semantics. Receipts bind to the version/hash. Changing control, boundary or another authoritative field changes the hash and invalidates old receipts even when `criterionId` is retained.

## Evidence level role

E0-E5 describe evidence/environment classes and provide a minimum constraint. They do not imply semantic subsumption. E5 can satisfy an E3 minimum only when the claim explicitly accepts the E5 environment and the receipt exactly matches the required subject, control and boundary.
