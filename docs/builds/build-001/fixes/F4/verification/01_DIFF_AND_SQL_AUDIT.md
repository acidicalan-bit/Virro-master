# BUILD 001-F4 Diff and SQL Audit

## Repository identity

The verification started at `fe10cbf0ab96d20bfe8cbac8a006a13e8af1cf77`, whose parent is exactly `fb375edd80e89f6146cb10db77da151ef1000d49`. The starting worktree was clean.

## Candidate diff

The candidate delta from the required baseline contains only:

- one F4 migration: `supabase/migrations/20260816090000_build_001_f4_owner_revocation_toctou.sql`;
- F4 implementation documentation;
- focused F1 and trust-foundation test updates.

There are no application source changes, dependency changes, package changes, or migrations outside the F4 migration. `git diff --check` is clean.

## Migration order

The relevant tail is:

1. `20260814090000_foundation_1_5_identity_tenant_authority.sql`
2. `20260814203203_phase_b_build_001_tenant_authority_envelope_core_lineage.sql`
3. `20260814221620_phase_b_build_001_tenant_lifecycle_rls_coherence.sql`
4. `20260815030000_build_001_trust_foundation_atomic_commit.sql`
5. `20260815040000_build_001_f1_canonical_candidate_immutability.sql`
6. `20260816090000_build_001_f4_owner_revocation_toctou.sql`

## SQL observations

The F4 migration renames the original RPC to an unlocked private delegate, creates a `SECURITY DEFINER` wrapper with an empty search path, derives `actor` from `auth.uid()`, locks the active tenant row with `FOR UPDATE`, locks the actor and acceptance principal's active OWNER memberships in deterministic membership-id order, rejects missing/revoked authority, then delegates while those row locks remain held. The old delegate is revoked from public and authenticated callers; the wrapper is granted only to authenticated callers.

The original F1 membership check is an unlocked inline existence check, but the F4 wrapper holds the tenant and membership locks before invoking it. This is the intended protection against the owner-revocation TOCTOU.

The complete 21-migration sequence was applied successfully to the disposable Supabase project `exgbzdiebhcfjurpowel`. The live PostgreSQL catalog exposed the F4 wrapper and the renamed delegate with the expected grants; no migration error remained.

## Audit classification

- SQL design and migration ordering: `PROVEN` by repository inspection.
- Runtime lock serialization and atomicity: `PROVEN` by the two-session Supabase run documented in `03_CONCURRENCY_VALIDATION.md`.
