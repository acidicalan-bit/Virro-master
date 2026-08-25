# Fix Evidence

The R1 assurance test covers the cross-runtime canonical contract, identity
binding markers, current semantic rechecks, retry ordering, direct-write ACL
boundary and consequence-free scope. The native PostgreSQL suite is configured
for PostgreSQL 17 and migration replay count 36; this local worktree has no
PostgreSQL/Docker runtime, so native execution remains a CI gate rather than a
locally claimed result.

The R0 migration is intentionally unchanged. No remote production database or
credentials are used.
