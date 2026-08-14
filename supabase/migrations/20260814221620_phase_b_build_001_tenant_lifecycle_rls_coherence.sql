-- Foundation 1.5 Phase B / Build 001 security repair
-- Keep tenant-owned RLS coherent with application AuthorityContext lifecycle:
-- an ACTIVE membership is insufficient when its tenant is SUSPENDED or REVOKED.
-- This migration changes policies only; it does not backfill or rewrite data.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects',
    'assets',
    'asset_versions',
    'outcome_transactions',
    'preservation_policy_versions',
    'preservation_strategy_runs',
    'field_outcomes',
    'field_feedback',
    'field_regression_candidates',
    'field_golden_cases',
    'field_evaluation_samples',
    'field_evaluation_judgments',
    'verification_criterion_evidence'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_select', table_name);
    execute format($policy$
      create policy %I on public.%I
        for select to authenticated
        using (
          owner_tenant_id is not null
          and exists (
            select 1
            from public.tenant_memberships m
            join public.tenants t on t.id = m.tenant_id
            where m.tenant_id = %I.owner_tenant_id
              and m.principal_id = auth.uid()
              and m.status = 'ACTIVE'
              and t.status = 'ACTIVE'
          )
        )
    $policy$, table_name || '_tenant_select', table_name, table_name);
  end loop;

  foreach table_name in array array['projects', 'assets', 'asset_versions', 'outcome_transactions'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_insert', table_name);
    execute format($policy$
      create policy %I on public.%I
        for insert to authenticated
        with check (
          owner_tenant_id is not null
          and exists (
            select 1
            from public.tenant_memberships m
            join public.tenants t on t.id = m.tenant_id
            where m.tenant_id = %I.owner_tenant_id
              and m.principal_id = auth.uid()
              and m.status = 'ACTIVE'
              and t.status = 'ACTIVE'
          )
        )
    $policy$, table_name || '_tenant_insert', table_name, table_name);
  end loop;

  drop policy if exists assets_tenant_update on public.assets;
  create policy assets_tenant_update on public.assets
    for update to authenticated
    using (
      owner_tenant_id is not null
      and exists (
        select 1
        from public.tenant_memberships m
        join public.tenants t on t.id = m.tenant_id
        where m.tenant_id = assets.owner_tenant_id
          and m.principal_id = auth.uid()
          and m.status = 'ACTIVE'
          and t.status = 'ACTIVE'
      )
    )
    with check (
      owner_tenant_id is not null
      and exists (
        select 1
        from public.tenant_memberships m
        join public.tenants t on t.id = m.tenant_id
        where m.tenant_id = assets.owner_tenant_id
          and m.principal_id = auth.uid()
          and m.status = 'ACTIVE'
          and t.status = 'ACTIVE'
      )
    );
end $$;

comment on policy projects_tenant_select on public.projects is
  'Authenticated reads require matching ACTIVE tenant and ACTIVE membership.';
comment on policy assets_tenant_select on public.assets is
  'Authenticated reads require matching ACTIVE tenant and ACTIVE membership.';
comment on policy asset_versions_tenant_select on public.asset_versions is
  'Authenticated reads require matching ACTIVE tenant and ACTIVE membership.';
comment on policy outcome_transactions_tenant_select on public.outcome_transactions is
  'Authenticated reads require matching ACTIVE tenant and ACTIVE membership.';
