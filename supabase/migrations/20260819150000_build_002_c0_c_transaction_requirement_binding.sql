-- BUILD 002-C0-C: immutable transaction-to-catalog authority binding.
-- The binding is append-only. Semantic hashes remain domain-owned; PostgreSQL
-- owns relational identity, tenant ownership, and the single write boundary.

create table if not exists public.outcome_transaction_requirement_bindings (
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  outcome_transaction_id uuid not null,
  blueprint_id uuid not null,
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_hash text not null check (blueprint_hash ~ '^[0-9a-fA-F]{64}$'),
  requirement_profile_id uuid not null,
  requirement_profile_version integer not null check (requirement_profile_version > 0),
  requirement_profile_hash text not null check (requirement_profile_hash ~ '^[0-9a-fA-F]{64}$'),
  policy_id text,
  policy_hash text check (policy_hash is null or policy_hash ~ '^[0-9a-fA-F]{64}$'),
  schema_version text not null check (schema_version = 'outcome-transaction-requirement-binding-v0.1'),
  binding_hash text not null check (binding_hash ~ '^[0-9a-fA-F]{64}$'),
  bound_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (owner_tenant_id, outcome_transaction_id),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict,
  foreign key (blueprint_id, blueprint_version, blueprint_hash)
    references public.outcome_blueprints(id, version, hash) on delete restrict,
  foreign key (requirement_profile_id, requirement_profile_version, requirement_profile_hash)
    references public.outcome_requirement_profiles(id, version, hash) on delete restrict,
  constraint outcome_transaction_requirement_bindings_policy_null
    check (policy_id is null and policy_hash is null)
);

create or replace function public.build002_binding_tenant_transaction_guard()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare v_transaction_tenant uuid;
begin
  select owner_tenant_id into v_transaction_tenant
  from public.outcome_transactions
  where id = new.outcome_transaction_id;
  if v_transaction_tenant is null or v_transaction_tenant is distinct from new.owner_tenant_id then
    raise exception 'BUILD002_BINDING_TRANSACTION_TENANT_MISMATCH' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.build002_binding_profile_blueprint_guard()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare v_blueprint_id uuid; v_blueprint_version integer; v_blueprint_hash text;
begin
  select blueprint_id, blueprint_version, blueprint_hash
    into v_blueprint_id, v_blueprint_version, v_blueprint_hash
  from public.outcome_requirement_profiles
  where id = new.requirement_profile_id
    and version = new.requirement_profile_version
    and hash = new.requirement_profile_hash;
  if v_blueprint_id is null
    or v_blueprint_id is distinct from new.blueprint_id
    or v_blueprint_version is distinct from new.blueprint_version
    or v_blueprint_hash is distinct from new.blueprint_hash then
    raise exception 'BUILD002_BINDING_PROFILE_BLUEPRINT_MISMATCH' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.build002_binding_immutable()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'BUILD002_BINDING_IMMUTABLE_%', tg_op using errcode = '55000';
end;
$$;

drop trigger if exists outcome_transaction_requirement_bindings_tenant_guard on public.outcome_transaction_requirement_bindings;
create trigger outcome_transaction_requirement_bindings_tenant_guard
before insert on public.outcome_transaction_requirement_bindings
for each row execute function public.build002_binding_tenant_transaction_guard();

drop trigger if exists outcome_transaction_requirement_bindings_profile_guard on public.outcome_transaction_requirement_bindings;
create trigger outcome_transaction_requirement_bindings_profile_guard
before insert on public.outcome_transaction_requirement_bindings
for each row execute function public.build002_binding_profile_blueprint_guard();

drop trigger if exists outcome_transaction_requirement_bindings_immutable on public.outcome_transaction_requirement_bindings;
create trigger outcome_transaction_requirement_bindings_immutable
before update or delete on public.outcome_transaction_requirement_bindings
for each row execute function public.build002_binding_immutable();

create or replace function public.build002_bind_outcome_transaction_requirements(p_binding jsonb)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_transaction_id uuid := (p_binding->>'outcome_transaction_id')::uuid;
begin
  if p_binding is null or jsonb_typeof(p_binding) <> 'object'
    or p_binding->>'schema_version' <> 'outcome-transaction-requirement-binding-v0.1' then
    raise exception 'BUILD002_BINDING_INVALID_PAYLOAD';
  end if;
  if p_binding->>'policy_id' is not null or p_binding->>'policy_hash' is not null then
    raise exception 'BUILD002_BINDING_POLICY_MUST_BE_NULL';
  end if;
  insert into public.outcome_transaction_requirement_bindings(
    owner_tenant_id, outcome_transaction_id,
    blueprint_id, blueprint_version, blueprint_hash,
    requirement_profile_id, requirement_profile_version, requirement_profile_hash,
    policy_id, policy_hash, schema_version, binding_hash, bound_at
  ) values (
    (p_binding->>'owner_tenant_id')::uuid, v_transaction_id,
    (p_binding->>'blueprint_id')::uuid, (p_binding->>'blueprint_version')::integer, p_binding->>'blueprint_hash',
    (p_binding->>'requirement_profile_id')::uuid, (p_binding->>'requirement_profile_version')::integer, p_binding->>'requirement_profile_hash',
    null, null, p_binding->>'schema_version', p_binding->>'binding_hash', (p_binding->>'bound_at')::timestamptz
  );
  return v_transaction_id;
end;
$$;

alter table public.outcome_transaction_requirement_bindings enable row level security;
revoke all on table public.outcome_transaction_requirement_bindings from public, anon, authenticated, service_role;
grant select on table public.outcome_transaction_requirement_bindings to service_role;
revoke execute on function public.build002_bind_outcome_transaction_requirements(jsonb) from public, anon, authenticated;
grant execute on function public.build002_bind_outcome_transaction_requirements(jsonb) to service_role;

comment on table public.outcome_transaction_requirement_bindings is 'BUILD 002-C0-C immutable tenant-scoped binding from an outcome transaction to exact published Blueprint and Requirement Profile.';
comment on column public.outcome_transaction_requirement_bindings.binding_hash is 'Domain canonical hash of all binding definition fields except bound_at and binding_hash.';
