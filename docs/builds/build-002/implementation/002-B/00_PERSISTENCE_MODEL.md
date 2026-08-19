# BUILD 002-B Persistence Model

## Baseline

- BUILD 002-A verified head: `17d5c50b93dca3148026978934b64370f2ca34e2`
- Protected-main merge: `f0183d272702fd5910be1d4f3ff93b8b69a2fc65`
- BUILD 002-B baseline commit: `f0183d272702fd5910be1d4f3ff93b8b69a2fc65`
- BUILD 002-B baseline tree: `b156c5c6c63224c9f5dd91c531cfce88007258a2`

## Conventions reused

- `PERSISTENCE_CONVENTION_REUSED`: `supabase/migrations/20260810000000_build_002_outcome_transaction_kernel.sql` and `src/infrastructure/persistence/outcome/supabase-outcome-repositories.ts`.
- `TENANT_ROOT_REUSED`: `tenants`, `tenant_memberships`, and the `owner_tenant_id` lineage added by BUILD 001.
- `RLS_PATTERN_REUSED`: ACTIVE membership joined to ACTIVE tenant and `auth.uid()` in tenant SELECT policies.
- `SERVICE_SCOPE_PATTERN_REUSED`: `requireTenantScope()` and `createTenantSupabaseRepositories(ownerTenantId)` from F5.

## Persisted objects

The additive migration `20260819120000_build_002_b_readiness_persistence.sql` persists immutable snapshots for `SignalRequirement`, `Signal`, `DependencySnapshot`, `SignalQualification`, and `DelegationReadiness`. No execution binding, API route, executor integration, TaskSpec mutation, or historical backfill is introduced.

Every row has `owner_tenant_id` and `outcome_transaction_id`. Child link tables repeat both values and use composite foreign keys. JSONB stores domain material that does not provide additional trust when decomposed; security-sensitive subject and lineage fields remain relational.

The repository surface is deliberately narrow: `Build002PersistenceRepository` exposes insert and tenant/transaction-scoped reads only. Hash validation is delegated to the verified BUILD 002-A domain functions before insert.

