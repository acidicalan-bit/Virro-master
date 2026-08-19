-- BUILD 002-C0-B: immutable system-owned Blueprint/Profile catalogs.
-- Semantic hashes are verified by the server domain before these RPCs are
-- called. PostgreSQL enforces address, lineage, exact binding and ACL.

create table if not exists public.outcome_blueprints (
  id uuid not null,
  version integer not null check (version > 0),
  hash text not null check (hash ~ '^[0-9a-fA-F]{64}$'),
  previous_version_hash text check (previous_version_hash is null or previous_version_hash ~ '^[0-9a-fA-F]{64}$'),
  status text not null check (status = 'PUBLISHED'),
  published_at timestamptz not null,
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_at timestamptz not null default now(),
  primary key (id, version),
  unique (id, version, hash)
);

create table if not exists public.outcome_requirement_profiles (
  id uuid not null,
  version integer not null check (version > 0),
  hash text not null check (hash ~ '^[0-9a-fA-F]{64}$'),
  previous_version_hash text check (previous_version_hash is null or previous_version_hash ~ '^[0-9a-fA-F]{64}$'),
  blueprint_id uuid not null,
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_hash text not null check (blueprint_hash ~ '^[0-9a-fA-F]{64}$'),
  policy_id text,
  policy_hash text,
  status text not null check (status = 'PUBLISHED'),
  published_at timestamptz not null,
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_at timestamptz not null default now(),
  primary key (id, version),
  unique (id, version, hash),
  foreign key (blueprint_id, blueprint_version, blueprint_hash)
    references public.outcome_blueprints(id, version, hash)
    on delete restrict
);

create or replace function public.build002_catalog_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'BUILD002_CATALOG_IMMUTABLE_%', tg_op using errcode = '55000';
end;
$$;

drop trigger if exists outcome_blueprints_immutable on public.outcome_blueprints;
create trigger outcome_blueprints_immutable
before update or delete on public.outcome_blueprints
for each row execute function public.build002_catalog_immutable();

drop trigger if exists outcome_requirement_profiles_immutable on public.outcome_requirement_profiles;
create trigger outcome_requirement_profiles_immutable
before update or delete on public.outcome_requirement_profiles
for each row execute function public.build002_catalog_immutable();

create or replace function public.build002_publish_outcome_blueprint(p_blueprint jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := (p_blueprint->>'id')::uuid;
  v_version integer := (p_blueprint->>'version')::integer;
  v_hash text := p_blueprint->>'hash';
  v_previous_hash text := nullif(p_blueprint->>'previousVersionHash', '');
  v_status text := p_blueprint->>'status';
  v_published_at timestamptz := (p_blueprint->>'publishedAt')::timestamptz;
  v_definition jsonb := p_blueprint->'definition';
begin
  if v_status <> 'PUBLISHED' or v_definition is null or jsonb_typeof(v_definition) <> 'object' then
    raise exception 'BUILD002_BLUEPRINT_NOT_PUBLISHED';
  end if;
  if v_version = 1 and v_previous_hash is not null then
    raise exception 'BUILD002_BLUEPRINT_V1_PREVIOUS_MUST_BE_NULL';
  end if;
  if v_version > 1 and not exists (
    select 1 from public.outcome_blueprints previous
    where previous.id = v_id
      and previous.version = v_version - 1
      and previous.hash = v_previous_hash
      and previous.status = 'PUBLISHED'
  ) then
    raise exception 'BUILD002_BLUEPRINT_INVALID_VERSION_CHAIN';
  end if;
  insert into public.outcome_blueprints(
    id, version, hash, previous_version_hash, status, published_at, definition
  ) values (
    v_id, v_version, v_hash, v_previous_hash, v_status, v_published_at, v_definition
  );
  return v_id;
end;
$$;

create or replace function public.build002_publish_outcome_requirement_profile(p_profile jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := (p_profile->>'id')::uuid;
  v_version integer := (p_profile->>'version')::integer;
  v_hash text := p_profile->>'hash';
  v_previous_hash text := nullif(p_profile->>'previousVersionHash', '');
  v_blueprint_id uuid := (p_profile->'blueprint'->>'id')::uuid;
  v_blueprint_version integer := (p_profile->'blueprint'->>'version')::integer;
  v_blueprint_hash text := p_profile->'blueprint'->>'hash';
  v_policy_id text := nullif(p_profile->'policy'->>'id', '');
  v_policy_hash text := nullif(p_profile->'policy'->>'hash', '');
  v_status text := p_profile->>'status';
  v_published_at timestamptz := (p_profile->>'publishedAt')::timestamptz;
  v_definition jsonb := p_profile - 'hash' - 'status' - 'publishedAt';
begin
  if v_status <> 'PUBLISHED' then
    raise exception 'BUILD002_PROFILE_NOT_PUBLISHED';
  end if;
  if v_policy_id is not null or v_policy_hash is not null or jsonb_typeof(p_profile->'policy') <> 'null' then
    raise exception 'BUILD002_PROFILE_POLICY_MUST_BE_NULL';
  end if;
  if not exists (
    select 1 from public.outcome_blueprints blueprint
    where blueprint.id = v_blueprint_id
      and blueprint.version = v_blueprint_version
      and blueprint.hash = v_blueprint_hash
      and blueprint.status = 'PUBLISHED'
  ) then
    raise exception 'BUILD002_PROFILE_BLUEPRINT_NOT_FOUND';
  end if;
  if v_version = 1 and v_previous_hash is not null then
    raise exception 'BUILD002_PROFILE_V1_PREVIOUS_MUST_BE_NULL';
  end if;
  if v_version > 1 and not exists (
    select 1 from public.outcome_requirement_profiles previous
    where previous.id = v_id
      and previous.version = v_version - 1
      and previous.hash = v_previous_hash
      and previous.status = 'PUBLISHED'
  ) then
    raise exception 'BUILD002_PROFILE_INVALID_VERSION_CHAIN';
  end if;
  if (p_profile->'blueprint') <> (v_definition->'blueprint') then
    raise exception 'BUILD002_PROFILE_BLUEPRINT_DEFINITION_MISMATCH';
  end if;
  insert into public.outcome_requirement_profiles(
    id, version, hash, previous_version_hash,
    blueprint_id, blueprint_version, blueprint_hash,
    policy_id, policy_hash, status, published_at, definition
  ) values (
    v_id, v_version, v_hash, v_previous_hash,
    v_blueprint_id, v_blueprint_version, v_blueprint_hash,
    null, null, v_status, v_published_at, v_definition
  );
  return v_id;
end;
$$;

alter table public.outcome_blueprints enable row level security;
alter table public.outcome_requirement_profiles enable row level security;

revoke all on table public.outcome_blueprints from public, anon, authenticated, service_role;
revoke all on table public.outcome_requirement_profiles from public, anon, authenticated, service_role;
grant select on table public.outcome_blueprints to service_role;
grant select on table public.outcome_requirement_profiles to service_role;

revoke execute on function public.build002_publish_outcome_blueprint(jsonb) from public, anon, authenticated;
revoke execute on function public.build002_publish_outcome_requirement_profile(jsonb) from public, anon, authenticated;
grant execute on function public.build002_publish_outcome_blueprint(jsonb) to service_role;
grant execute on function public.build002_publish_outcome_requirement_profile(jsonb) to service_role;

comment on table public.outcome_blueprints is 'BUILD 002-C0-B system-owned immutable published Blueprint catalog.';
comment on table public.outcome_requirement_profiles is 'BUILD 002-C0-B system-owned immutable published Requirement Profile catalog.';
