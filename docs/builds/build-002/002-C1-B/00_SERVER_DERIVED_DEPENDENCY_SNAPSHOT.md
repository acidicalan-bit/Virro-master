# BUILD 002-C1-B Server-Derived Dependency Snapshot

BUILD 002-C1-B is a read-only second runtime slice. It resolves the current
dependency authority from persisted tenant-owned state and creates an
immutable in-memory `DependencySnapshot` with the existing frozen
`createDependencySnapshot()` constructor.

## Authority path

The server entry accepts only an authenticated `Request` and an
`outcomeTransactionId` locator. It resolves C0-D first, then constructs a
narrow tenant-scoped read bundle, resolves the complete C1-A Signal universe,
re-reads the transaction, asset, and source AssetVersion, and finally builds
the snapshot. Request, header, query, Signal, and historical hashes have no
authority.

## Current bindings

The snapshot binds:

- `blueprint` to the C0-D Blueprint hash;
- `transaction.semantic` to the explicit persisted transaction projection
  `build002-transaction-semantic-binding-v0.1`;
- `asset.version` to the persisted source version projection
  `build002-source-asset-version-binding-v0.1`.

Policy, TaskSpec, and Context Lens remain `null` because no current
authoritative source exists in this slice. Unknown dependency identities are
omitted rather than copied from Signals.

## Coherence and fail-closed rules

The transaction, asset, and version must belong to the C0-D tenant and form an
exact project/asset/version chain. The asset current head must be available
and equal to the transaction base version. A missing head returns
`SOURCE_ASSET_HEAD_UNAVAILABLE`; a changed head returns
`SOURCE_ASSET_HEAD_CHANGED`. Cross-requirement duplicate Signal IDs and any
requirement/universe mismatch fail closed.

Future, expired, contradictory, and zero-Signal requirements remain
represented. C1-B does not qualify Signals, evaluate Readiness, persist a
DependencySnapshot, mutate transaction status, ingest evidence, execute work,
or expose HTTP.

## Consistency boundary

This is a `NON_ATOMIC_CANDIDATE_SNAPSHOT`. C1-B does not claim whole-
evaluation transactional atomicity. A later C1-D revalidation is required
before authoritative persistence and is the owner of that atomicity claim.

## Native evidence

The C1-B native PostgreSQL 17 test applies all 29 migrations to a disposable
database, reads tenant-owned transaction/asset/version rows, invokes the
application resolver through narrow recording adapters, and verifies zero
canonical writes. The native test proves persisted-state semantics; the
application assurance tests prove production composition and authority order.
