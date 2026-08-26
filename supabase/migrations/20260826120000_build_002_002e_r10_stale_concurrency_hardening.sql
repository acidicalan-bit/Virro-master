-- BUILD002 002-E R10: canonical stale/concurrency hardening.
--
-- The relation below is synchronization state, never application authority.
-- Every identity is constructed by a fixed server-owned route in this file.

create table public.build002_material_fences (
  fence_kind text not null check (fence_kind in (
    'PERSONAL_TENANT_OWNER_PRINCIPAL',
    'TENANT_AUTHORITY',
    'MEMBERSHIP_AUTHORITY',
    'OUTCOME_TRANSACTION',
    'ASSET_HEAD',
    'SOURCE_ASSET_VERSION',
    'TRANSACTION_REQUIREMENT_BINDING',
    'BLUEPRINT_FAMILY',
    'REQUIREMENT_PROFILE_FAMILY',
    'SIGNAL_REQUIREMENT_UNIVERSE',
    'SIGNAL_UNIVERSE',
    'READINESS_EVALUATION_UNIVERSE',
    'READINESS_AUTHORITY_UNIVERSE',
    'DELEGABILITY_ADMISSION_SCOPE',
    'TASKSPEC_FIELD_OUTCOME_UNIVERSE',
    'INTENT_PATCH_UNIVERSE',
    'EXECUTION_AUTHORITY_SCOPE',
    'MUTATION_LEASE_SCOPE',
    'EXECUTION_ATTEMPT_SCOPE'
  )),
  identity_schema_version integer not null check (identity_schema_version = 1),
  canonical_scope_identity jsonb not null check (jsonb_typeof(canonical_scope_identity) = 'object'),
  material_revision bigint not null default 0 check (material_revision >= 0),
  serialization_revision bigint not null default 0 check (serialization_revision >= 0),
  primary key (fence_kind, identity_schema_version, canonical_scope_identity)
);

revoke all on table public.build002_material_fences from public, anon, authenticated, service_role;

create function public.build002_002e_fence_rank(p_fence_kind text)
returns smallint
language sql
immutable
strict
security definer
set search_path = pg_catalog, public
as $$
  select case p_fence_kind
    when 'PERSONAL_TENANT_OWNER_PRINCIPAL' then 0
    when 'TENANT_AUTHORITY' then 1
    when 'MEMBERSHIP_AUTHORITY' then 2
    when 'OUTCOME_TRANSACTION' then 3
    when 'ASSET_HEAD' then 4
    when 'SOURCE_ASSET_VERSION' then 5
    when 'TRANSACTION_REQUIREMENT_BINDING' then 6
    when 'BLUEPRINT_FAMILY' then 7
    when 'REQUIREMENT_PROFILE_FAMILY' then 8
    when 'SIGNAL_REQUIREMENT_UNIVERSE' then 9
    when 'SIGNAL_UNIVERSE' then 10
    when 'READINESS_EVALUATION_UNIVERSE' then 11
    when 'READINESS_AUTHORITY_UNIVERSE' then 12
    when 'DELEGABILITY_ADMISSION_SCOPE' then 13
    when 'TASKSPEC_FIELD_OUTCOME_UNIVERSE' then 14
    when 'INTENT_PATCH_UNIVERSE' then 15
    when 'EXECUTION_AUTHORITY_SCOPE' then 16
    when 'MUTATION_LEASE_SCOPE' then 17
    when 'EXECUTION_ATTEMPT_SCOPE' then 18
  end::smallint
$$;

revoke all on function public.build002_002e_fence_rank(text) from public, anon, authenticated, service_role;

