# BUILD 001-F4 Finding

## Baseline

- Baseline SHA: `fb375edd80e89f6146cb10db77da151ef1000d49`
- Branch: `codex/build001-f4`
- Worktree: `C:/Users/alan-/OneDrive/Documentos/Codex/virro-build001-f4`
- F7 verified state is an ancestor and was not rebased or merged.

## Root Cause

The original `commit_accepted_field_outcome(uuid)` checked `auth.uid()`
against an ACTIVE OWNER membership and then acquired the asset row lock. The
membership row was not locked. A revocation could therefore commit after the
authorization read and before the canonical mutation reached its existing
asset lock. A cached `AuthorityContext`, `ExecutionAuthority` or
`MutationLease` could not be allowed to extend that authority.

The authoritative owner source is `tenant_memberships` joined to an ACTIVE
`tenants` row. The canonical RPC, not the application context, is the final
authority boundary.

## Scope

F4 changes only the canonical commit migration and focused regression/security
tests, plus this documentation. F1, F2 and F7 remain in scope for regression;
F3, F5, F6, BUILD 002 and remote E4 remain untouched.
