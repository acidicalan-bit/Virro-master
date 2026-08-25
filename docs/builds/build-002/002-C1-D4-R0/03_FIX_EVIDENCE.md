# Fix Evidence

The candidate adds one migration, a domain schema/hash model, a server-only
repository, a narrow application service, focused domain/static tests, and a
native PostgreSQL 17 boundary test. The native test dynamically applies all
35 migrations to a disposable database and checks that direct service-role
table writes, updates, and deletes fail while the RPC ACL is service-role-only.

The migration has no references that create `mutation_leases`,
`execution_runs`, `evidence_receipts`, or `state_commits`; the boundary test
asserts those counts remain zero.
