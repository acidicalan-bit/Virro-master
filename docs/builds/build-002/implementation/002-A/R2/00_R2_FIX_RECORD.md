# BUILD 002-A R2 Fix Record

## Scope

R2 is a pure-domain correction for the failed R1 candidate. It changes only
signal qualification, dependency snapshots, delegation readiness, focused
assurance tests, and this record. No database, API, executor, TaskSpec,
BUILD 001, or runtime behavior is changed.

## Ancestry and findings

- R1 failed SHA: `3b6e5f81115d0420b3f0bb7f80b83bcce1ed47d9`
- Original failed SHA retained in ancestry: `b0ce1831457ed191d34e6dfb2e829be01dc32ce0`
- Corrected findings: A7 requirement blueprint/policy binding, A8 canonical
  dependency consistency, A9 readiness validity integrity, A10 supporting
  signal expiry propagation, and A11 qualification temporal coherence.

## Dependency source of truth

`dependencyBindings` is the canonical dependency map. Stable BUILD 002
identities are exported for source asset version, transaction semantic,
blueprint, policy, TaskSpec, and context lens. Existing named snapshot hashes
are validated projections: a non-null projection requires the matching
canonical binding, and a canonical binding requires the same projection.
Conflicting or incomplete snapshots fail during construction and cannot obtain
a cryptographically valid snapshot hash.

Requirement blueprint and policy hashes must exactly equal the snapshot
projections during both qualification and readiness aggregation.

## Temporal model

Each authoritative qualification has one evaluation time. `qualifiedAt` is
derived from it and cannot be caller-selected. `evidenceValidUntil` is derived
from the earliest non-null expiry among the exact supporting signals and is
hash-bound.

Readiness derives `createdAt` from one evaluation time and derives
`validUntil` from the earliest evidence horizon of critical qualified
requirements. A qualification whose horizon has ended at readiness evaluation
time cannot produce a current READY assessment. Historical qualifications are
not mutated; later validity checks return EXPIRED and delegation is denied.

`validUntil` is included in readiness semantic hash material. Only `id` and
`createdAt` remain audit metadata excluded from that hash.

## Hash-version decision

The dependency snapshot, qualification, and readiness schema versions are
incremented to `v0.2` because their semantic hash material changed. This
repository has no deployed BUILD 002-A persistence compatibility requirement.

## Regression evidence

The focused BUILD 002-A suite contains 80 tests, including the preserved
A1-A6 matrix and R2 tests for A7-A11, canonical projection contradictions,
temporal derivation, tamper resistance, expiry propagation, and positive
READY/CURRENT controls.

## R2 result

The implementation candidate is the normal descendant commit created for this
work. Independent verification remains required before any merge or release.

## Still unproven

This fix does not establish database persistence semantics, remote provider
behavior, API authorization, or BUILD 002-B policy semantics. Those remain
outside BUILD 002-A R2 scope.
