# BUILD 001-F2 - Finding

## Baseline

`bc2cc7179979b4fccd892d265bedf8d7b3ab7bf1`

## Finding

`/api/precision-edit` has no authentication or `AuthorityContext`. In non-production, `INTERNAL_LEGACY_ROUTES_ENABLED=true` makes GET and all POST actions reachable. Client UUIDs are passed to `PreservationVerificationService`, which uses service-role repositories and Storage.

The service can create or mutate projects, assets, AssetVersions, OutcomeTransactions, intents, leases, execution runs, candidates, evidence, verification, preferences, StateCommits and asset head. `approvePreserved` performs version, head, StateCommit, candidate and transaction updates sequentially rather than through the canonical atomic RPC.

## Pre-patch reproduction

The actual route handler was invoked without authentication while the legacy flag was enabled:

- GET with a client-selected foreign transaction returned `200` and called `getExperiment(transactionId)`;
- POST `approvePreserved` returned `200` and called the commit-capable service;
- the existing fault matrix proved that a failure after transaction creation leaves that transaction and earlier project/asset/version writes present.

Result: `HIGH`. An environment gate was functioning as an authorization bypass switch.

## Scope

F2 closes only runtime reachability from the legacy precision-edit HTTP/UI surface. F3-F7 are not changed.
