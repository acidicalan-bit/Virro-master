# BUILD 002-C0-E Composed Authority Proof

## Scope

C0-E is evidence infrastructure only. It proves that the already-frozen C0-A,
C0-B, C0-C, and C0-D authority contracts compose over one fresh PostgreSQL 17
database. It adds no runtime feature, migration, RPC, route, readiness
evaluation, signal ingestion, or execution behavior.

## Composed path

`principal -> TenantAuthorityService -> AuthorityContext -> tenant-owned OutcomeTransaction -> immutable TransactionRequirementBinding -> persisted Blueprint/Profile catalog -> OutcomeRequirementAuthorityResolver -> compileSignalRequirements`

The native test creates a disposable database, applies all repository migrations
once in lexical order, publishes Blueprint/Profile through the C0-B RPCs, and
publishes the transaction binding through the C0-C RPC. Native PostgreSQL
adapters are test-harness implementations of existing repository interfaces;
they are not evidence of Supabase transport semantics. C0-B and C0-C transport
semantics remain covered by their frozen E2/E3 evidence.

## Proven by C0-E

- active authenticated tenant authority composes with persisted tenant-owned transaction state;
- transaction reads are scoped by the trusted tenant id;
- the exact persisted binding, Blueprint, Profile, hashes, status, null policy,
  and Profile-to-Blueprint address compose into a non-empty canonical
  `SignalRequirement[]`;
- caller `raw_request`, TaskSpec-like material, and caller requirements cannot
  replace missing persisted authority;
- foreign tenant transactions, missing bindings, membership failures, catalog
  tampering, and cross-tenant concurrent reads fail closed;
- two trusted server timestamps change only `createdAt`/`resolvedAt`, not
  requirement identity or definition hashes;
- concurrent resolutions are read-only, tenant-scoped, and produce identical
  requirement identities and hashes;
- no signal, qualification, readiness, execution, lease, StateCommit, or
  transaction-status writes occur during resolution.

## Relied on from frozen layers

- C0-A owns RequirementProfile semantics and `compileSignalRequirements`.
- C0-B owns immutable Blueprint/Profile persistence and publication RPCs.
- C0-C owns immutable transaction-to-catalog binding persistence and binding RPC.
- C0-D owns server authentication ordering and rejection of caller tenant hints.

C0-E does not duplicate those transport proofs and does not introduce a second
authority implementation.

## Revocation window

`AUTHORITY_REVOCATION_WINDOW = CURRENT_REQUEST_AUTHORITY_SNAPSHOT`.

Membership and tenant status are required to be active when
`TenantAuthorityService` resolves the `AuthorityContext`. C0-E does not claim
instantaneous cancellation of an already-issued, in-flight read-only snapshot.

## Explicit non-claims

C0-E does not establish readiness, qualification, delegation, execution,
provider access, signal persistence, or an HTTP API. The next phase requires a
new explicit build order from the resulting candidate state.
