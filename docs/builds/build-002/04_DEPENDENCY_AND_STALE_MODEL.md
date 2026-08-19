# Dependency Snapshot and Stale Model

## Material dependency set

The readiness evaluator snapshots only dependencies that can change the
qualification or execution meaning of this subject:

- `requirementDefinitionHash` (including blueprint/policy rule version);
- each bound Signal ID and content/source hash;
- `OutcomeBlueprint` ID/version/hash;
- `TaskSpec` ID/version/hash and compiler definition hash;
- `OutcomeTransaction` semantic input/partial-intent hash and subject version;
- source `AssetVersion` ID and state/media hash;
- authorized Context Lens ID/hash and effective policy version/hash;
- tenant/subject identity.

An `IntentContract` is included only if the implementation creates an exact
durable link from this transaction to that contract. The current Field Beta
path has no such link, so it is not silently claimed as a dependency.

## Canonical hash

`dependencyHash = SHA-256(canonicalJson(snapshot))`, where canonical JSON uses
sorted object keys, deterministic array ordering by stable ID, normalized UUIDs,
normalized hashes, and no timestamps, random IDs, or presentation fields.
The hash material includes the snapshot schema version. Requirement and
qualification hashes use the same canonicalization rules but have distinct
domain prefixes/schema versions.

## Material change rules

Any of the following makes a READY snapshot non-current:

- requirement/blueprint/policy/compiler hash changes;
- signal addition, replacement, removal, content/source hash change or expiry;
- source AssetVersion/head or transaction semantic input change;
- subject tenant/resource/spec binding change;
- authorized Context Lens or effective policy change;
- dependency snapshot schema/evaluator version change.

Non-material presentation metadata and timestamps do not invalidate a snapshot.

## Fail-closed invalidation

The server detects staleness in two places:

1. a read/evaluate operation recomputes the current dependency snapshot;
2. the execution gate recomputes it inside the authorization transaction.

The execution gate locks the `OutcomeTransaction` subject and all signal/dependency
rows that can change the snapshot, compares the exact hash, and inserts an
immutable readiness-execution reservation. Signal/dependency writes acquire the
same subject lock. A mismatch or expired snapshot rolls back the reservation
and denies execution.

Concurrent evaluations may create multiple immutable snapshots. Current
selection is deterministic: newest compatible snapshot by server sequence/time,
then UUID tie-breaker; execution still revalidates exact hashes and does not
trust selection alone.