create function public.build002_002e_acquire_fences(p_fences jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_locked bigint;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'BUILD002_002E_READ_COMMITTED_REQUIRED' using errcode = '25001';
  end if;
  if p_fences is null or jsonb_typeof(p_fences) <> 'array' then
    raise exception 'BUILD002_002E_INVALID_FENCE_SET';
  end if;

  -- PostgreSQL 17 jsonb btree comparison is deliberately the scope-order
  -- authority.  There is no application-side JSON ordering or ordinal tie-break.
  for r in
    select distinct
      public.build002_002e_fence_rank(item->>'kind') as fence_rank,
      item->>'kind' as kind,
      item->'scope' as scope
    from jsonb_array_elements(p_fences) item
    where item ? 'kind' and item ? 'scope'
    order by fence_rank, scope
  loop
    if public.build002_002e_fence_rank(r.kind) is null
       or jsonb_typeof(r.scope) <> 'object' then
      raise exception 'BUILD002_002E_INVALID_FENCE_IDENTITY';
    end if;

    insert into public.build002_material_fences (
      fence_kind,
      identity_schema_version,
      canonical_scope_identity,
      material_revision,
      serialization_revision
    ) values (r.kind, 1, r.scope, 0, 0)
    on conflict (fence_kind, identity_schema_version, canonical_scope_identity)
    do nothing;

    select material_revision
      into v_locked
      from public.build002_material_fences
     where fence_kind = r.kind
       and identity_schema_version = 1
       and canonical_scope_identity = r.scope
     for update;
    if not found then
      raise exception 'BUILD002_002E_FENCE_BOOTSTRAP_FAILED';
    end if;
  end loop;
end;
$$;

revoke all on function public.build002_002e_acquire_fences(jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_lock_parents(p_parents jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r record;
begin
  if p_parents is null or jsonb_typeof(p_parents) <> 'array' then
    raise exception 'BUILD002_002E_INVALID_PARENT_SET';
  end if;

  for r in
    select distinct
      (item->>'rank')::integer as family_rank,
      item->>'relation' as relation_name,
      (item->>'id')::uuid as row_id
    from jsonb_array_elements(p_parents) item
    where nullif(item->>'id', '') is not null
    order by (item->>'rank')::integer, item->>'relation', (item->>'id')::uuid
  loop
    case r.relation_name
      when 'asset_versions' then perform 1 from public.asset_versions where id = r.row_id for update;
      when 'assets' then perform 1 from public.assets where id = r.row_id for update;
      when 'build002_delegability_admissions' then perform 1 from public.build002_delegability_admissions where admission_id = r.row_id for update;
      when 'build002_delegation_readiness' then perform 1 from public.build002_delegation_readiness where id = r.row_id for update;
      when 'build002_dependency_snapshots' then perform 1 from public.build002_dependency_snapshots where id = r.row_id for update;
      when 'build002_execution_attempt_reservations' then perform 1 from public.build002_execution_attempt_reservations where reservation_id = r.row_id for update;
      when 'build002_execution_authorities' then perform 1 from public.build002_execution_authorities where execution_authority_id = r.row_id for update;
      when 'build002_mutation_leases' then perform 1 from public.build002_mutation_leases where mutation_lease_id = r.row_id for update;
      when 'build002_readiness_authority_commits' then perform 1 from public.build002_readiness_authority_commits where id = r.row_id for update;
      when 'field_outcomes' then perform 1 from public.field_outcomes where id = r.row_id for update;
      when 'build002_signal_requirements' then perform 1 from public.build002_signal_requirements where id = r.row_id for update;
      when 'build002_signals' then perform 1 from public.build002_signals where signal_id = r.row_id for update;
      when 'outcome_blueprints' then perform 1 from public.outcome_blueprints where id = r.row_id for update;
      when 'outcome_requirement_profiles' then perform 1 from public.outcome_requirement_profiles where id = r.row_id for update;
      when 'outcome_transaction_requirement_bindings' then perform 1 from public.outcome_transaction_requirement_bindings where id = r.row_id for update;
      when 'outcome_transactions' then perform 1 from public.outcome_transactions where id = r.row_id for update;
      when 'partial_intents' then perform 1 from public.partial_intents where id = r.row_id for update;
      when 'tenant_memberships' then perform 1 from public.tenant_memberships where id = r.row_id for update;
      when 'tenants' then perform 1 from public.tenants where id = r.row_id for update;
      when 'transaction_patches' then perform 1 from public.transaction_patches where id = r.row_id for update;
      when 'preservation_value_studies' then perform 1 from public.preservation_value_studies where id = r.row_id for update;
      else raise exception 'BUILD002_002E_UNKNOWN_PARENT_FAMILY';
    end case;
    if not found then
      raise exception 'BUILD002_002E_PARENT_NOT_FOUND: %.%', r.relation_name, r.row_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.build002_002e_lock_parents(jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_fence_scope(
  p_kind text,
  p_tenant uuid default null,
  p_transaction uuid default null,
  p_asset uuid default null,
  p_version uuid default null,
  p_principal uuid default null,
  p_scope jsonb default null
)
returns jsonb
language plpgsql
immutable
security definer
set search_path = pg_catalog, public
as $$
begin
  case p_kind
    when 'PERSONAL_TENANT_OWNER_PRINCIPAL' then return jsonb_build_object('principal_id', p_principal);
    when 'TENANT_AUTHORITY' then return jsonb_build_object('tenant_id', p_tenant);
    when 'MEMBERSHIP_AUTHORITY' then return jsonb_build_object('principal_id', p_principal, 'tenant_id', p_tenant);
    when 'OUTCOME_TRANSACTION' then return jsonb_build_object('outcome_transaction_id', p_transaction, 'tenant_id', p_tenant);
    when 'ASSET_HEAD' then return jsonb_build_object('asset_id', p_asset, 'tenant_id', p_tenant);
    when 'SOURCE_ASSET_VERSION' then return jsonb_build_object('asset_id', p_asset, 'tenant_id', p_tenant, 'version_id', p_version);
    else return jsonb_build_object('outcome_transaction_id', p_transaction, 'scope', p_scope, 'tenant_id', p_tenant);
  end case;
end;
$$;

revoke all on function public.build002_002e_fence_scope(text,uuid,uuid,uuid,uuid,uuid,jsonb) from public, anon, authenticated, service_role;


create table public.build002_002e_runtime_secret (
  singleton boolean primary key default true check (singleton),
  secret bytea not null check (octet_length(secret) = 32)
);
insert into public.build002_002e_runtime_secret(singleton,secret)
values (true,public.gen_random_bytes(32));
revoke all on table public.build002_002e_runtime_secret from public, anon, authenticated, service_role;

create function public.build002_002e_authorize_route(p_operation text,p_context jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_claims jsonb;
  v_claim_role text;
  v_set_role text := current_setting('role',true);
  v_actor uuid := auth.uid();
  v_trusted boolean;
  v_authenticated boolean;
  v_tenant uuid := nullif(p_context->>'tenant_id','')::uuid;
  v_project uuid := nullif(p_context->>'project_id','')::uuid;
  v_transaction uuid := nullif(p_context->>'transaction_id','')::uuid;
  v_asset uuid := nullif(p_context->>'asset_id','')::uuid;
  v_version uuid := nullif(p_context->>'version_id','')::uuid;
  v_previous uuid := nullif(p_context->>'previous_version_id','')::uuid;
  v_membership uuid := nullif(p_context->>'membership_id','')::uuid;
  v_principal uuid := nullif(p_context->>'principal_id','')::uuid;
  v_member_principal uuid := nullif(p_context->>'member_principal_id','')::uuid;
  v_study uuid := nullif(p_context->>'study_id','')::uuid;
  v_admission uuid := nullif(p_context->>'admission_id','')::uuid;
  v_execution_authority uuid := nullif(p_context->>'execution_authority_id','')::uuid;
  v_mutation_lease uuid := nullif(p_context->>'mutation_lease_id','')::uuid;
  v_reservation uuid := nullif(p_context->>'reservation_id','')::uuid;
  v_row_tenant uuid;
  v_row_project uuid;
  v_row_asset uuid;
  v_row_version uuid;
  v_row_transaction uuid;
begin
  if p_context is null or jsonb_typeof(p_context) <> 'object' then
    raise exception 'BUILD002_002E_PREAUTH_INVALID_CONTEXT' using errcode='42501';
  end if;
  begin
    v_claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_claim_role := coalesce(nullif(current_setting('request.jwt.claim.role',true),''),v_claims->>'role');
  v_trusted := (session_user = current_user and coalesce(v_set_role,'none') = 'none')
    or (v_set_role = 'service_role' and v_claim_role = 'service_role');
  v_authenticated := v_set_role = 'authenticated'
    and v_claim_role = 'authenticated'
    and v_actor is not null;
  if not v_trusted and not v_authenticated then
    raise exception 'BUILD002_002E_PREAUTH_ACTOR_DENIED' using errcode='42501';
  end if;

  -- An authenticated request must establish its tenant authority before any
  -- victim-selected lineage read. These are ordinary MVCC reads only.
  if v_authenticated then
    if v_tenant is null then
      raise exception 'BUILD002_002E_PREAUTH_TENANT_REQUIRED' using errcode='42501';
    end if;
    if v_principal is not null and v_principal is distinct from v_actor then
      raise exception 'BUILD002_002E_PREAUTH_PRINCIPAL_MISMATCH' using errcode='42501';
    end if;
    perform 1
      from public.tenant_memberships m
      join public.tenants t on t.id=m.tenant_id
     where m.tenant_id=v_tenant and m.principal_id=v_actor
       and m.status='ACTIVE' and t.status='ACTIVE';
    if not found then
      raise exception 'BUILD002_002E_PREAUTH_TENANT_DENIED' using errcode='42501';
    end if;
    v_principal := v_actor;
  end if;

  -- Service-role wrappers remain trusted transport, but a principal carried
  -- in their business contract is still tenant-scoped authority. Validate it
  -- before reading or synchronizing any victim lineage.
  if v_trusted and v_principal is not null and v_tenant is not null
     and p_operation <> 'rpc.provision_personal_tenant' then
    perform 1
      from public.tenant_memberships m
      join public.tenants t on t.id=m.tenant_id
     where m.tenant_id=v_tenant and m.principal_id=v_principal
       and m.status='ACTIVE' and t.status='ACTIVE';
    if not found then
      raise exception 'BUILD002_002E_PREAUTH_PRINCIPAL_TENANT_DENIED' using errcode='42501';
    end if;
  end if;

  if v_project is not null then
    select owner_tenant_id into v_row_tenant from public.projects where id=v_project;
    if not found or (v_tenant is not null and v_row_tenant is distinct from v_tenant) then
      raise exception 'BUILD002_002E_PREAUTH_PROJECT_LINEAGE' using errcode='42501';
    end if;
    v_tenant := coalesce(v_tenant,v_row_tenant);
  end if;

  if v_transaction is not null and p_operation <> 'direct.outcome_transactions.insert' then
    select owner_tenant_id,project_id,asset_id,base_version_id
      into v_row_tenant,v_row_project,v_row_asset,v_row_version
      from public.outcome_transactions where id=v_transaction;
    if not found
       or (v_tenant is not null and v_row_tenant is distinct from v_tenant)
       or (v_project is not null and v_row_project is distinct from v_project)
       or (v_asset is not null and v_row_asset is distinct from v_asset)
       or (v_version is not null and p_operation not in ('direct.asset_versions.insert','direct.state_commits.insert','rpc.create_tenant_asset_with_initial_version')
           and v_row_version is distinct from v_version) then
      raise exception 'BUILD002_002E_PREAUTH_TRANSACTION_LINEAGE' using errcode='42501';
    end if;
    v_tenant:=coalesce(v_tenant,v_row_tenant); v_project:=coalesce(v_project,v_row_project);
    v_asset:=coalesce(v_asset,v_row_asset); v_version:=coalesce(v_version,v_row_version);
  end if;

  if v_asset is not null and p_operation not in ('direct.assets.insert','rpc.create_tenant_asset_with_initial_version') then
    select owner_tenant_id,project_id into v_row_tenant,v_row_project from public.assets where id=v_asset;
    if not found or (v_tenant is not null and v_row_tenant is distinct from v_tenant)
       or (v_project is not null and v_row_project is distinct from v_project) then
      raise exception 'BUILD002_002E_PREAUTH_ASSET_LINEAGE' using errcode='42501';
    end if;
    v_tenant:=coalesce(v_tenant,v_row_tenant); v_project:=coalesce(v_project,v_row_project);
  end if;

  if v_version is not null and p_operation not in ('direct.asset_versions.insert','rpc.create_tenant_asset_with_initial_version') then
    select owner_tenant_id,asset_id into v_row_tenant,v_row_asset from public.asset_versions where id=v_version;
    if not found or (v_tenant is not null and v_row_tenant is distinct from v_tenant)
       or (v_asset is not null and v_row_asset is distinct from v_asset) then
      raise exception 'BUILD002_002E_PREAUTH_VERSION_LINEAGE' using errcode='42501';
    end if;
    v_tenant:=coalesce(v_tenant,v_row_tenant); v_asset:=coalesce(v_asset,v_row_asset);
  end if;
  if v_previous is not null then
    select owner_tenant_id,asset_id into v_row_tenant,v_row_asset from public.asset_versions where id=v_previous;
    if not found or (v_tenant is not null and v_row_tenant is distinct from v_tenant)
       or (v_asset is not null and v_row_asset is distinct from v_asset) then
      raise exception 'BUILD002_002E_PREAUTH_PREVIOUS_VERSION_LINEAGE' using errcode='42501';
    end if;
  end if;

  if p_operation = 'direct.outcome_transactions.insert' then
    if v_tenant is null or v_project is null or v_asset is null or v_version is null then
      raise exception 'BUILD002_002E_PREAUTH_TRANSACTION_INPUT_REQUIRED' using errcode='42501';
    end if;
    perform 1 from public.projects where id=v_project and owner_tenant_id=v_tenant;
    if not found then raise exception 'BUILD002_002E_PREAUTH_PROJECT_LINEAGE' using errcode='42501'; end if;
    perform 1 from public.assets where id=v_asset and owner_tenant_id=v_tenant and project_id=v_project;
    if not found then raise exception 'BUILD002_002E_PREAUTH_ASSET_LINEAGE' using errcode='42501'; end if;
    perform 1 from public.asset_versions where id=v_version and owner_tenant_id=v_tenant and asset_id=v_asset;
    if not found then raise exception 'BUILD002_002E_PREAUTH_VERSION_LINEAGE' using errcode='42501'; end if;
  end if;
  if p_operation = 'direct.assets.insert' then
    if v_tenant is null or v_project is null then
      raise exception 'BUILD002_002E_PREAUTH_ASSET_INPUT_REQUIRED' using errcode='42501';
    end if;
    perform 1 from public.projects where id=v_project and owner_tenant_id=v_tenant;
    if not found then raise exception 'BUILD002_002E_PREAUTH_PROJECT_LINEAGE' using errcode='42501'; end if;
  end if;
  if p_operation = 'direct.asset_versions.insert' then
    perform 1 from public.assets where id=v_asset and owner_tenant_id=v_tenant;
    if not found then raise exception 'BUILD002_002E_PREAUTH_ASSET_LINEAGE' using errcode='42501'; end if;
  end if;

  if v_membership is not null then
    perform 1 from public.tenant_memberships
     where id=v_membership and tenant_id=v_tenant
       and (coalesce(v_member_principal,v_principal) is null
            or principal_id=coalesce(v_member_principal,v_principal)) and status='ACTIVE';
    if not found then raise exception 'BUILD002_002E_PREAUTH_MEMBERSHIP_LINEAGE' using errcode='42501'; end if;
  end if;
  if v_admission is not null then
    perform 1 from public.build002_delegability_admissions
     where admission_id=v_admission and owner_tenant_id=v_tenant
       and (v_transaction is null or outcome_transaction_id=v_transaction);
    if not found then raise exception 'BUILD002_002E_PREAUTH_ADMISSION_LINEAGE' using errcode='42501'; end if;
  end if;
  if v_execution_authority is not null then
    perform 1 from public.build002_execution_authorities
     where execution_authority_id=v_execution_authority and owner_tenant_id=v_tenant
       and (v_transaction is null or outcome_transaction_id=v_transaction)
       and (v_admission is null or delegability_admission_id=v_admission);
    if not found then raise exception 'BUILD002_002E_PREAUTH_EXECUTION_AUTHORITY_LINEAGE' using errcode='42501'; end if;
  end if;
  if v_mutation_lease is not null then
    perform 1 from public.build002_mutation_leases
     where mutation_lease_id=v_mutation_lease and owner_tenant_id=v_tenant
       and (v_transaction is null or outcome_transaction_id=v_transaction)
       and (v_execution_authority is null or execution_authority_id=v_execution_authority);
    if not found then raise exception 'BUILD002_002E_PREAUTH_MUTATION_LEASE_LINEAGE' using errcode='42501'; end if;
  end if;
  if v_reservation is not null then
    select owner_tenant_id,outcome_transaction_id,asset_id,source_asset_version_id
      into v_row_tenant,v_row_transaction,v_row_asset,v_row_version
      from public.build002_execution_attempt_reservations where reservation_id=v_reservation;
    if not found or (v_tenant is not null and v_row_tenant is distinct from v_tenant)
       or (v_transaction is not null and v_row_transaction is distinct from v_transaction)
       or (v_asset is not null and v_row_asset is distinct from v_asset)
       or (v_version is not null and v_row_version is distinct from v_version) then
      raise exception 'BUILD002_002E_PREAUTH_RESERVATION_LINEAGE' using errcode='42501';
    end if;
  end if;
  if v_study is not null then
    perform 1 from public.preservation_value_studies where id=v_study;
    if not found then raise exception 'BUILD002_002E_PARENT_NOT_FOUND: preservation_value_studies.%',v_study using errcode='42501'; end if;
  elsif p_operation='direct.preservation_study_cases.insert' then
    raise exception 'BUILD002_002E_STUDY_IDENTITY_REQUIRED' using errcode='42501';
  end if;

  if v_tenant is not null and p_operation <> 'rpc.provision_personal_tenant' then
    perform 1 from public.tenants where id=v_tenant and status='ACTIVE';
    if not found then raise exception 'BUILD002_002E_PREAUTH_TENANT_INACTIVE' using errcode='42501'; end if;
  end if;

  return jsonb_strip_nulls(p_context || jsonb_build_object(
    'tenant_id',v_tenant,'project_id',v_project,'transaction_id',v_transaction,
    'asset_id',v_asset,'version_id',v_version,'previous_version_id',v_previous,
    'principal_id',v_principal,'member_principal_id',v_member_principal,
    'membership_id',v_membership,'study_id',v_study,
    'admission_id',v_admission,'execution_authority_id',v_execution_authority,
    'mutation_lease_id',v_mutation_lease,'reservation_id',v_reservation,
    '_actor_class',case when v_trusted then 'TRUSTED_SERVER_SERVICE_ROLE' else 'UNTRUSTED_AUTHENTICATED' end
  ));
end;
$$;
revoke all on function public.build002_002e_authorize_route(text,jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_rederive_context(p_operation text,p_context jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb:=p_context;
  v_transaction uuid:=nullif(p_context->>'transaction_id','')::uuid;
  v_asset uuid:=nullif(p_context->>'asset_id','')::uuid;
  v_version uuid:=nullif(p_context->>'version_id','')::uuid;
  v_membership uuid:=nullif(p_context->>'membership_id','')::uuid;
  v_reservation uuid:=nullif(p_context->>'reservation_id','')::uuid;
  v_tx public.outcome_transactions%rowtype;
  v_asset_row public.assets%rowtype;
  v_version_row public.asset_versions%rowtype;
  v_membership_row public.tenant_memberships%rowtype;
  v_reservation_row public.build002_execution_attempt_reservations%rowtype;
begin
  if v_reservation is not null then
    select * into v_reservation_row from public.build002_execution_attempt_reservations where reservation_id=v_reservation;
    if not found then raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001'; end if;
    if (p_context ? 'tenant_id' and nullif(p_context->>'tenant_id','')::uuid is distinct from v_reservation_row.owner_tenant_id)
       or (p_context ? 'transaction_id' and nullif(p_context->>'transaction_id','')::uuid is distinct from v_reservation_row.outcome_transaction_id)
       or (p_context ? 'asset_id' and nullif(p_context->>'asset_id','')::uuid is distinct from v_reservation_row.asset_id)
       or (p_context ? 'version_id' and nullif(p_context->>'version_id','')::uuid is distinct from v_reservation_row.source_asset_version_id)
       or (p_context ? 'mutation_lease_id' and nullif(p_context->>'mutation_lease_id','')::uuid is distinct from v_reservation_row.mutation_lease_id)
       or (p_context ? 'execution_authority_id' and nullif(p_context->>'execution_authority_id','')::uuid is distinct from v_reservation_row.execution_authority_id)
       or (p_context ? 'admission_id' and nullif(p_context->>'admission_id','')::uuid is distinct from v_reservation_row.delegability_admission_id) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
    end if;
    v_transaction:=v_reservation_row.outcome_transaction_id;
    v_asset:=v_reservation_row.asset_id;
    v_version:=v_reservation_row.source_asset_version_id;
    v_result:=v_result||jsonb_build_object(
      'tenant_id',v_reservation_row.owner_tenant_id,'transaction_id',v_transaction,
      'asset_id',v_asset,'version_id',v_version,
      'mutation_lease_id',v_reservation_row.mutation_lease_id,
      'execution_authority_id',v_reservation_row.execution_authority_id,
      'admission_id',v_reservation_row.delegability_admission_id,
      'readiness_authority_id',v_reservation_row.authority_commit_id);
  end if;
  if v_transaction is not null and p_operation<>'direct.outcome_transactions.insert' then
    select * into v_tx from public.outcome_transactions where id=v_transaction;
    if not found then raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001'; end if;
    if (v_result ? 'tenant_id' and nullif(v_result->>'tenant_id','')::uuid is distinct from v_tx.owner_tenant_id)
       or (v_result ? 'project_id' and nullif(v_result->>'project_id','')::uuid is distinct from v_tx.project_id)
       or (v_result ? 'asset_id' and nullif(v_result->>'asset_id','')::uuid is distinct from v_tx.asset_id)
       or (v_result ? 'version_id'
           and p_operation not in ('direct.asset_versions.insert','direct.state_commits.insert','rpc.create_tenant_asset_with_initial_version')
           and nullif(v_result->>'version_id','')::uuid is distinct from v_tx.base_version_id) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
    end if;
    v_asset:=v_tx.asset_id;
    if p_operation not in ('direct.asset_versions.insert','direct.state_commits.insert','rpc.create_tenant_asset_with_initial_version') then
      v_version:=v_tx.base_version_id;
    end if;
    v_result:=v_result||jsonb_build_object(
      'tenant_id',v_tx.owner_tenant_id,'project_id',v_tx.project_id,
      'transaction_id',v_tx.id,'asset_id',v_asset,'version_id',v_version);
  end if;
  if v_asset is not null and p_operation not in ('direct.assets.insert','rpc.create_tenant_asset_with_initial_version') then
    select * into v_asset_row from public.assets where id=v_asset;
    if not found then raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001'; end if;
    if (v_result ? 'tenant_id' and nullif(v_result->>'tenant_id','')::uuid is distinct from v_asset_row.owner_tenant_id)
       or (v_result ? 'project_id' and nullif(v_result->>'project_id','')::uuid is distinct from v_asset_row.project_id) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
    end if;
    v_result:=v_result||jsonb_build_object(
      'tenant_id',v_asset_row.owner_tenant_id,'project_id',v_asset_row.project_id,'asset_id',v_asset_row.id);
  end if;
  if v_version is not null and p_operation not in ('direct.asset_versions.insert','rpc.create_tenant_asset_with_initial_version') then
    select * into v_version_row from public.asset_versions where id=v_version;
    if not found then raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001'; end if;
    if (v_result ? 'tenant_id' and nullif(v_result->>'tenant_id','')::uuid is distinct from v_version_row.owner_tenant_id)
       or (v_result ? 'asset_id' and nullif(v_result->>'asset_id','')::uuid is distinct from v_version_row.asset_id) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
    end if;
    v_result:=v_result||jsonb_build_object(
      'tenant_id',v_version_row.owner_tenant_id,'asset_id',v_version_row.asset_id,'version_id',v_version_row.id);
  end if;
  if v_membership is not null then
    select * into v_membership_row from public.tenant_memberships where id=v_membership;
    if not found then raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001'; end if;
    if (v_result ? 'tenant_id' and nullif(v_result->>'tenant_id','')::uuid is distinct from v_membership_row.tenant_id)
       or (v_result ? 'member_principal_id' and nullif(v_result->>'member_principal_id','')::uuid is distinct from v_membership_row.principal_id)
       or (not (v_result ? 'member_principal_id') and v_result ? 'principal_id'
           and nullif(v_result->>'principal_id','')::uuid is distinct from v_membership_row.principal_id) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
    end if;
    v_result:=v_result||jsonb_build_object('tenant_id',v_membership_row.tenant_id,'membership_id',v_membership_row.id);
    if v_result ? 'member_principal_id' then
      v_result:=v_result||jsonb_build_object('member_principal_id',v_membership_row.principal_id);
    else
      v_result:=v_result||jsonb_build_object('principal_id',v_membership_row.principal_id);
    end if;
  end if;
  return jsonb_strip_nulls(v_result);
end;
$$;
revoke all on function public.build002_002e_rederive_context(text,jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_derive_fences(p_operation text,p_context jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_fences jsonb := '[]'::jsonb;
  v_tenant uuid := nullif(p_context->>'tenant_id','')::uuid;
  v_transaction uuid := nullif(p_context->>'transaction_id','')::uuid;
  v_asset uuid := nullif(p_context->>'asset_id','')::uuid;
  v_version uuid := nullif(p_context->>'version_id','')::uuid;
  v_previous_version uuid := nullif(p_context->>'previous_version_id','')::uuid;
  v_principal uuid := nullif(p_context->>'principal_id','')::uuid;
  v_member_principal uuid := coalesce(nullif(p_context->>'member_principal_id','')::uuid,nullif(p_context->>'principal_id','')::uuid);
  v_study uuid := nullif(p_context->>'study_id','')::uuid;
  v_admission uuid := nullif(p_context->>'admission_id','')::uuid;
  v_readiness_authority uuid := nullif(p_context->>'readiness_authority_id','')::uuid;
  v_execution_authority uuid := nullif(p_context->>'execution_authority_id','')::uuid;
  v_mutation_lease uuid := nullif(p_context->>'mutation_lease_id','')::uuid;
  v_execution_attempt uuid := nullif(p_context->>'execution_attempt_id','')::uuid;
  v_binding uuid := nullif(p_context->>'binding_id','')::uuid;
  v_blueprint uuid := nullif(p_context->>'blueprint_id','')::uuid;
  v_profile uuid := nullif(p_context->>'profile_id','')::uuid;
begin
  -- Canonical fence sets. Scope universes use full typed JSONB identities;
  -- no hash, timestamp, sequence, semantic role, or input ordinal participates.
  if p_operation = 'rpc.provision_personal_tenant' then
    v_fences := jsonb_build_array(
      jsonb_build_object('kind','PERSONAL_TENANT_OWNER_PRINCIPAL','scope',public.build002_002e_fence_scope('PERSONAL_TENANT_OWNER_PRINCIPAL',p_principal=>v_principal)),
      jsonb_build_object('kind','TENANT_AUTHORITY','scope',public.build002_002e_fence_scope('TENANT_AUTHORITY',p_tenant=>v_tenant)),
      jsonb_build_object('kind','MEMBERSHIP_AUTHORITY','scope',public.build002_002e_fence_scope('MEMBERSHIP_AUTHORITY',p_tenant=>v_tenant,p_principal=>v_member_principal)));
  elsif p_operation = 'rpc.revoke_tenant_membership' then
    v_fences := jsonb_build_array(
      jsonb_build_object('kind','PERSONAL_TENANT_OWNER_PRINCIPAL','scope',public.build002_002e_fence_scope('PERSONAL_TENANT_OWNER_PRINCIPAL',p_principal=>v_principal)),
      jsonb_build_object('kind','TENANT_AUTHORITY','scope',public.build002_002e_fence_scope('TENANT_AUTHORITY',p_tenant=>v_tenant)),
      jsonb_build_object('kind','MEMBERSHIP_AUTHORITY','scope',public.build002_002e_fence_scope('MEMBERSHIP_AUTHORITY',p_tenant=>v_tenant,p_principal=>v_member_principal)));
  else
    if p_operation not in ('direct.preservation_study_cases.insert','rpc.build002_publish_outcome_blueprint','rpc.build002_publish_outcome_requirement_profile') then
      if v_tenant is null then raise exception 'BUILD002_002E_TENANT_IDENTITY_REQUIRED'; end if;
      v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','TENANT_AUTHORITY','scope',public.build002_002e_fence_scope('TENANT_AUTHORITY',p_tenant=>v_tenant)));
    end if;
    if p_operation in (
      'direct.preservation_strategy_runs.insert','direct.field_outcomes.insert',
      'direct.outcome_transactions.insert','direct.outcome_transactions.update',
      'direct.partial_intents.insert','direct.transaction_patches.insert',
      'direct.mutation_leases.insert','direct.execution_runs.insert','direct.evidence_receipts.insert',
      'direct.verification_runs.insert','direct.verification_criterion_evidence.insert',
      'direct.state_commits.insert','direct.cost_records.insert','direct.semantic_snapshots.insert',
      'direct.candidate_assets.insert','direct.preservation_runs.insert','direct.candidate_preferences.insert',
      'direct.preservation_study_cases.insert','rpc.build002_grant_mutation_lease',
      'rpc.build002_insert_dependency_snapshot','rpc.build002_insert_signal_qualification',
      'rpc.build002_insert_delegation_readiness','rpc.build002_insert_signal_requirement',
      'rpc.build002_insert_signal','rpc.commit_accepted_field_outcome',
      'rpc.build002_admit_delegability','rpc.build002_reserve_execution_attempt',
      'rpc.build002_consume_execution_attempt_reservation','rpc.build002_grant_execution_authority',
      'rpc.build002_commit_readiness_authority','rpc.build002_bind_outcome_transaction_requirements'
    ) then
      if v_transaction is null then raise exception 'BUILD002_002E_TRANSACTION_IDENTITY_REQUIRED'; end if;
      v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','OUTCOME_TRANSACTION','scope',public.build002_002e_fence_scope('OUTCOME_TRANSACTION',p_tenant=>v_tenant,p_transaction=>v_transaction)));
    end if;
    if p_operation in (
      'direct.assets.insert','direct.assets.update','direct.asset_versions.insert',
      'direct.outcome_transactions.insert','direct.state_commits.insert','direct.media_storage.insert',
      'rpc.build002_grant_mutation_lease','rpc.commit_accepted_field_outcome',
      'rpc.build002_admit_delegability','rpc.build002_reserve_execution_attempt',
      'rpc.build002_grant_execution_authority','rpc.create_tenant_asset_with_initial_version'
    ) then
      if v_asset is null then raise exception 'BUILD002_002E_ASSET_IDENTITY_REQUIRED'; end if;
      v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','ASSET_HEAD','scope',public.build002_002e_fence_scope('ASSET_HEAD',p_tenant=>v_tenant,p_asset=>v_asset)));
    end if;
    if p_operation in (
      'direct.asset_versions.insert','direct.outcome_transactions.insert','direct.evidence_receipts.insert',
      'direct.state_commits.insert','direct.candidate_assets.insert','direct.preservation_runs.insert',
      'direct.field_outcomes.insert','direct.preservation_study_cases.insert',
      'rpc.build002_grant_mutation_lease','rpc.commit_accepted_field_outcome',
      'rpc.build002_admit_delegability','rpc.build002_reserve_execution_attempt',
      'rpc.build002_grant_execution_authority','rpc.create_tenant_asset_with_initial_version'
    ) then
      if v_version is null then raise exception 'BUILD002_002E_VERSION_IDENTITY_REQUIRED'; end if;
      v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','SOURCE_ASSET_VERSION','scope',public.build002_002e_fence_scope('SOURCE_ASSET_VERSION',p_tenant=>v_tenant,p_asset=>v_asset,p_version=>v_version)));
      if p_operation = 'direct.state_commits.insert' and v_previous_version is not null then
        v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','SOURCE_ASSET_VERSION','scope',public.build002_002e_fence_scope('SOURCE_ASSET_VERSION',p_tenant=>v_tenant,p_asset=>v_asset,p_version=>v_previous_version)));
      end if;
    end if;
  end if;

  -- Transaction-scoped universes.
  if p_operation in ('rpc.build002_bind_outcome_transaction_requirements','rpc.build002_admit_delegability') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','TRANSACTION_REQUIREMENT_BINDING','scope',public.build002_002e_fence_scope('TRANSACTION_REQUIREMENT_BINDING',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('binding_id',coalesce(v_binding,v_transaction)))));
  end if;
  if p_operation in ('rpc.build002_publish_outcome_blueprint','rpc.build002_publish_outcome_requirement_profile','rpc.build002_bind_outcome_transaction_requirements') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','BLUEPRINT_FAMILY','scope',public.build002_002e_fence_scope('BLUEPRINT_FAMILY',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('blueprint_id',v_blueprint))));
  end if;
  if p_operation in ('rpc.build002_publish_outcome_requirement_profile','rpc.build002_bind_outcome_transaction_requirements') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','REQUIREMENT_PROFILE_FAMILY','scope',public.build002_002e_fence_scope('REQUIREMENT_PROFILE_FAMILY',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('profile_id',v_profile))));
  end if;
  if p_operation in ('rpc.build002_insert_signal_requirement','rpc.build002_insert_signal','rpc.build002_insert_dependency_snapshot','rpc.build002_insert_signal_qualification','rpc.build002_commit_readiness_authority','rpc.build002_admit_delegability') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','SIGNAL_REQUIREMENT_UNIVERSE','scope',public.build002_002e_fence_scope('SIGNAL_REQUIREMENT_UNIVERSE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('universe','signal-requirements'))));
  end if;
  if p_operation in ('rpc.build002_insert_signal','rpc.build002_insert_dependency_snapshot','rpc.build002_insert_signal_qualification','rpc.build002_commit_readiness_authority','rpc.build002_admit_delegability') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','SIGNAL_UNIVERSE','scope',public.build002_002e_fence_scope('SIGNAL_UNIVERSE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('universe','signals'))));
  end if;
  if p_operation in ('rpc.build002_insert_dependency_snapshot','rpc.build002_insert_signal_qualification','rpc.build002_insert_delegation_readiness','rpc.build002_commit_readiness_authority','rpc.build002_admit_delegability') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','READINESS_EVALUATION_UNIVERSE','scope',public.build002_002e_fence_scope('READINESS_EVALUATION_UNIVERSE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('universe','readiness-evaluation'))));
  end if;
  if p_operation in ('rpc.build002_commit_readiness_authority','rpc.build002_admit_delegability') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','READINESS_AUTHORITY_UNIVERSE','scope',public.build002_002e_fence_scope('READINESS_AUTHORITY_UNIVERSE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('universe','readiness-authority'))));
  end if;
  if p_operation in ('rpc.build002_admit_delegability','rpc.build002_grant_execution_authority','rpc.build002_grant_mutation_lease','rpc.build002_reserve_execution_attempt') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','DELEGABILITY_ADMISSION_SCOPE','scope',public.build002_002e_fence_scope('DELEGABILITY_ADMISSION_SCOPE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('scope','delegability-admission'))));
  end if;
  if p_operation in ('direct.field_outcomes.insert','rpc.build002_grant_execution_authority','rpc.build002_grant_mutation_lease') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','TASKSPEC_FIELD_OUTCOME_UNIVERSE','scope',public.build002_002e_fence_scope('TASKSPEC_FIELD_OUTCOME_UNIVERSE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('universe','taskspec-field-outcome'))));
  end if;
  if p_operation in ('direct.partial_intents.insert','direct.transaction_patches.insert','rpc.build002_grant_mutation_lease') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','INTENT_PATCH_UNIVERSE','scope',public.build002_002e_fence_scope('INTENT_PATCH_UNIVERSE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('universe','intent-patch'))));
  end if;
  if p_operation in ('rpc.build002_grant_execution_authority','rpc.build002_grant_mutation_lease','rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','EXECUTION_AUTHORITY_SCOPE','scope',public.build002_002e_fence_scope('EXECUTION_AUTHORITY_SCOPE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('scope','execution-authority'))));
  end if;
  if p_operation in ('rpc.build002_grant_mutation_lease','rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','MUTATION_LEASE_SCOPE','scope',public.build002_002e_fence_scope('MUTATION_LEASE_SCOPE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('scope','mutation-lease'))));
  end if;
  if p_operation in ('rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','EXECUTION_ATTEMPT_SCOPE','scope',public.build002_002e_fence_scope('EXECUTION_ATTEMPT_SCOPE',p_tenant=>v_tenant,p_transaction=>v_transaction,p_scope=>jsonb_build_object('attempt_id',coalesce(v_execution_attempt,v_mutation_lease)))));
  end if;
  if p_operation in ('rpc.build002_grant_mutation_lease','rpc.build002_admit_delegability','rpc.build002_reserve_execution_attempt','rpc.build002_grant_execution_authority') then
    v_fences := v_fences || jsonb_build_array(jsonb_build_object('kind','MEMBERSHIP_AUTHORITY','scope',public.build002_002e_fence_scope('MEMBERSHIP_AUTHORITY',p_tenant=>v_tenant,p_principal=>v_principal)));
  end if;

  return v_fences;
end;
$$;
revoke all on function public.build002_002e_derive_fences(text,jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_active_operation_valid()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_marker text := nullif(current_setting('build002.udre_active_operation',true),'');
  v_operation text;
  v_supplied text;
  v_secret bytea;
  v_expected text;
begin
  if v_marker is null or position('|' in v_marker)=0 then return false; end if;
  v_operation:=split_part(v_marker,'|',1);
  v_supplied:=split_part(v_marker,'|',2);
  select secret into strict v_secret from public.build002_002e_runtime_secret where singleton;
  v_expected:=encode(public.hmac(convert_to(v_operation||'|'||pg_catalog.txid_current()::text||'|'||pg_catalog.pg_backend_pid()::text,'UTF8'),v_secret,'sha256'),'hex');
  return v_supplied=v_expected;
exception when others then
  return false;
end;
$$;
revoke all on function public.build002_002e_active_operation_valid() from public, anon, authenticated, service_role;

create function public.build002_002e_assert_held_fence_set(p_held jsonb,p_required jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1 from (
      (select item->>'kind' kind,1 schema_version,item->'scope' scope from jsonb_array_elements(p_required) item
       except
       select item->>'kind',1,item->'scope' from jsonb_array_elements(p_held) item)
      union all
      (select item->>'kind',1,item->'scope' from jsonb_array_elements(p_held) item
       except
       select item->>'kind',1,item->'scope' from jsonb_array_elements(p_required) item)
    ) changed_fence
  ) then
    raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
  end if;
end;
$$;
revoke all on function public.build002_002e_assert_held_fence_set(jsonb,jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_route(
  p_operation text,
  p_classification text,
  p_context jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_fences jsonb := '[]'::jsonb;
  v_parents jsonb := '[]'::jsonb;
  v_rederived_fences jsonb := '[]'::jsonb;
  v_tenant uuid;
  v_transaction uuid;
  v_asset uuid;
  v_version uuid;
  v_previous_version uuid;
  v_principal uuid;
  v_member_principal uuid;
  v_membership uuid;
  v_study uuid;
  v_admission uuid;
  v_readiness_authority uuid;
  v_execution_authority uuid;
  v_mutation_lease uuid;
  v_execution_attempt uuid;
  v_reservation uuid;
  v_binding uuid;
  v_blueprint uuid;
  v_profile uuid;
  v_tx public.outcome_transactions%rowtype;
  v_asset_row public.assets%rowtype;
  v_membership_row public.tenant_memberships%rowtype;
  r record;
begin
  p_context := public.build002_002e_authorize_route(p_operation,p_context);
  v_tenant:=nullif(p_context->>'tenant_id','')::uuid;
  v_transaction:=nullif(p_context->>'transaction_id','')::uuid;
  v_asset:=nullif(p_context->>'asset_id','')::uuid;
  v_version:=nullif(p_context->>'version_id','')::uuid;
  v_previous_version:=nullif(p_context->>'previous_version_id','')::uuid;
  v_principal:=nullif(p_context->>'principal_id','')::uuid;
  v_member_principal:=coalesce(nullif(p_context->>'member_principal_id','')::uuid,v_principal);
  v_membership:=nullif(p_context->>'membership_id','')::uuid;
  v_study:=nullif(p_context->>'study_id','')::uuid;
  v_admission:=nullif(p_context->>'admission_id','')::uuid;
  v_readiness_authority:=nullif(p_context->>'readiness_authority_id','')::uuid;
  v_execution_authority:=nullif(p_context->>'execution_authority_id','')::uuid;
  v_mutation_lease:=nullif(p_context->>'mutation_lease_id','')::uuid;
  v_execution_attempt:=nullif(p_context->>'execution_attempt_id','')::uuid;
  v_reservation:=nullif(p_context->>'reservation_id','')::uuid;
  v_binding:=nullif(p_context->>'binding_id','')::uuid;
  v_blueprint:=nullif(p_context->>'blueprint_id','')::uuid;
  v_profile:=nullif(p_context->>'profile_id','')::uuid;

  if p_classification not in ('MATERIAL_WRITER', 'SYNCHRONIZED_WAIT_PARTICIPANT')
     or p_context is null or jsonb_typeof(p_context) <> 'object' then
    raise exception 'BUILD002_002E_INVALID_ROUTE';
  end if;

  -- Fixed operation allowlist: no caller-controlled fence identity exists.
  if p_operation not in (
    'direct.preservation_strategy_runs.insert', 'direct.field_outcomes.insert',
    'direct.assets.insert', 'direct.assets.update', 'direct.asset_versions.insert',
    'direct.outcome_transactions.insert', 'direct.outcome_transactions.update',
    'direct.partial_intents.insert', 'direct.transaction_patches.insert',
    'direct.mutation_leases.insert', 'direct.execution_runs.insert',
    'direct.evidence_receipts.insert', 'direct.verification_runs.insert',
    'direct.verification_criterion_evidence.insert', 'direct.state_commits.insert',
    'direct.cost_records.insert', 'direct.media_storage.insert',
    'direct.semantic_snapshots.insert', 'direct.candidate_assets.insert',
    'direct.preservation_runs.insert', 'direct.candidate_preferences.insert',
    'direct.preservation_study_cases.insert',
    'rpc.provision_personal_tenant', 'rpc.revoke_tenant_membership',
    'rpc.build002_grant_mutation_lease', 'rpc.build002_insert_dependency_snapshot',
    'rpc.build002_insert_signal_qualification', 'rpc.build002_insert_delegation_readiness',
    'rpc.build002_insert_signal_requirement', 'rpc.build002_insert_signal',
    'rpc.commit_accepted_field_outcome', 'rpc.build002_admit_delegability',
    'rpc.build002_reserve_execution_attempt', 'rpc.build002_consume_execution_attempt_reservation',
    'rpc.build002_grant_execution_authority', 'rpc.build002_commit_readiness_authority',
    'rpc.build002_publish_outcome_blueprint', 'rpc.build002_publish_outcome_requirement_profile',
    'rpc.create_tenant_asset_with_initial_version',
    'rpc.build002_bind_outcome_transaction_requirements'
  ) then
    raise exception 'BUILD002_002E_UNKNOWN_PROTECTED_OPERATION';
  end if;

  if p_operation = 'direct.preservation_study_cases.insert' and v_study is null then
    raise exception 'BUILD002_002E_STUDY_IDENTITY_REQUIRED';
  end if;

  -- Candidate discovery is authorized and canonicalized before synchronization.
  v_fences := public.build002_002e_derive_fences(p_operation,p_context);
  perform public.build002_002e_acquire_fences(v_fences);

  -- Rederive from current DB state while F0 is held, then compare the exact
  -- unordered (kind,schema,JSONB scope) sets. No late fence is ever acquired.
  p_context := public.build002_002e_rederive_context(p_operation,p_context);
  v_tenant:=nullif(p_context->>'tenant_id','')::uuid;
  v_transaction:=nullif(p_context->>'transaction_id','')::uuid;
  v_asset:=nullif(p_context->>'asset_id','')::uuid;
  v_version:=nullif(p_context->>'version_id','')::uuid;
  v_previous_version:=nullif(p_context->>'previous_version_id','')::uuid;
  v_principal:=nullif(p_context->>'principal_id','')::uuid;
  v_member_principal:=coalesce(nullif(p_context->>'member_principal_id','')::uuid,v_principal);
  v_membership:=nullif(p_context->>'membership_id','')::uuid;
  v_study:=nullif(p_context->>'study_id','')::uuid;
  v_admission:=nullif(p_context->>'admission_id','')::uuid;
  v_readiness_authority:=nullif(p_context->>'readiness_authority_id','')::uuid;
  v_execution_authority:=nullif(p_context->>'execution_authority_id','')::uuid;
  v_mutation_lease:=nullif(p_context->>'mutation_lease_id','')::uuid;
  v_execution_attempt:=nullif(p_context->>'execution_attempt_id','')::uuid;
  v_reservation:=nullif(p_context->>'reservation_id','')::uuid;
  v_binding:=nullif(p_context->>'binding_id','')::uuid;
  v_blueprint:=nullif(p_context->>'blueprint_id','')::uuid;
  v_profile:=nullif(p_context->>'profile_id','')::uuid;
  v_rederived_fences:=public.build002_002e_derive_fences(p_operation,p_context);
  perform public.build002_002e_assert_held_fence_set(v_fences,v_rederived_fences);
  p_context:=public.build002_002e_authorize_route(p_operation,p_context);

  -- Post-fence rederivation. A changed lineage would imply a new fence set, so
  -- this transaction fails closed and the caller must restart from discovery.
  if v_transaction is not null and p_operation <> 'direct.outcome_transactions.insert' then
    select * into v_tx from public.outcome_transactions where id = v_transaction;
    if not found or (v_tenant is not null and v_tx.owner_tenant_id is distinct from v_tenant)
       or (v_asset is not null and v_tx.asset_id is distinct from v_asset)
       or (v_version is not null and p_operation not in ('direct.asset_versions.insert','direct.state_commits.insert','rpc.create_tenant_asset_with_initial_version') and v_tx.base_version_id is distinct from v_version) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode = '40001';
    end if;
  end if;
  if v_asset is not null and p_operation not in ('direct.assets.insert','rpc.create_tenant_asset_with_initial_version') then
    select * into v_asset_row from public.assets where id = v_asset;
    if not found or (v_tenant is not null and v_asset_row.owner_tenant_id is distinct from v_tenant) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode = '40001';
    end if;
  end if;
  if v_membership is not null then
    select * into v_membership_row from public.tenant_memberships where id = v_membership;
    if not found or v_membership_row.tenant_id is distinct from v_tenant
       or (v_member_principal is not null and v_membership_row.principal_id is distinct from v_member_principal) then
      raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode = '40001';
    end if;
  end if;

  -- Complete canonical parent set, deduplicated and DB-sorted before locking.
  if v_version is not null and p_operation in (
    'direct.field_outcomes.insert','direct.assets.update','direct.outcome_transactions.insert',
    'direct.evidence_receipts.insert','direct.state_commits.insert','direct.candidate_assets.insert',
    'direct.preservation_runs.insert','direct.preservation_study_cases.insert',
    'rpc.build002_grant_mutation_lease','rpc.commit_accepted_field_outcome',
    'rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation',
    'rpc.build002_grant_execution_authority'
  ) then
    v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',0,'relation','asset_versions','id',v_version));
  end if;
  if v_previous_version is not null then
    v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',0,'relation','asset_versions','id',v_previous_version));
  end if;
  if v_asset is not null and p_operation in (
    'direct.asset_versions.insert','direct.outcome_transactions.insert','direct.state_commits.insert',
    'direct.media_storage.insert','rpc.build002_grant_mutation_lease','rpc.commit_accepted_field_outcome',
    'rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation',
    'rpc.build002_grant_execution_authority'
  ) then
    v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',1,'relation','assets','id',v_asset));
  end if;
  if v_admission is not null then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',2,'relation','build002_delegability_admissions','id',v_admission)); end if;
  if v_execution_authority is not null then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',6,'relation','build002_execution_authorities','id',v_execution_authority)); end if;
  if v_reservation is not null then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',5,'relation','build002_execution_attempt_reservations','id',v_reservation)); end if;
  if v_mutation_lease is not null and p_operation <> 'rpc.build002_grant_mutation_lease' then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',7,'relation','build002_mutation_leases','id',v_mutation_lease)); end if;
  if v_readiness_authority is not null then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',8,'relation','build002_readiness_authority_commits','id',v_readiness_authority)); end if;
  if nullif(p_context->>'field_outcome_id','') is not null then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',9,'relation','field_outcomes','id',(p_context->>'field_outcome_id')::uuid)); end if;
  if v_transaction is not null and p_operation in (
    'direct.preservation_strategy_runs.insert','direct.field_outcomes.insert','direct.partial_intents.insert',
    'direct.transaction_patches.insert','direct.mutation_leases.insert','direct.execution_runs.insert',
    'direct.evidence_receipts.insert','direct.verification_runs.insert','direct.verification_criterion_evidence.insert',
    'direct.state_commits.insert','direct.cost_records.insert','direct.semantic_snapshots.insert',
    'direct.candidate_assets.insert','direct.preservation_runs.insert','direct.candidate_preferences.insert',
    'direct.preservation_study_cases.insert','rpc.build002_grant_mutation_lease',
    'rpc.build002_insert_dependency_snapshot','rpc.build002_insert_signal_qualification',
    'rpc.build002_insert_delegation_readiness','rpc.build002_insert_signal_requirement','rpc.build002_insert_signal',
    'rpc.commit_accepted_field_outcome','rpc.build002_admit_delegability',
    'rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation',
    'rpc.build002_grant_execution_authority','rpc.build002_commit_readiness_authority',
    'rpc.build002_bind_outcome_transaction_requirements'
  ) then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',15,'relation','outcome_transactions','id',v_transaction)); end if;
  if v_membership is not null and p_operation in (
    'rpc.build002_grant_mutation_lease','rpc.build002_admit_delegability',
    'rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation',
    'rpc.build002_grant_execution_authority'
  ) then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',17,'relation','tenant_memberships','id',v_membership)); end if;
  if v_tenant is not null and (
    p_operation in (
      'direct.preservation_strategy_runs.insert','direct.field_outcomes.insert','direct.assets.insert',
      'direct.asset_versions.insert','direct.outcome_transactions.insert','direct.partial_intents.insert',
      'direct.transaction_patches.insert','direct.mutation_leases.insert','direct.execution_runs.insert',
      'direct.evidence_receipts.insert','direct.verification_runs.insert','direct.verification_criterion_evidence.insert',
      'direct.state_commits.insert','direct.cost_records.insert','direct.media_storage.insert',
      'direct.semantic_snapshots.insert','direct.candidate_assets.insert','direct.preservation_runs.insert',
      'direct.candidate_preferences.insert','rpc.build002_grant_mutation_lease',
      'rpc.build002_insert_dependency_snapshot','rpc.build002_insert_signal_qualification',
      'rpc.build002_insert_delegation_readiness','rpc.build002_insert_signal_requirement','rpc.build002_insert_signal',
      'rpc.commit_accepted_field_outcome','rpc.build002_admit_delegability',
      'rpc.build002_reserve_execution_attempt','rpc.build002_consume_execution_attempt_reservation',
      'rpc.build002_grant_execution_authority','rpc.build002_commit_readiness_authority',
      'rpc.build002_bind_outcome_transaction_requirements'
    ) or (p_operation='rpc.provision_personal_tenant' and exists (select 1 from public.tenants where id=v_tenant))
  ) then
    v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',18,'relation','tenants','id',v_tenant));
  end if;
  if v_study is not null then v_parents := v_parents || jsonb_build_array(jsonb_build_object('rank',20,'relation','preservation_value_studies','id',v_study)); end if;
  perform public.build002_002e_lock_parents(v_parents);

  -- Exact currentness guard after fences and complete parent acquisition.
  if v_transaction is not null and p_operation <> 'direct.outcome_transactions.insert' then
    perform 1 from public.outcome_transactions where id = v_transaction and owner_tenant_id = v_tenant;
    if not found then raise exception 'BUILD002_002E_CURRENTNESS_NOT_CURRENT'; end if;
  end if;

  -- Revisions are rollback-safe synchronization metadata only. They are not an
  -- authority token and do not use sequences, timestamps, or commit order.
  for r in
    select distinct public.build002_002e_fence_rank(item->>'kind') as fence_rank,
           item->>'kind' as kind, item->'scope' as scope
      from jsonb_array_elements(v_fences) item
     order by fence_rank, scope
  loop
    update public.build002_material_fences
       set serialization_revision = serialization_revision + 1,
           material_revision = material_revision + case when p_classification = 'MATERIAL_WRITER' then 1 else 0 end
     where fence_kind = r.kind
       and identity_schema_version = 1
       and canonical_scope_identity = r.scope;
  end loop;
end;
$$;

revoke all on function public.build002_002e_route(text,text,jsonb) from public, anon, authenticated, service_role;

create function public.build002_002e_direct_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_operation text := 'direct.' || tg_table_name || '.insert';
  v_classification text;
  v_tenant uuid := nullif(v_row->>'owner_tenant_id','')::uuid;
  v_transaction uuid := coalesce(nullif(v_row->>'transaction_id',''), nullif(v_row->>'outcome_transaction_id',''))::uuid;
  v_asset uuid := nullif(v_row->>'asset_id','')::uuid;
  v_version uuid;
  v_previous uuid;
  v_context jsonb;
begin
  -- A protected RPC has already acquired its complete superset. Re-entering a
  -- per-table subset would create a rank descent, so nested trigger routing is
  -- intentionally suppressed for that transaction-local call frame.
  if public.build002_002e_active_operation_valid() then
    return new;
  end if;

  if tg_table_name in ('field_outcomes','assets','asset_versions','outcome_transactions','partial_intents','transaction_patches') then
    v_classification := 'MATERIAL_WRITER';
  elsif tg_table_name in (
    'preservation_strategy_runs','mutation_leases','execution_runs','evidence_receipts',
    'verification_runs','verification_criterion_evidence','state_commits','cost_records',
    'media_storage','semantic_snapshots','candidate_assets','preservation_runs',
    'candidate_preferences','preservation_study_cases'
  ) then
    v_classification := 'SYNCHRONIZED_WAIT_PARTICIPANT';
  else
    raise exception 'BUILD002_002E_UNROUTED_DIRECT_INSERT';
  end if;

  if tg_table_name = 'asset_versions' then
    v_asset := (v_row->>'asset_id')::uuid;
    v_version := (v_row->>'id')::uuid;
    v_previous := nullif(v_row->>'parent_version_id','')::uuid;
  elsif tg_table_name = 'outcome_transactions' then
    v_transaction := (v_row->>'id')::uuid;
    v_asset := (v_row->>'asset_id')::uuid;
    v_version := (v_row->>'base_version_id')::uuid;
  elsif tg_table_name = 'assets' then
    v_asset := (v_row->>'id')::uuid;
    v_version := nullif(v_row->>'current_version_id','')::uuid;
  elsif tg_table_name in ('field_outcomes','candidate_assets','preservation_runs','preservation_study_cases') then
    v_version := (v_row->>'source_version_id')::uuid;
  elsif tg_table_name = 'evidence_receipts' then
    v_version := (v_row->>'base_version_id')::uuid;
  elsif tg_table_name = 'state_commits' then
    v_version := (v_row->>'new_version_id')::uuid;
    v_previous := nullif(v_row->>'previous_version_id','')::uuid;
  end if;

  if tg_table_name = 'media_storage' and v_asset is not null then
    select owner_tenant_id into v_tenant from public.assets where id=v_asset;
  end if;

  if v_transaction is not null and (v_tenant is null or v_asset is null or v_version is null) then
    select coalesce(v_tenant,owner_tenant_id),coalesce(v_asset,asset_id),coalesce(v_version,base_version_id)
      into v_tenant,v_asset,v_version
      from public.outcome_transactions
     where id = v_transaction;
  end if;
  if v_version is not null and v_asset is null then
    select asset_id into v_asset from public.asset_versions where id = v_version;
  end if;

  v_context := jsonb_strip_nulls(jsonb_build_object(
    'tenant_id', v_tenant,
    'project_id', nullif(v_row->>'project_id','')::uuid,
    'transaction_id', v_transaction,
    'asset_id', v_asset,
    'version_id', v_version,
    'previous_version_id', v_previous,
    'study_id', nullif(v_row->>'study_id','')::uuid
  ));
  v_context := public.build002_002e_authorize_route(v_operation,v_context);
  perform public.build002_002e_route(v_operation, v_classification, v_context);
  return new;
end;
$$;

revoke all on function public.build002_002e_direct_insert_guard() from public, anon, authenticated, service_role;

do $build002_002e_triggers$
declare
  v_table text;
begin
  foreach v_table in array array[
    'preservation_strategy_runs','field_outcomes','assets','asset_versions','outcome_transactions',
    'partial_intents','transaction_patches','mutation_leases','execution_runs','evidence_receipts',
    'verification_runs','verification_criterion_evidence','state_commits','cost_records','media_storage',
    'semantic_snapshots','candidate_assets','preservation_runs','candidate_preferences','preservation_study_cases'
  ] loop
    execute format('create trigger build002_002e_route_insert before insert on public.%I for each row execute function public.build002_002e_direct_insert_guard()', v_table);
  end loop;
end;
$build002_002e_triggers$;

create function public.build002_002e_reject_unrouted_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.build002_002e_active_operation_valid() then
    raise exception 'BUILD002_002E_DIRECT_UPDATE_REQUIRES_FIXED_RPC' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.build002_002e_reject_unrouted_update() from public, anon, authenticated, service_role;

create trigger build002_002e_route_asset_update
before update on public.assets
for each row execute function public.build002_002e_reject_unrouted_update();

create trigger build002_002e_route_transaction_update
before update on public.outcome_transactions
for each row execute function public.build002_002e_reject_unrouted_update();

create function public.build002_002e_enter(p_operation text, p_classification text, p_context jsonb)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_context jsonb;
  v_secret bytea;
  v_token text;
begin
  if public.build002_002e_active_operation_valid() then
    return false;
  end if;
  -- Every public wrapper reaches this fixed preauthorization boundary before
  -- route entry. Route deliberately reauthorizes the canonical context both
  -- before synchronization and after held-set verification.
  v_context := public.build002_002e_authorize_route(p_operation,p_context);
  perform public.build002_002e_route(p_operation,p_classification,v_context);
  select secret into strict v_secret from public.build002_002e_runtime_secret where singleton;
  v_token:=encode(public.hmac(convert_to(p_operation||'|'||pg_catalog.txid_current()::text||'|'||pg_catalog.pg_backend_pid()::text,'UTF8'),v_secret,'sha256'),'hex');
  perform set_config('build002.udre_active_operation',p_operation||'|'||v_token,true);
  return true;
end;
$$;

create function public.build002_002e_leave(p_entered boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_entered then perform set_config('build002.udre_active_operation','',true); end if;
end;
$$;

revoke all on function public.build002_002e_enter(text,text,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_leave(boolean) from public, anon, authenticated, service_role;

-- Preserve the existing implementations behind non-callable names. Public
-- wrappers below acquire the complete R10 route before entering legacy DML.
alter function public.revoke_tenant_membership(uuid,uuid) rename to build002_002e_inner_revoke_tenant_membership;
alter function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) rename to build002_002e_inner_grant_mutation_lease;
alter function public.build002_insert_dependency_snapshot(jsonb) rename to build002_002e_inner_insert_dependency_snapshot;
alter function public.build002_insert_signal_qualification(jsonb,uuid) rename to build002_002e_inner_insert_signal_qualification;
alter function public.build002_insert_delegation_readiness(jsonb,uuid,jsonb) rename to build002_002e_inner_insert_delegation_readiness;
alter function public.build002_insert_signal_requirement(jsonb) rename to build002_002e_inner_insert_signal_requirement;
alter function public.build002_insert_signal(jsonb) rename to build002_002e_inner_insert_signal;
alter function public.commit_accepted_field_outcome(uuid) rename to build002_002e_inner_commit_accepted_field_outcome;
alter function public.build002_admit_delegability(uuid,uuid,uuid,jsonb,jsonb) rename to build002_002e_inner_admit_delegability;
alter function public.build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb) rename to build002_002e_inner_reserve_execution_attempt;
alter function public.build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid) rename to build002_002e_inner_consume_execution_attempt_reservation;
alter function public.build002_grant_execution_authority(uuid,uuid,uuid,uuid,text) rename to build002_002e_inner_grant_execution_authority;
alter function public.build002_commit_readiness_authority(uuid,jsonb) rename to build002_002e_inner_commit_readiness_authority;
alter function public.build002_publish_outcome_blueprint(jsonb) rename to build002_002e_inner_publish_outcome_blueprint;
alter function public.build002_publish_outcome_requirement_profile(jsonb) rename to build002_002e_inner_publish_outcome_requirement_profile;
alter function public.build002_bind_outcome_transaction_requirements(jsonb) rename to build002_002e_inner_bind_outcome_transaction_requirements;

revoke all on function public.build002_002e_inner_revoke_tenant_membership(uuid,uuid) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_grant_mutation_lease(uuid,uuid,uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_insert_dependency_snapshot(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_insert_signal_qualification(jsonb,uuid) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_insert_delegation_readiness(jsonb,uuid,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_insert_signal_requirement(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_insert_signal(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_commit_accepted_field_outcome(uuid) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_admit_delegability(uuid,uuid,uuid,jsonb,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_grant_execution_authority(uuid,uuid,uuid,uuid,text) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_commit_readiness_authority(uuid,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_publish_outcome_blueprint(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_publish_outcome_requirement_profile(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_002e_inner_bind_outcome_transaction_requirements(jsonb) from public, anon, authenticated, service_role;

-- The canonical overlay replaces the five legacy SHARE table-lock clusters
-- with the exact fences and rows acquired above. This migration-time rewrite
-- operates only on the fixed, owner-only inner functions; no runtime dynamic
-- SQL or caller-controlled identifier is introduced.
do $build002_002e_narrow_legacy_locks$
declare
  v_signature regprocedure;
  v_definition text;
  v_narrowed text;
begin
  foreach v_signature in array array[
    'public.build002_002e_inner_grant_mutation_lease(uuid,uuid,uuid,text,text)'::regprocedure,
    'public.build002_grant_mutation_lease_r0(uuid,uuid,uuid,text,text)'::regprocedure,
    'public.build002_002e_inner_admit_delegability(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure,
    'public.build002_002e_inner_grant_execution_authority(uuid,uuid,uuid,uuid,text)'::regprocedure
  ] loop
    select pg_get_functiondef(v_signature) into v_definition;
    v_narrowed := regexp_replace(
      v_definition,
      'lock[[:space:]]+table[[:space:]]+public\.[a-zA-Z0-9_]+[[:space:]]+in[[:space:]]+share[[:space:]]+mode;',
      '',
      'gi'
    );
    if v_narrowed = v_definition then
      raise exception 'BUILD002_002E_EXPECTED_BROAD_LOCK_NOT_FOUND: %',v_signature;
    end if;
    execute v_narrowed;
  end loop;
end;
$build002_002e_narrow_legacy_locks$;

create function public.build002_insert_signal_requirement(p_requirement jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_insert_signal_requirement','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_requirement->>'owner_tenant_id','transaction_id',p_requirement->>'outcome_transaction_id',
    'blueprint_id',p_requirement->>'blueprint_id'));
  v_result := public.build002_002e_inner_insert_signal_requirement(p_requirement);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_insert_signal(p_signal jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_insert_signal','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_signal->>'owner_tenant_id','transaction_id',p_signal->>'outcome_transaction_id'));
  v_result := public.build002_002e_inner_insert_signal(p_signal);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_insert_dependency_snapshot(p_snapshot jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_insert_dependency_snapshot','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_snapshot->>'owner_tenant_id','transaction_id',p_snapshot->>'outcome_transaction_id'));
  v_result := public.build002_002e_inner_insert_dependency_snapshot(p_snapshot);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_insert_signal_qualification(p_qualification jsonb,p_dependency_snapshot_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_insert_signal_qualification','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_qualification->>'owner_tenant_id','transaction_id',p_qualification->>'outcome_transaction_id',
    'dependency_snapshot_id',p_dependency_snapshot_id));
  v_result := public.build002_002e_inner_insert_signal_qualification(p_qualification,p_dependency_snapshot_id);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_insert_delegation_readiness(p_readiness jsonb,p_dependency_snapshot_id uuid,p_qualification_ids jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_insert_delegation_readiness','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_readiness->>'owner_tenant_id','transaction_id',p_readiness->>'outcome_transaction_id',
    'dependency_snapshot_id',p_dependency_snapshot_id));
  v_result := public.build002_002e_inner_insert_delegation_readiness(p_readiness,p_dependency_snapshot_id,p_qualification_ids);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_commit_readiness_authority(p_principal_id uuid,p_commit jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb;
begin
  v_entered := public.build002_002e_enter('rpc.build002_commit_readiness_authority','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_commit->>'owner_tenant_id','transaction_id',p_commit->>'outcome_transaction_id',
    'principal_id',p_principal_id));
  v_result := public.build002_002e_inner_commit_readiness_authority(p_principal_id,p_commit);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_publish_outcome_blueprint(p_blueprint jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_publish_outcome_blueprint','MATERIAL_WRITER',jsonb_build_object(
    'blueprint_id',p_blueprint->>'id'));
  v_result := public.build002_002e_inner_publish_outcome_blueprint(p_blueprint);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_publish_outcome_requirement_profile(p_profile jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_publish_outcome_requirement_profile','MATERIAL_WRITER',jsonb_build_object(
    'blueprint_id',p_profile->'blueprint'->>'id','profile_id',p_profile->>'id'));
  v_result := public.build002_002e_inner_publish_outcome_requirement_profile(p_profile);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_bind_outcome_transaction_requirements(p_binding jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result uuid;
begin
  v_entered := public.build002_002e_enter('rpc.build002_bind_outcome_transaction_requirements','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_binding->>'owner_tenant_id','transaction_id',p_binding->>'outcome_transaction_id',
    'binding_id',coalesce(nullif(p_binding->>'id',''),p_binding->>'outcome_transaction_id'),
    'blueprint_id',p_binding->>'blueprint_id','profile_id',p_binding->>'requirement_profile_id'));
  v_result := public.build002_002e_inner_bind_outcome_transaction_requirements(p_binding);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.revoke_tenant_membership(p_membership_id uuid,p_actor_principal_id uuid)
returns table (id uuid, tenant_id uuid, principal_id uuid, role text, status text, created_at timestamptz, revoked_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_target public.tenant_memberships%rowtype;
begin
  select * into v_target from public.tenant_memberships where public.tenant_memberships.id = p_membership_id;
  if not found then return; end if;
  v_entered := public.build002_002e_enter('rpc.revoke_tenant_membership','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_target.tenant_id,'principal_id',p_actor_principal_id,
    'membership_id',p_membership_id,'member_principal_id',v_target.principal_id));
  perform 1 from public.tenant_memberships
   where public.tenant_memberships.id=p_membership_id
     and tenant_id=v_target.tenant_id and principal_id=v_target.principal_id;
  if not found then
    raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode='40001';
  end if;
  return query select * from public.build002_002e_inner_revoke_tenant_membership(p_membership_id,p_actor_principal_id);
  perform public.build002_002e_leave(v_entered);
end $$;

create function public.build002_admit_delegability(
  p_principal_id uuid,p_membership_id uuid,p_authority_commit_id uuid,p_admission jsonb,p_current_material jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb; v_tx public.outcome_transactions%rowtype;
begin
  select * into v_tx from public.outcome_transactions where id = nullif(p_admission->>'outcomeTransactionId','')::uuid;
  v_entered := public.build002_002e_enter('rpc.build002_admit_delegability','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_admission->>'ownerTenantId','transaction_id',p_admission->>'outcomeTransactionId',
    'principal_id',p_principal_id,'membership_id',p_membership_id,'readiness_authority_id',p_authority_commit_id,
    'asset_id',v_tx.asset_id,'version_id',v_tx.base_version_id));
  v_result := public.build002_002e_inner_admit_delegability(p_principal_id,p_membership_id,p_authority_commit_id,p_admission,p_current_material);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_grant_execution_authority(
  p_principal_id uuid,p_membership_id uuid,p_admission_id uuid,p_task_spec_id uuid,p_task_spec_hash text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb; v_admission public.build002_delegability_admissions%rowtype;
begin
  select * into v_admission from public.build002_delegability_admissions where admission_id = p_admission_id;
  v_entered := public.build002_002e_enter('rpc.build002_grant_execution_authority','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_admission.owner_tenant_id,'transaction_id',v_admission.outcome_transaction_id,
    'principal_id',p_principal_id,'membership_id',p_membership_id,'admission_id',p_admission_id,
    'readiness_authority_id',v_admission.authority_commit_id));
  v_result := public.build002_002e_inner_grant_execution_authority(p_principal_id,p_membership_id,p_admission_id,p_task_spec_id,p_task_spec_hash);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_grant_mutation_lease(
  p_principal_id uuid,p_membership_id uuid,p_execution_authority_id uuid,p_target_path text,p_category text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb; v_authority public.build002_execution_authorities%rowtype;
begin
  select * into v_authority from public.build002_execution_authorities where execution_authority_id = p_execution_authority_id;
  v_entered := public.build002_002e_enter('rpc.build002_grant_mutation_lease','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_authority.owner_tenant_id,'transaction_id',v_authority.outcome_transaction_id,
    'principal_id',p_principal_id,'membership_id',p_membership_id,
    'admission_id',v_authority.delegability_admission_id,'execution_authority_id',p_execution_authority_id,
    'readiness_authority_id',v_authority.authority_commit_id,'asset_id',v_authority.asset_id,
    'version_id',v_authority.source_asset_version_id));
  v_result := public.build002_002e_inner_grant_mutation_lease(p_principal_id,p_membership_id,p_execution_authority_id,p_target_path,p_category);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_reserve_execution_attempt(
  p_principal_id uuid,p_membership_id uuid,p_mutation_lease_id uuid,p_provider_target_path text,p_operation text,p_operation_value jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb; v_lease public.build002_mutation_leases%rowtype;
begin
  select * into v_lease from public.build002_mutation_leases where mutation_lease_id = p_mutation_lease_id;
  v_entered := public.build002_002e_enter('rpc.build002_reserve_execution_attempt','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_lease.owner_tenant_id,'transaction_id',v_lease.outcome_transaction_id,
    'principal_id',p_principal_id,'membership_id',p_membership_id,'mutation_lease_id',p_mutation_lease_id,
    'admission_id',v_lease.delegability_admission_id,'execution_authority_id',v_lease.execution_authority_id,
    'readiness_authority_id',v_lease.authority_commit_id,'asset_id',v_lease.asset_id,
    'version_id',v_lease.source_asset_version_id,'execution_attempt_id',p_mutation_lease_id));
  v_result := public.build002_002e_inner_reserve_execution_attempt(p_principal_id,p_membership_id,p_mutation_lease_id,p_provider_target_path,p_operation,p_operation_value);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.build002_consume_execution_attempt_reservation(
  p_principal_id uuid,p_membership_id uuid,p_reservation_id uuid,p_execution_attempt_id uuid
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb; v_reservation public.build002_execution_attempt_reservations%rowtype;
begin
  select * into v_reservation from public.build002_execution_attempt_reservations where reservation_id = p_reservation_id;
  v_entered := public.build002_002e_enter('rpc.build002_consume_execution_attempt_reservation','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_reservation.owner_tenant_id,'transaction_id',v_reservation.outcome_transaction_id,
    'principal_id',p_principal_id,'membership_id',p_membership_id,'reservation_id',p_reservation_id,
    'mutation_lease_id',v_reservation.mutation_lease_id,'admission_id',v_reservation.delegability_admission_id,
    'execution_authority_id',v_reservation.execution_authority_id,'readiness_authority_id',v_reservation.authority_commit_id,
    'asset_id',v_reservation.asset_id,'version_id',v_reservation.source_asset_version_id,
    'execution_attempt_id',p_execution_attempt_id));
  v_result := public.build002_002e_inner_consume_execution_attempt_reservation(p_principal_id,p_membership_id,p_reservation_id,p_execution_attempt_id);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create function public.commit_accepted_field_outcome(p_field_outcome_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_entered boolean; v_result jsonb; v_field public.field_outcomes%rowtype; v_tx public.outcome_transactions%rowtype;
begin
  select * into v_field from public.field_outcomes where id = p_field_outcome_id;
  if not found then
    return public.build002_002e_inner_commit_accepted_field_outcome(p_field_outcome_id);
  end if;
  select * into v_tx from public.outcome_transactions where id = v_field.transaction_id;
  v_entered := public.build002_002e_enter('rpc.commit_accepted_field_outcome','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_field.owner_tenant_id,'transaction_id',v_field.transaction_id,'asset_id',v_tx.asset_id,
    'version_id',v_field.source_version_id,'field_outcome_id',p_field_outcome_id));
  v_result := public.build002_002e_inner_commit_accepted_field_outcome(p_field_outcome_id);
  perform public.build002_002e_leave(v_entered); return v_result;
end $$;

create or replace function public.provision_personal_tenant(p_principal_id uuid)
returns table (
  tenant_id uuid, principal_id uuid, membership_id uuid,
  tenant_created_at timestamptz, tenant_updated_at timestamptz,
  membership_created_at timestamptz
)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_tenant public.tenants%rowtype;
  v_membership public.tenant_memberships%rowtype;
  v_candidate_tenant uuid := gen_random_uuid();
  v_entered boolean;
begin
  select t.* into v_tenant
    from public.tenants t
    join public.tenant_memberships m on m.tenant_id = t.id
   where m.principal_id = p_principal_id and m.role = 'OWNER' and m.status = 'ACTIVE'
     and t.kind = 'PERSONAL' and t.status = 'ACTIVE'
   order by t.created_at limit 1;
  v_candidate_tenant := coalesce(v_tenant.id, v_candidate_tenant);

  v_entered := public.build002_002e_enter('rpc.provision_personal_tenant','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',v_candidate_tenant,'principal_id',p_principal_id,'member_principal_id',p_principal_id));

  -- Re-discover after the principal fence. A concurrent different preallocation
  -- is a late fence identity and therefore forces a clean full-transaction retry.
  select t.* into v_tenant
    from public.tenants t
    join public.tenant_memberships m on m.tenant_id = t.id
   where m.principal_id = p_principal_id and m.role = 'OWNER' and m.status = 'ACTIVE'
     and t.kind = 'PERSONAL' and t.status = 'ACTIVE'
   order by t.created_at limit 1;
  if found and v_tenant.id is distinct from v_candidate_tenant then
    raise exception 'BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED' using errcode = '40001';
  end if;

  if not found then
    insert into public.tenants(id,kind,personal_owner_principal_id,status)
    values (v_candidate_tenant,'PERSONAL',p_principal_id,'ACTIVE') returning * into v_tenant;
    insert into public.tenant_memberships(tenant_id,principal_id,role,status)
    values (v_tenant.id,p_principal_id,'OWNER','ACTIVE') returning * into v_membership;
  else
    select * into v_membership from public.tenant_memberships
     where tenant_id = v_tenant.id and public.tenant_memberships.principal_id = p_principal_id
       and status = 'ACTIVE' limit 1;
  end if;
  perform public.build002_002e_leave(v_entered);
  return query select v_tenant.id,p_principal_id,v_membership.id,v_tenant.created_at,v_tenant.updated_at,v_membership.created_at;
end $$;

create or replace function public.create_tenant_asset_with_initial_version(
  p_project_id uuid,p_name text,p_description text,p_initial_state jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor uuid := auth.uid();
  project_owner uuid;
  created_asset public.assets%rowtype;
  created_version public.asset_versions%rowtype;
  v_asset_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_entered boolean;
begin
  if actor is null then raise exception 'TRUST_AUTHENTICATION_REQUIRED' using errcode = '42501'; end if;
  select owner_tenant_id into project_owner from public.projects where id = p_project_id;
  if project_owner is null or not exists (
    select 1 from public.tenant_memberships m join public.tenants t on t.id=m.tenant_id
     where m.tenant_id=project_owner and m.principal_id=actor and m.status='ACTIVE' and t.status='ACTIVE'
  ) then raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode = '42501'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 200 then raise exception 'TRUST_INVALID_ASSET_NAME'; end if;

  v_entered := public.build002_002e_enter('rpc.create_tenant_asset_with_initial_version','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',project_owner,'asset_id',v_asset_id,'version_id',v_version_id,'principal_id',actor));
  perform 1 from public.projects where id=p_project_id and owner_tenant_id=project_owner;
  if not found then raise exception 'BUILD002_002E_CURRENTNESS_NOT_CURRENT'; end if;

  insert into public.assets(id,owner_tenant_id,project_id,name,description)
  values (v_asset_id,project_owner,p_project_id,btrim(p_name),p_description) returning * into created_asset;
  insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state,parent_version_id)
  values (v_version_id,project_owner,v_asset_id,1,coalesce(p_initial_state,'{}'::jsonb),null) returning * into created_version;
  update public.assets set current_version_id=v_version_id,updated_at=now()
   where id=v_asset_id returning * into created_asset;
  perform public.build002_002e_leave(v_entered);
  return jsonb_build_object('asset',to_jsonb(created_asset),'version',to_jsonb(created_version));
end $$;

create function public.build002_002e_update_asset(p_asset_id uuid,p_owner_tenant_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_asset public.assets%rowtype; v_entered boolean;
begin
  if p_patch is null or jsonb_typeof(p_patch)<>'object'
     or exists (select 1 from jsonb_object_keys(p_patch) key
                 where key not in ('project_id','name','description','current_version_id')) then
    raise exception 'TRUST_INVALID_ASSET_PATCH' using errcode='42501';
  end if;
  select * into v_asset from public.assets where id=p_asset_id and owner_tenant_id=p_owner_tenant_id;
  if not found then raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode='42501'; end if;
  if auth.uid() is not null and not exists (
    select 1 from public.tenant_memberships m join public.tenants t on t.id=m.tenant_id
     where m.tenant_id=p_owner_tenant_id and m.principal_id=auth.uid() and m.status='ACTIVE' and t.status='ACTIVE'
  ) then raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode='42501'; end if;
  v_entered := public.build002_002e_enter('direct.assets.update','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_owner_tenant_id,'asset_id',p_asset_id,
    'project_id',coalesce(nullif(p_patch->>'project_id','')::uuid,v_asset.project_id),
    'version_id',coalesce(nullif(p_patch->>'current_version_id','')::uuid,v_asset.current_version_id)));
  update public.assets set
    project_id=case when p_patch ? 'project_id' then (p_patch->>'project_id')::uuid else project_id end,
    name=case when p_patch ? 'name' then p_patch->>'name' else name end,
    description=case when p_patch ? 'description' then p_patch->>'description' else description end,
    current_version_id=case when p_patch ? 'current_version_id' then nullif(p_patch->>'current_version_id','')::uuid else current_version_id end
   where id=p_asset_id and owner_tenant_id=p_owner_tenant_id returning * into v_asset;
  perform public.build002_002e_leave(v_entered); return to_jsonb(v_asset);
end $$;

create function public.build002_002e_update_outcome_transaction(
  p_transaction_id uuid,p_owner_tenant_id uuid,p_patch jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_tx public.outcome_transactions%rowtype; v_entered boolean;
begin
  if p_patch is null or jsonb_typeof(p_patch)<>'object'
     or exists (select 1 from jsonb_object_keys(p_patch) key
                 where key not in ('status','abort_reason','completed_at')) then
    raise exception 'TRUST_INVALID_TRANSACTION_PATCH' using errcode='42501';
  end if;
  select * into v_tx from public.outcome_transactions where id=p_transaction_id and owner_tenant_id=p_owner_tenant_id;
  if not found then raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode='42501'; end if;
  if auth.uid() is not null and not exists (
    select 1 from public.tenant_memberships m join public.tenants t on t.id=m.tenant_id
     where m.tenant_id=p_owner_tenant_id and m.principal_id=auth.uid() and m.status='ACTIVE' and t.status='ACTIVE'
  ) then raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode='42501'; end if;
  v_entered := public.build002_002e_enter('direct.outcome_transactions.update','MATERIAL_WRITER',jsonb_build_object(
    'tenant_id',p_owner_tenant_id,'transaction_id',p_transaction_id,'asset_id',v_tx.asset_id,'version_id',v_tx.base_version_id));
  update public.outcome_transactions set
    status=case when p_patch ? 'status' then p_patch->>'status' else status end,
    abort_reason=case when p_patch ? 'abort_reason' then p_patch->>'abort_reason' else abort_reason end,
    completed_at=case when p_patch ? 'completed_at' then (p_patch->>'completed_at')::timestamptz else completed_at end
   where id=p_transaction_id and owner_tenant_id=p_owner_tenant_id returning * into v_tx;
  perform public.build002_002e_leave(v_entered); return to_jsonb(v_tx);
end $$;

revoke all on function public.provision_personal_tenant(uuid) from public, anon, authenticated;
grant execute on function public.provision_personal_tenant(uuid) to service_role;
revoke all on function public.revoke_tenant_membership(uuid,uuid) from public, anon, authenticated;
grant execute on function public.revoke_tenant_membership(uuid,uuid) to service_role;

revoke all on function public.create_tenant_asset_with_initial_version(uuid,text,text,jsonb) from public, anon;
grant execute on function public.create_tenant_asset_with_initial_version(uuid,text,text,jsonb) to authenticated;
revoke all on function public.commit_accepted_field_outcome(uuid) from public, anon;
grant execute on function public.commit_accepted_field_outcome(uuid) to authenticated;

revoke all on function public.build002_insert_signal_requirement(jsonb) from public, anon, authenticated;
revoke all on function public.build002_insert_signal(jsonb) from public, anon, authenticated;
revoke all on function public.build002_insert_dependency_snapshot(jsonb) from public, anon, authenticated;
revoke all on function public.build002_insert_signal_qualification(jsonb,uuid) from public, anon, authenticated;
revoke all on function public.build002_insert_delegation_readiness(jsonb,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.build002_commit_readiness_authority(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.build002_admit_delegability(uuid,uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.build002_grant_execution_authority(uuid,uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.build002_publish_outcome_blueprint(jsonb) from public, anon, authenticated;
revoke all on function public.build002_publish_outcome_requirement_profile(jsonb) from public, anon, authenticated;
revoke all on function public.build002_bind_outcome_transaction_requirements(jsonb) from public, anon, authenticated;

grant execute on function public.build002_insert_signal_requirement(jsonb) to service_role;
grant execute on function public.build002_insert_signal(jsonb) to service_role;
grant execute on function public.build002_insert_dependency_snapshot(jsonb) to service_role;
grant execute on function public.build002_insert_signal_qualification(jsonb,uuid) to service_role;
grant execute on function public.build002_insert_delegation_readiness(jsonb,uuid,jsonb) to service_role;
grant execute on function public.build002_commit_readiness_authority(uuid,jsonb) to service_role;
grant execute on function public.build002_admit_delegability(uuid,uuid,uuid,jsonb,jsonb) to service_role;
grant execute on function public.build002_grant_execution_authority(uuid,uuid,uuid,uuid,text) to service_role;
grant execute on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.build002_publish_outcome_blueprint(jsonb) to service_role;
grant execute on function public.build002_publish_outcome_requirement_profile(jsonb) to service_role;
grant execute on function public.build002_bind_outcome_transaction_requirements(jsonb) to service_role;

revoke all on function public.build002_002e_update_asset(uuid,uuid,jsonb) from public, anon;
revoke all on function public.build002_002e_update_outcome_transaction(uuid,uuid,jsonb) from public, anon;
grant execute on function public.build002_002e_update_asset(uuid,uuid,jsonb) to authenticated, service_role;
grant execute on function public.build002_002e_update_outcome_transaction(uuid,uuid,jsonb) to authenticated, service_role;

comment on table public.build002_material_fences is
  'BUILD002 002-E R10 synchronization only; rows and revisions grant no application authority.';
