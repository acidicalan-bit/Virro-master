# BUILD 002-C1-D3-R2 evidence scope

This candidate is based directly on R1 final SHA
`669d5e8e9bd790299ba99b881b6879cf77d10779` and is limited to native evidence
and focused tests. No product source, migration, execution path, or provider
integration is changed.

The R2 native suite exercises both serialization directions for signal,
requirement, source-head, membership, and transaction-material mutations. It
records backend blocking through `pg_blocking_pids` and applies bounded
statement and lock timeouts. The same suite covers concurrent identical
admission, retry identity, ACL/RPC denial, binding attacks, forged material,
non-ready states, expiry, evaluator drift, and tenant/membership mismatches.

The focused unit suite proves that `admissionId` and `admittedAt` are excluded
from the content hash, `revalidatedAt` remains included, and persisted hash
readback fails closed when the database row is tampered with.

The R2 workflow runs native PostgreSQL 17, D0/D2 regressions, full Vitest,
TypeScript, ESLint, assurance checks, standalone build mode, Vercel build mode,
and exact-SHA container smoke. A local run without PostgreSQL 17 is not
concurrency evidence; the native gate must execute in the workflow service.

Vercel preview and public-surface checks remain external release evidence and
must be resolved against the final R2 SHA before a completion verdict is
claimed.
