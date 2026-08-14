-- Foundation 1.5 Phase B / Build 001
-- Canonical tenant ownership for the core outcome lineage. Historical rows are
-- intentionally left nullable and classified HISTORICAL/UNKNOWN; they are
-- never silently backfilled.

alter table public.projects add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.assets add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.asset_versions add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.outcome_transactions add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;

create index if not exists projects_owner_tenant_idx on public.projects(owner_tenant_id, created_at desc);
create index if not exists assets_owner_tenant_idx on public.assets(owner_tenant_id, project_id, created_at desc);
create index if not exists asset_versions_owner_tenant_idx on public.asset_versions(owner_tenant_id, asset_id, version_number desc);
create index if not exists outcome_transactions_owner_tenant_idx on public.outcome_transactions(owner_tenant_id, created_at desc);

create or replace function public.enforce_core_lineage_tenant_consistency()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare parent_owner uuid;
begin
  -- Existing historical rows remain compatible; every new canonical row must
  -- carry an owner and cannot be reassigned after ownership is proven.
  if tg_op = 'INSERT' and new.owner_tenant_id is null then
    raise exception 'CORE_LINEAGE_OWNER_REQUIRED';
  end if;
  if tg_op = 'UPDATE' and old.owner_tenant_id is not null and new.owner_tenant_id is distinct from old.owner_tenant_id then
    raise exception 'CORE_LINEAGE_OWNER_IMMUTABLE';
  end if;
  if new.owner_tenant_id is null then
    return new;
  end if;

  if tg_table_name = 'assets' then
    select owner_tenant_id into parent_owner from public.projects where id = new.project_id;
  elsif tg_table_name = 'asset_versions' then
    select owner_tenant_id into parent_owner from public.assets where id = new.asset_id;
  elsif tg_table_name = 'outcome_transactions' then
    select owner_tenant_id into parent_owner from public.projects where id = new.project_id;
    if parent_owner is distinct from new.owner_tenant_id then
      raise exception 'CORE_LINEAGE_PROJECT_TENANT_MISMATCH';
    end if;
    select owner_tenant_id into parent_owner from public.assets where id = new.asset_id;
    if parent_owner is distinct from new.owner_tenant_id then
      raise exception 'CORE_LINEAGE_ASSET_TENANT_MISMATCH';
    end if;
    select owner_tenant_id into parent_owner from public.asset_versions where id = new.base_version_id;
    if parent_owner is distinct from new.owner_tenant_id then
      raise exception 'CORE_LINEAGE_VERSION_TENANT_MISMATCH';
    end if;
    return new;
  else
    return new;
  end if;

  if parent_owner is distinct from new.owner_tenant_id then
    raise exception 'CORE_LINEAGE_PARENT_TENANT_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_core_lineage_tenant_guard on public.projects;
create trigger projects_core_lineage_tenant_guard before insert or update on public.projects for each row execute function public.enforce_core_lineage_tenant_consistency();
drop trigger if exists assets_core_lineage_tenant_guard on public.assets;
create trigger assets_core_lineage_tenant_guard before insert or update on public.assets for each row execute function public.enforce_core_lineage_tenant_consistency();
drop trigger if exists asset_versions_core_lineage_tenant_guard on public.asset_versions;
create trigger asset_versions_core_lineage_tenant_guard before insert or update on public.asset_versions for each row execute function public.enforce_core_lineage_tenant_consistency();
drop trigger if exists outcome_transactions_core_lineage_tenant_guard on public.outcome_transactions;
create trigger outcome_transactions_core_lineage_tenant_guard before insert or update on public.outcome_transactions for each row execute function public.enforce_core_lineage_tenant_consistency();

alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.outcome_transactions enable row level security;

revoke all on table public.projects, public.assets, public.asset_versions, public.outcome_transactions from anon;
grant select, insert on table public.projects, public.assets, public.asset_versions, public.outcome_transactions to authenticated;
grant update on table public.assets to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['projects', 'assets', 'asset_versions', 'outcome_transactions'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_update', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (owner_tenant_id is not null and exists (select 1 from public.tenant_memberships m where m.tenant_id = owner_tenant_id and m.principal_id = auth.uid() and m.status = ''ACTIVE''))', table_name || '_tenant_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (owner_tenant_id is not null and exists (select 1 from public.tenant_memberships m where m.tenant_id = owner_tenant_id and m.principal_id = auth.uid() and m.status = ''ACTIVE''))', table_name || '_tenant_insert', table_name);
  end loop;
  execute 'create policy assets_tenant_update on public.assets for update to authenticated using (owner_tenant_id is not null and exists (select 1 from public.tenant_memberships m where m.tenant_id = owner_tenant_id and m.principal_id = auth.uid() and m.status = ''ACTIVE'')) with check (owner_tenant_id is not null and exists (select 1 from public.tenant_memberships m where m.tenant_id = owner_tenant_id and m.principal_id = auth.uid() and m.status = ''ACTIVE''))';
end $$;

comment on column public.projects.owner_tenant_id is 'Canonical Build 001 tenant owner; NULL means historical ownership is not proven.';
comment on column public.assets.owner_tenant_id is 'Canonical Build 001 tenant owner; NULL means historical ownership is not proven.';
comment on column public.asset_versions.owner_tenant_id is 'Canonical Build 001 tenant owner; NULL means historical ownership is not proven.';
comment on column public.outcome_transactions.owner_tenant_id is 'Canonical Build 001 tenant owner; NULL means historical ownership is not proven.';


