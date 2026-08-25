# BUILD 002-C1-D5-R1 Freshness Boundary

The canonical lease remains append-only. `build002_validate_mutation_lease_row`
requires `valid_until > clock_timestamp()` and raises
`MUTATION_LEASE_EXPIRED` for an expired historical row. The public R1 RPC
validates an existing row before delegating to the private R0 issuer, so an
expired lease cannot be returned or reissued under the same D4 authority.

The repository readback query is scoped by both lease id and trusted
`ownerTenantId`, followed by strict parsing and content-hash verification.
