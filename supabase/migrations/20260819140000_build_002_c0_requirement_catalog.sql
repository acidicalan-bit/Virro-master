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
  unique (id, version, hash),
  constraint outcome_blueprints_definition_id_match
    check (coalesce(definition ? 'id' and jsonb_typeof(definition->'id') = 'string'
      and lower(definition->>'id') = lower(id::text), false)),
  constraint outcome_blueprints_definition_version_match
    check (coalesce(definition ? 'version' and jsonb_typeof(definition->'version') = 'number'
      and definition->>'version' = version::text, false)),
  constraint outcome_blueprints_definition_previous_hash_match
    check (coalesce(definition ? 'previousVersionHash'
      and (definition->'previousVersionHash' = 'null'::jsonb
        or jsonb_typeof(definition->'previousVersionHash') = 'string')
      and previous_version_hash is not distinct from nullif(definition->>'previousVersionHash', ''), false))
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
  constraint outcome_requirement_profiles_definition_id_match
    check (coalesce(definition ? 'id' and jsonb_typeof(definition->'id') = 'string'
      and lower(definition->>'id') = lower(id::text), false)),
  constraint outcome_requirement_profiles_definition_version_match
    check (coalesce(definition ? 'version' and jsonb_typeof(definition->'version') = 'number'
      and definition->>'version' = version::text, false)),
  constraint outcome_requirement_profiles_definition_previous_hash_match
    check (coalesce(definition ? 'previousVersionHash'
      and (definition->'previousVersionHash' = 'null'::jsonb
        or jsonb_typeof(definition->'previousVersionHash') = 'string')
      and previous_version_hash is not distinct from nullif(definition->>'previousVersionHash', ''), false)),
  constraint outcome_requirement_profiles_definition_blueprint_object
    check (coalesce(definition ? 'blueprint' and jsonb_typeof(definition->'blueprint') = 'object', false)),
  constraint outcome_requirement_profiles_definition_blueprint_id_match
    check (coalesce(definition->'blueprint' ? 'id'
      and jsonb_typeof(definition->'blueprint'->'id') = 'string'
      and lower(definition->'blueprint'->>'id') = lower(blueprint_id::text), false)),
  constraint outcome_requirement_profiles_definition_blueprint_version_match
    check (coalesce(definition->'blueprint' ? 'version'
      and jsonb_typeof(definition->'blueprint'->'version') = 'number'
      and definition->'blueprint'->>'version' = blueprint_version::text, false)),
  constraint outcome_requirement_profiles_definition_blueprint_hash_match
    check (coalesce(definition->'blueprint' ? 'hash'
      and jsonb_typeof(definition->'blueprint'->'hash') = 'string'
      and definition->'blueprint'->>'hash' = blueprint_hash, false)),
  constraint outcome_requirement_profiles_policy_null
    check (policy_id is null and policy_hash is null),
  constraint outcome_requirement_profiles_definition_policy_null
    check (coalesce(definition ? 'policy' and definition->'policy' = 'null'::jsonb, false)),
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
  if not (v_definition ? 'id') or jsonb_typeof(v_definition->'id') <> 'string' then
    raise exception 'BUILD002_BLUEPRINT_DEFINITION_ID_REQUIRED';
  end if;
  if not (v_definition ? 'version') or jsonb_typeof(v_definition->'version') <> 'number' then
    raise exception 'BUILD002_BLUEPRINT_DEFINITION_VERSION_REQUIRED';
  end if;
  if not (v_definition ? 'previousVersionHash')
    or (jsonb_typeof(v_definition->'previousVersionHash') <> 'null'
      and jsonb_typeof(v_definition->'previousVersionHash') <> 'string') then
    raise exception 'BUILD002_BLUEPRINT_DEFINITION_PREVIOUS_HASH_REQUIRED';
  end if;
  if v_id is distinct from (v_definition->>'id')::uuid then
    raise exception 'BUILD002_BLUEPRINT_DEFINITION_ID_MISMATCH';
  end if;
  if v_version is distinct from (v_definition->>'version')::integer then
    raise exception 'BUILD002_BLUEPRINT_DEFINITION_VERSION_MISMATCH';
  end if;
  if v_previous_hash is distinct from nullif(v_definition->>'previousVersionHash', '') then
    raise exception 'BUILD002_BLUEPRINT_DEFINITION_PREVIOUS_HASH_MISMATCH';
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
  v_definition jsonb := coalesce(p_profile->'definition', p_profile - 'hash' - 'status' - 'publishedAt');
begin
  if v_status <> 'PUBLISHED' then
    raise exception 'BUILD002_PROFILE_NOT_PUBLISHED';
  end if;
  if not (v_definition ? 'id') or jsonb_typeof(v_definition->'id') <> 'string' then
    raise exception 'BUILD002_PROFILE_DEFINITION_ID_REQUIRED';
  end if;
  if not (v_definition ? 'version') or jsonb_typeof(v_definition->'version') <> 'number' then
    raise exception 'BUILD002_PROFILE_DEFINITION_VERSION_REQUIRED';
  end if;
  if not (v_definition ? 'previousVersionHash')
    or (jsonb_typeof(v_definition->'previousVersionHash') <> 'null'
      and jsonb_typeof(v_definition->'previousVersionHash') <> 'string') then
    raise exception 'BUILD002_PROFILE_DEFINITION_PREVIOUS_HASH_REQUIRED';
  end if;
  if not (v_definition ? 'blueprint') or jsonb_typeof(v_definition->'blueprint') <> 'object' then
    raise exception 'BUILD002_PROFILE_DEFINITION_BLUEPRINT_REQUIRED';
  end if;
  if not (v_definition->'blueprint' ? 'id')
    or jsonb_typeof(v_definition->'blueprint'->'id') <> 'string'
    or not (v_definition->'blueprint' ? 'version')
    or jsonb_typeof(v_definition->'blueprint'->'version') <> 'number'
    or not (v_definition->'blueprint' ? 'hash')
    or jsonb_typeof(v_definition->'blueprint'->'hash') <> 'string' then
    raise exception 'BUILD002_PROFILE_DEFINITION_BLUEPRINT_FIELDS_REQUIRED';
  end if;
  if not (v_definition ? 'policy') or v_definition->'policy' <> 'null'::jsonb then
    raise exception 'BUILD002_PROFILE_DEFINITION_POLICY_REQUIRED';
  end if;
  if v_id is distinct from (v_definition->>'id')::uuid then
    raise exception 'BUILD002_PROFILE_DEFINITION_ID_MISMATCH';
  end if;
  if v_version is distinct from (v_definition->>'version')::integer then
    raise exception 'BUILD002_PROFILE_DEFINITION_VERSION_MISMATCH';
  end if;
  if v_previous_hash is distinct from nullif(v_definition->>'previousVersionHash', '') then
    raise exception 'BUILD002_PROFILE_DEFINITION_PREVIOUS_HASH_MISMATCH';
  end if;
  if v_blueprint_id is distinct from (v_definition->'blueprint'->>'id')::uuid
    or v_blueprint_version is distinct from (v_definition->'blueprint'->>'version')::integer
    or v_blueprint_hash is distinct from v_definition->'blueprint'->>'hash' then
    raise exception 'BUILD002_PROFILE_DEFINITION_BLUEPRINT_MISMATCH';
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
