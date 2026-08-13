# API governance baseline

The current Field Beta route is an internal/private, server-gated laboratory
surface, not a public API. It remains documented by its Zod request schemas and
does not claim a public support SLA.

Before any public/partner route is implemented, the API Design Gate is required:
resource hierarchy and lifecycle, dated `UDM-Api-Version`, authentication and
object authorization, tenant/owner authority, explicit writable fields,
idempotency identity, semantic request fingerprint, concurrency, pagination,
bounded resources/cost, stable machine errors, retries, retention and OpenAPI
contract tests. Public mutation requires `Idempotency-Key`; cursor pagination is
the default for growing collections. Client-provided tenant, acceptance,
verification or commit fields are never authority.

Current limitations are intentional: Field Beta has no complete public auth or
ownership binding, no public pagination contract, and no public partner version.
It must stay internal/controlled until those controls exist.
