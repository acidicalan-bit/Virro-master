# BUILD 002-C1-D3-R3 retry admissibility repair

R3 is a forward-only repair based directly on R2 defect SHA
`46c13bda83b7743bf11412e9005e2c374c7b88d2`.

The R1 wrapper could return an existing admission before validating the new
admission envelope. R3 validates the complete envelope, the serialized
revalidation time, and the current tenant, membership, graph, and evaluator
state before querying or returning an existing row. Existing rows are checked
for internal canonical fields before reuse; the TypeScript repository remains
responsible for schema parsing and content-hash verification.

The migration is forward-only:
`20260823110000_build_002_c1_d3_r3_retry_admissibility.sql`.
The R0 and R1 migrations are unchanged. No execution, provider, D4, or
verifier path is introduced.

R3 also isolates native race fixtures, rolls back expected SQL errors before
reuse, and uses unique IDs for independent requirement races. PostgreSQL 17
CI is the authoritative concurrency environment; a local run without native
PostgreSQL is not concurrency evidence.
