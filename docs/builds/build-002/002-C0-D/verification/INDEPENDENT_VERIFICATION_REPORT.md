# BUILD 002-C0-D Independent Verification

## Scope

This report records independent verification of the exact product candidate `cd488bd09699cdd63de096240bc1775f9793cca4`. The verifier is based directly on that SHA and does not import or invoke the authored C0-D tests.

The verifier uses separately constructed tenant, transaction, binding, Blueprint, Profile, clock, and repository fixtures. It exercises the production server boundary and application resolver, including adversarial mutations and read-only spies.

## Required Claims

- Server authority is derived from Supabase-validated principal and the existing `TenantAuthorityService`; query and header tenant selectors are ignored.
- Privileged tenant repositories are constructed only after successful active tenant authority.
- Zero, revoked, suspended, and ambiguous memberships fail closed.
- Only a tenant-scoped transaction, exact immutable C0-C binding, exact persisted published Blueprint, exact persisted published RequirementProfile, and matching Profile-to-Blueprint tuple can compile requirements.
- Caller raw request material, TaskSpec-like input requirements, caller Blueprint/Profile objects, and caller timestamps have zero authority.
- Compilation reuses `compileSignalRequirements`; timestamps are server-derived and do not alter requirement definition hashes.
- Repository and catalog failures converge to bounded `REQUIREMENT_AUTHORITY_NOT_FOUND` for unauthorized resource cases.
- The returned result is deeply immutable and resolution performs reads only.
- No HTTP route, migration, readiness evaluation, signal ingestion, execution, or C0-E artifact is introduced.

## Evidence

The dedicated workflow runs the independent verifier, PostgreSQL 17 BUILD002-B/C0-C controls, SQL, assurance, model, application, full Vitest, TypeScript, ESLint, assurance manifest, and production build. It uses no external secrets, provider keys, or Supabase production/staging targets.

Final run identifiers and counts are recorded in the verification response after the workflow completes.
