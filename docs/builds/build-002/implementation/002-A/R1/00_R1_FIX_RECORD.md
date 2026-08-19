# BUILD 002-A R1 — Exact Binding Corrective Fix

## Provenance

- Failed candidate preserved: `b0ce1831457ed191d34e6dfb2e829be01dc32ce0`
- Baseline main: `8e30b61b79b06194c2acad4c27671b05dfbaf25c`
- Branch: `build/build002-a-domain`
- R1 result SHA is the corrective commit containing this record.

## Confirmed findings

Independent verification confirmed: qualification reuse across changed snapshots; requirement and signal membership omissions; ignored dependency identities; contradictory readiness duplicate bindings; duplicate-qualification order dependence; foreign-signal silent filtering; false contradictions from provenance/source metadata; expired signals reaching READY; and empty requirement sets authorizing READY.

## Root cause

The original evaluator treated the supplied arrays as independently trusted collections. It filtered foreign signals, used a nullable-hash fallback for dependencies, did not compare qualification/dependency hashes during readiness aggregation, allowed duplicate keyed entities through Map last-write semantics, included provenance/source metadata in semantic contradiction values, and treated an empty requirement set as vacuously ready.

## Semantic correction

R1 makes one exact evidence universe authoritative. Dependency snapshots now bind requirement hashes, per-requirement signal references, and explicit dependency identity/hash bindings. Qualification requires exact requirement membership, exact per-requirement signal membership, matching tenant/transaction/requirement identity, exact dependency identity/hash, and non-expired signals. Readiness requires exact requirement/qualification bijection, exact qualification snapshot hashes, exact requirement-set equality with the dependency snapshot, validated top-level binding equality, and a non-empty requirement set. Contradiction compares canonical payload values only.

## Regression evidence

`tests/assurance/build002-a-signal-readiness.test.ts` now contains 62 tests, including the original 38 and permanent controls for all confirmed R1 attacks. The positive chain remains `READY` + `CURRENT` + delegable, and a changed dependency produces `STALE` and is not delegable.

## Scope

Only pure domain code, focused domain tests, and this R1 record changed. No database, migration, RLS, API, executor, Field Beta, TaskSpec, repository, package, or workflow changes were made.

Still unproven: database immutability, RLS, server-mediated API ownership, execution choke-point enforcement, TOCTOU linearization, and remote staging/provider behavior.
