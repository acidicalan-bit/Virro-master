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

## Gate status

`C5 = UNKNOWN/BLOCKED`. This is the current stop condition for BUILD002-C.
No implementation may proceed until the source is resolved and documented.
