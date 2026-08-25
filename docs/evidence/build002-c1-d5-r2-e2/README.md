# BUILD 002-C1-D5-R2-E2

This evidence branch reproduces the authored D5-R2 contract against fresh,
disposable PostgreSQL 17 databases. It runs the same semantic fixture twice:

- exact R1 migration set: the critical `true` mutation is rejected;
- exact R2 migration set: critical `true` and `false` exact mutations are
  both authorized, while unknown and missing values remain denied.

The harness also measures the canonical RPC/table ACL, PostgreSQL/TypeScript
hash agreement, and consequence-table deltas. It is evidence-only: no source,
application, package, migration, Docker, or production configuration files are
changed by this branch.

The branch is not a product promotion and is not merge-authorized.
