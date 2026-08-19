# Requirement Compilation Boundary

## Current repository reality

`OutcomeBlueprint` and `publishOutcomeBlueprint` exist in
`src/domain/outcome/specification/outcome-blueprint.ts`. The
`InMemoryOutcomeBlueprintRegistry` is a test/domain registry. The deterministic
precision-edit compiler validates a supplied published Blueprint and derives a
TaskSpec, but no persistent Blueprint repository or canonical
OutcomeTransaction-to-Blueprint binding was found in the current routes,
repositories, or migrations.

BUILD002-B persists a caller-provided `SignalRequirement` after TypeScript hash
verification. That is an integrity boundary, not a source-of-truth compiler.

## Required C boundary

Before C implementation, architecture must identify an authoritative,
server-readable source that maps one OutcomeTransaction to one published
Blueprint/version/policy and compiles its exact SignalRequirement set. The
source must verify Blueprint status, version chain, hash, policy compatibility,
and transaction ownership. The client cannot submit an arbitrary requirement
set or replace its hash.

## Fail-closed cases

No binding, missing Blueprint, missing version, retired Blueprint, policy
mismatch, invalid hash, compiler unavailable, or compiler disagreement yields
no authoritative readiness persistence and an explicit non-READY reason.

## C5 resolution

The gap is resolved architecturally by introducing a separate immutable
`OutcomeRequirementProfile` bound to an exact published Blueprint version and
hash. The Profile is the canonical source for readiness requirements; the
Blueprint remains the product/capability contract. A transaction is bound to
one exact Profile through an immutable server-created binding.

This resolves the source hierarchy without pretending that the current
in-memory registry or BUILD002-B rows are production authority. C0 must add the
domain artifact and persistence described in documents 10-13 before HTTP
evaluation is authorized.

The original `C5 = UNKNOWN/BLOCKED` finding is preserved as historical context:
the current baseline still has no implementation of this source. The result is
now `C5_ARCHITECTURE = RESOLVED`, `C0 = PENDING`.
