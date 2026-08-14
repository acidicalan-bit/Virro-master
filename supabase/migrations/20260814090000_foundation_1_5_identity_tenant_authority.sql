-- FOUNDATION 1.5 Phase A: authenticated tenant authority.
-- Historical BUILD rows are not rewritten or assigned to real principals.

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('PERSONAL', 'ORGANIZATION')),
  personal_owner_principal_id uuid references auth.users(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'PERSONAL' and personal_owner_principal_id is not null) or (kind = 'ORGANIZATION' and personal_owner_principal_id is null))
);

alter table public.tenants add column if not exists personal_owner_principal_id uuid references auth.users(id) on delete restrict;
create unique index if not exists tenants_personal_owner_principal_idx on public.tenants(personal_owner_principal_id) where personal_owner_principal_id is not null;

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  principal_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('OWNER', 'MEMBER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (tenant_id, principal_id)
);

create index if not exists tenant_memberships_principal_tenant_status_idx
  on public.tenant_memberships(principal_id, tenant_id, status);

-- Canonical tenant ownership for new active Field Beta records. Existing text
-- tenant_id values remain historical compatibility data and are not authority.
alter table public.preservation_policy_versions add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.preservation_strategy_runs add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.field_outcomes add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.field_feedback add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.field_feedback add column if not exists recorded_by_principal_id uuid references auth.users(id) on delete restrict;
alter table public.field_regression_candidates add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.field_golden_cases add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.field_evaluation_samples add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.field_evaluation_judgments add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.verification_criterion_evidence add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;

create index if not exists field_outcomes_owner_tenant_created_idx on public.field_outcomes(owner_tenant_id, created_at desc);
create index if not exists field_feedback_owner_tenant_idx on public.field_feedback(owner_tenant_id, field_outcome_id);
create index if not exists criterion_evidence_owner_tenant_idx on public.verification_criterion_evidence(owner_tenant_id, transaction_id, created_at);

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
revoke all on table public.tenants, public.tenant_memberships from anon;
revoke all on table public.tenants, public.tenant_memberships from authenticated;
grant select on table public.tenants, public.tenant_memberships to authenticated;
grant select, insert, update, delete on table public.tenants, public.tenant_memberships to service_role;

create policy tenants_read_active_member on public.tenants
  for select to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = tenants.id
      and membership.principal_id = auth.uid()
      and membership.status = 'ACTIVE'
  ));

create policy memberships_read_self on public.tenant_memberships
  for select to authenticated
  using (principal_id = auth.uid());

-- Phase A application routes still use the privileged adapter while the full
-- Field Beta lineage is migrated. These policies are deny-by-default until
-- owner_tenant_id is populated by the authenticated path.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'preservation_policy_versions', 'preservation_strategy_runs', 'field_outcomes',
    'field_feedback', 'field_regression_candidates', 'field_golden_cases',
    'field_evaluation_samples', 'field_evaluation_judgments', 'verification_criterion_evidence'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_select', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (owner_tenant_id is not null and exists (select 1 from public.tenant_memberships m where m.tenant_id = owner_tenant_id and m.principal_id = auth.uid() and m.status = ''ACTIVE''))', table_name || '_tenant_select', table_name);
  end loop;
end $$;

create or replace function public.provision_personal_tenant(p_principal_id uuid)
returns table (
  tenant_id uuid,
  principal_id uuid,
  membership_id uuid,
  tenant_created_at timestamptz,
  tenant_updated_at timestamptz,
  membership_created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant public.tenants;
  v_membership public.tenant_memberships;
begin
  select t.* into v_tenant
  from public.tenants t
  join public.tenant_memberships m on m.tenant_id = t.id
  where m.principal_id = p_principal_id and m.role = 'OWNER' and m.status = 'ACTIVE' and t.kind = 'PERSONAL' and t.status = 'ACTIVE'
  order by t.created_at
  limit 1;
  if v_tenant.id is null then
    insert into public.tenants(kind, personal_owner_principal_id, status) values ('PERSONAL', p_principal_id, 'ACTIVE') returning * into v_tenant;
    insert into public.tenant_memberships(tenant_id, principal_id, role, status) values (v_tenant.id, p_principal_id, 'OWNER', 'ACTIVE') returning * into v_membership;
  else
    select m.* into v_membership from public.tenant_memberships m where m.tenant_id = v_tenant.id and m.principal_id = p_principal_id and m.status = 'ACTIVE' limit 1;
  end if;
  return query select v_tenant.id, p_principal_id, v_membership.id, v_tenant.created_at, v_tenant.updated_at, v_membership.created_at;
end;
$$;

revoke all on function public.provision_personal_tenant(uuid) from public, anon, authenticated;
grant execute on function public.provision_personal_tenant(uuid) to service_role;

create or replace function public.revoke_tenant_membership(p_membership_id uuid, p_actor_principal_id uuid)
returns table (id uuid, tenant_id uuid, principal_id uuid, role text, status text, created_at timestamptz, revoked_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query update public.tenant_memberships m
    set status = 'REVOKED', revoked_at = coalesce(m.revoked_at, now())
    where m.id = p_membership_id
      and exists (select 1 from public.tenant_memberships actor where actor.tenant_id = m.tenant_id and actor.principal_id = p_actor_principal_id and actor.role = 'OWNER' and actor.status = 'ACTIVE')
    returning m.id, m.tenant_id, m.principal_id, m.role, m.status, m.created_at, m.revoked_at;
end;
$$;

revoke all on function public.revoke_tenant_membership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_tenant_membership(uuid, uuid) to service_role;

comment on table public.tenants is 'Foundation 1.5 authority root. Lifecycle is independent from auth.users.';
comment on table public.tenant_memberships is 'Foundation 1.5 durable principal-to-tenant authority relation.';
comment on column public.tenant_memberships.principal_id is 'References auth.users with ON DELETE RESTRICT; deletion does not erase authority history.';
