# BUILD 002-C0-B Persistent Requirement Catalog

C0-B starts from verified C0-A R1 `32e60773ace2d30fff463650404282155a501586`
and is domain-plus-persistence only. The catalog is system/catalog owned; it
is not tenant scoped and contains no runtime Signals, secrets, or marketplace
data. No production bootstrap rows are created.

Two immutable catalogs are added:

- `public.outcome_blueprints`, addressed by `(id, version)` and uniquely
  identified by `(id, version, hash)`.
- `public.outcome_requirement_profiles`, addressed by `(id, version)` and
  bound through the exact composite foreign key
  `(blueprint_id, blueprint_version, blueprint_hash)`.

The TypeScript domain remains the semantic hash authority. The server-only
repository parses and verifies every Blueprint/Profile before publication and
verifies the persisted object after reads. A Profile read loads the exact
persisted Blueprint and re-checks the binding. PostgreSQL does not reimplement
`canonicalSha256()`.

Authoritative writes enter only through the two `SECURITY DEFINER` RPCs with a
fixed safe `search_path`. `anon`, `authenticated`, `PUBLIC`, and direct
`service_role` INSERT/UPDATE/DELETE are denied. PostgreSQL enforces published
status, contiguous immutable version lineage, exact Profile-to-Blueprint
binding, null policy, and one-winner uniqueness under concurrent publication.
Triggers reject UPDATE and DELETE for the table owner as well as production
roles.

JSONB definitions round-trip through the domain schemas without semantic drift;
`published_at` is normalized as a PostgreSQL `timestamptz` and remains outside
semantic hashes as defined by the domain. Native PostgreSQL 17 E3 tests cover
ACL, RPC boundaries, exact binding, lineage, immutability, JSON/timestamp
round-trip, and multi-session concurrency. PGlite is used only for structural
or existing regression tests, never as concurrency evidence.

C0-B does not add TransactionRequirementBinding, a runtime resolver, HTTP API,
readiness evaluation API, Signal ingestion, executor behavior, TaskSpec
changes, OutcomeBlueprint semantic changes, or BUILD002-A/B changes. C0-C is
the next phase and is intentionally not started here.
