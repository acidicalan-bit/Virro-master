# D5-R0 Contract

`Build002MutationLease` is a short-lived (`<= 5 minutes`) immutable authority
record with `scope=MUTATION_LEASE_ONLY`, `executionStarted=false`, and
`consequenceBoundary=FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED`.

The content hash uses the repository canonical JSON/SHA-256 implementation and
excludes only `mutationLeaseId`, `grantedAt`, and
`mutationLeaseContentHash`. All graph identity, currentness, path, category,
and revalidation fields are hashed.
