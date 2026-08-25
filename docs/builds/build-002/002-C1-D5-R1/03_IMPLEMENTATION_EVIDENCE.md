# BUILD 002-C1-D5-R1 Implementation Evidence

Migration: `20260825090000_build_002_c1_d5_r1_mutation_lease_freshness_semantic_binding.sql`

The migration renames the R0 issuer only to make it a private delegate and
recreates the public RPC with service-role-only execution. It takes share locks
on the authoritative field outcome, partial intent, and transaction patch
tables before checking exact semantic identity. It creates no execution,
receipt, verification, state-commit, asset-version, or provider side effect.
