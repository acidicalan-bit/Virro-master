# BUILD 002-B R1 Atomic Persistence Boundary

Migration `20260819123000_build_002_b_r1_atomic_lineage.sql` adds three narrow `SECURITY INVOKER` functions with explicit `search_path = public`:

- `build002_insert_dependency_snapshot(jsonb)`
- `build002_insert_signal_qualification(jsonb, uuid)`
- `build002_insert_delegation_readiness(jsonb, uuid, jsonb)`

Each inserts the immutable parent and derives/inserts its relational links in one PostgreSQL transaction. Any child foreign-key failure aborts the function transaction; no compensation DELETE is used. EXECUTE is revoked from PUBLIC, anon, and authenticated, and granted only to `service_role`.

The repository calls these RPCs instead of separate parent/link inserts. Readiness binding is checked in the trusted repository before RPC: each qualification is loaded within tenant/transaction scope, hash-verified, dependency-matched, and used to recompute the BUILD002-A requirement and qualification set hashes.

This is persistence atomicity only. It does not reserve execution, create an execution binding, or alter API semantics.

