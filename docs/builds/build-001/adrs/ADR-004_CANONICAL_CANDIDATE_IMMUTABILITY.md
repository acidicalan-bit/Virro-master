# ADR-004: Canonical Candidate Immutability

## Status

Accepted for BUILD 001-F1.

## Decision

Canonical `candidate_assets` rows are immutable artifacts. Their content, lineage and legacy `committed` flag are not changed by canonical finalization. The canonical state transition is represented only by the repository-native tuple:

`immutable AssetVersion + assets.current_version_id + StateCommit + outcome transaction COMMITTED`.

## Rationale

This tuple already provides versioned content, current-state selection, durable transition evidence, stale-head protection and idempotency. Updating `candidate_assets.committed` duplicates state and conflicts with the candidate immutability boundary.

## Rejected alternative

A special-case false-to-true candidate UPDATE was rejected because it weakens a whole-row immutable artifact and retains two sources of canonical truth.
