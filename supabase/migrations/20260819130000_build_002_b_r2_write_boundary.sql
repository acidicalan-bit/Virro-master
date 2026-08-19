-- BUILD 002-B R2: exclusive authoritative write boundary.
-- R1 history remains unchanged. All productive writes enter through these
-- five SECURITY DEFINER functions; domain hashes remain TypeScript-owned.

create or replace function public.build002_insert_signal_requirement(p_requirement jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := coalesce(nullif(p_requirement->>'id', '')::uuid, gen_random_uuid());
begin
  insert into public.build002_signal_requirements(
    id, owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type,
    critical, accepted_provenance, qualification_rule, dependency_selectors,
    blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash,
    schema_version, requirement_definition_hash, created_at
  ) values (
    v_id, (p_requirement->>'owner_tenant_id')::uuid,
    (p_requirement->>'outcome_transaction_id')::uuid,
    p_requirement->>'requirement_id', p_requirement->>'semantic_type',
    (p_requirement->>'critical')::boolean, p_requirement->'accepted_provenance',
    p_requirement->'qualification_rule', p_requirement->'dependency_selectors',
    (p_requirement->>'blueprint_id')::uuid, (p_requirement->>'blueprint_version')::integer,
    p_requirement->>'blueprint_hash', nullif(p_requirement->>'policy_id', ''),
    nullif(p_requirement->>'policy_hash', ''), p_requirement->>'schema_version',
    p_requirement->>'requirement_definition_hash', (p_requirement->>'created_at')::timestamptz
  );
  return v_id;
end;
$$;

create or replace function public.build002_insert_signal(p_signal jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_signal_id uuid := (p_signal->>'signal_id')::uuid;
begin
  insert into public.build002_signals(
    signal_id, owner_tenant_id, outcome_transaction_id, requirement_id,
    requirement_definition_hash, payload, source, provenance, captured_at,
    valid_until, dependency_identity, dependency_hash, schema_version, content_hash
  ) values (
    v_signal_id, (p_signal->>'owner_tenant_id')::uuid,
    (p_signal->>'outcome_transaction_id')::uuid, p_signal->>'requirement_id',
    p_signal->>'requirement_definition_hash', p_signal->'payload', p_signal->'source',
    p_signal->>'provenance', (p_signal->>'captured_at')::timestamptz,
    nullif(p_signal->>'valid_until', '')::timestamptz,
    p_signal->>'dependency_identity', p_signal->>'dependency_hash',
    p_signal->>'schema_version', p_signal->>'content_hash'
  );
  return v_signal_id;
end;
$$;

create or replace function public.build002_insert_dependency_snapshot(p_snapshot jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_tenant_id uuid := (p_snapshot->>'owner_tenant_id')::uuid;
  v_transaction_id uuid := (p_snapshot->>'outcome_transaction_id')::uuid;
  v_snapshot_id uuid;
begin
  insert into public.build002_dependency_snapshots(
    owner_tenant_id, outcome_transaction_id, requirement_definition_hashes,
    signal_references, dependency_bindings, blueprint_hash, policy_hash,
    task_spec_hash, transaction_semantic_hash, source_asset_version_hash,
    context_lens_hash, schema_version, dependency_snapshot_hash
  ) values (
    v_owner_tenant_id, v_transaction_id, p_snapshot->'requirement_definition_hashes',
    p_snapshot->'signal_references', p_snapshot->'dependency_bindings',
    nullif(p_snapshot->>'blueprint_hash', ''), nullif(p_snapshot->>'policy_hash', ''),
    nullif(p_snapshot->>'task_spec_hash', ''), nullif(p_snapshot->>'transaction_semantic_hash', ''),
    nullif(p_snapshot->>'source_asset_version_hash', ''), nullif(p_snapshot->>'context_lens_hash', ''),
    p_snapshot->>'schema_version', p_snapshot->>'dependency_snapshot_hash'
  ) returning id into v_snapshot_id;

  insert into public.build002_dependency_requirements(
    owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, requirement_definition_hash
  )
  select v_owner_tenant_id, v_transaction_id, v_snapshot_id, value
  from jsonb_array_elements_text(p_snapshot->'requirement_definition_hashes');

  insert into public.build002_dependency_signals(
    owner_tenant_id, outcome_transaction_id, dependency_snapshot_id,
    signal_id, signal_content_hash, requirement_id
  )
  select v_owner_tenant_id, v_transaction_id, v_snapshot_id,
    (reference->>'signalId')::uuid, reference->>'contentHash', reference->>'requirementId'
  from jsonb_array_elements(p_snapshot->'signal_references') reference;

  return v_snapshot_id;
end;
$$;

create or replace function public.build002_insert_signal_qualification(
  p_qualification jsonb,
  p_dependency_snapshot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_tenant_id uuid := (p_qualification->>'owner_tenant_id')::uuid;
  v_transaction_id uuid := (p_qualification->>'outcome_transaction_id')::uuid;
  v_requirement_id text := p_qualification->>'requirement_id';
  v_dependency_hash text;
  v_expected_count integer;
  v_qualification_id uuid := (p_qualification->>'id')::uuid;
begin
  select dependency_snapshot_hash into v_dependency_hash
  from public.build002_dependency_snapshots
  where owner_tenant_id = v_owner_tenant_id
    and outcome_transaction_id = v_transaction_id
    and id = p_dependency_snapshot_id;
  if v_dependency_hash is null or v_dependency_hash <> p_qualification->>'dependency_snapshot_hash' then
    raise exception 'BUILD002_QUALIFICATION_DEPENDENCY_BINDING_MISMATCH';
  end if;

  select count(*)::integer into v_expected_count
  from public.build002_dependency_signals
  where owner_tenant_id = v_owner_tenant_id
    and outcome_transaction_id = v_transaction_id
    and dependency_snapshot_id = p_dependency_snapshot_id
    and requirement_id = v_requirement_id;
  if jsonb_typeof(p_qualification->'signalIds') <> 'array'
    or jsonb_typeof(p_qualification->'signalContentHashes') <> 'array'
    or jsonb_array_length(p_qualification->'signalIds') <> v_expected_count
    or jsonb_array_length(p_qualification->'signalContentHashes') <> v_expected_count
    or exists (select 1 from jsonb_array_elements_text(p_qualification->'signalIds') x group by x.value having count(*) > 1)
    or exists (select 1 from jsonb_array_elements_text(p_qualification->'signalContentHashes') x group by x.value having count(*) > 1)
  then
    raise exception 'BUILD002_QUALIFICATION_SIGNAL_SET_MISMATCH';
  end if;

  if exists (
    select 1 from public.build002_dependency_signals link
    where link.owner_tenant_id = v_owner_tenant_id
      and link.outcome_transaction_id = v_transaction_id
      and link.dependency_snapshot_id = p_dependency_snapshot_id
      and link.requirement_id = v_requirement_id
      and not exists (select 1 from jsonb_array_elements_text(p_qualification->'signalIds') x where x.value = link.signal_id::text)
  ) or exists (
    select 1 from public.build002_dependency_signals link
    where link.owner_tenant_id = v_owner_tenant_id
      and link.outcome_transaction_id = v_transaction_id
      and link.dependency_snapshot_id = p_dependency_snapshot_id
      and link.requirement_id = v_requirement_id
      and not exists (select 1 from jsonb_array_elements_text(p_qualification->'signalContentHashes') x where x.value = link.signal_content_hash)
  ) or exists (
    select 1 from jsonb_array_elements_text(p_qualification->'signalIds') x
    where not exists (
      select 1 from public.build002_dependency_signals link
      where link.owner_tenant_id = v_owner_tenant_id
        and link.outcome_transaction_id = v_transaction_id
        and link.dependency_snapshot_id = p_dependency_snapshot_id
        and link.requirement_id = v_requirement_id
        and link.signal_id = x.value::uuid
    )
  ) or exists (
    select 1 from jsonb_array_elements_text(p_qualification->'signalContentHashes') x
    where not exists (
      select 1 from public.build002_dependency_signals link
      where link.owner_tenant_id = v_owner_tenant_id
        and link.outcome_transaction_id = v_transaction_id
        and link.dependency_snapshot_id = p_dependency_snapshot_id
        and link.requirement_id = v_requirement_id
        and link.signal_content_hash = x.value
    )
  ) then
    raise exception 'BUILD002_QUALIFICATION_SIGNAL_SET_MISMATCH';
  end if;

  insert into public.build002_signal_qualifications(
    id, owner_tenant_id, outcome_transaction_id, requirement_id,
    requirement_definition_hash, dependency_snapshot_id, dependency_snapshot_hash,
    signal_ids, signal_content_hashes, evaluator, outcome, reason_code,
    evidence_valid_until, qualified_at, schema_version, qualification_content_hash
  ) values (
    v_qualification_id, v_owner_tenant_id, v_transaction_id, v_requirement_id,
    p_qualification->>'requirement_definition_hash', p_dependency_snapshot_id, v_dependency_hash,
    p_qualification->'signalIds', p_qualification->'signalContentHashes', p_qualification->'evaluator',
    p_qualification->>'outcome', p_qualification->>'reason_code',
    nullif(p_qualification->>'evidence_valid_until', '')::timestamptz,
    (p_qualification->>'qualified_at')::timestamptz, p_qualification->>'schema_version',
    p_qualification->>'qualification_content_hash'
  );

  insert into public.build002_qualification_signals(
    owner_tenant_id, outcome_transaction_id, qualification_id,
    qualification_content_hash, signal_id, signal_content_hash, requirement_id
  )
  select v_owner_tenant_id, v_transaction_id, v_qualification_id,
    p_qualification->>'qualification_content_hash', link.signal_id,
    link.signal_content_hash, link.requirement_id
  from public.build002_dependency_signals link
  where link.owner_tenant_id = v_owner_tenant_id
    and link.outcome_transaction_id = v_transaction_id
    and link.dependency_snapshot_id = p_dependency_snapshot_id
    and link.requirement_id = v_requirement_id;

  return v_qualification_id;
end;
$$;

create or replace function public.build002_insert_delegation_readiness(
  p_readiness jsonb,
  p_dependency_snapshot_id uuid,
  p_qualification_ids jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_tenant_id uuid := (p_readiness->>'owner_tenant_id')::uuid;
  v_transaction_id uuid := (p_readiness->>'outcome_transaction_id')::uuid;
  v_dependency_hash text;
  v_readiness_id uuid := (p_readiness->>'id')::uuid;
  v_expected_count integer;
begin
  select dependency_snapshot_hash into v_dependency_hash
  from public.build002_dependency_snapshots
  where owner_tenant_id = v_owner_tenant_id
    and outcome_transaction_id = v_transaction_id
    and id = p_dependency_snapshot_id;
  if v_dependency_hash is null or v_dependency_hash <> p_readiness->>'dependency_snapshot_hash' then
    raise exception 'BUILD002_READINESS_DEPENDENCY_BINDING_MISMATCH';
  end if;
  if jsonb_typeof(p_qualification_ids) <> 'array' then
    raise exception 'BUILD002_READINESS_QUALIFICATION_SET_MISMATCH';
  end if;

  select count(*)::integer into v_expected_count
  from public.build002_dependency_requirements
  where owner_tenant_id = v_owner_tenant_id
    and outcome_transaction_id = v_transaction_id
    and dependency_snapshot_id = p_dependency_snapshot_id;
  if jsonb_array_length(p_qualification_ids) <> v_expected_count
    or exists (select 1 from jsonb_array_elements_text(p_qualification_ids) x group by x.value having count(*) > 1)
  then
    raise exception 'BUILD002_READINESS_QUALIFICATION_SET_MISMATCH';
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_qualification_ids) selected
    where not exists (
      select 1 from public.build002_signal_qualifications qualification
      where qualification.owner_tenant_id = v_owner_tenant_id
        and qualification.outcome_transaction_id = v_transaction_id
        and qualification.id = selected.value::uuid
        and qualification.dependency_snapshot_id = p_dependency_snapshot_id
        and qualification.dependency_snapshot_hash = v_dependency_hash
    )
  ) or exists (
    select 1 from public.build002_dependency_requirements requirement
    where requirement.owner_tenant_id = v_owner_tenant_id
      and requirement.outcome_transaction_id = v_transaction_id
      and requirement.dependency_snapshot_id = p_dependency_snapshot_id
      and not exists (
        select 1
        from public.build002_signal_qualifications qualification
        join jsonb_array_elements_text(p_qualification_ids) selected on selected.value::uuid = qualification.id
        where qualification.owner_tenant_id = v_owner_tenant_id
          and qualification.outcome_transaction_id = v_transaction_id
          and qualification.dependency_snapshot_id = p_dependency_snapshot_id
          and qualification.dependency_snapshot_hash = v_dependency_hash
          and qualification.requirement_definition_hash = requirement.requirement_definition_hash
      )
  ) or exists (
    select 1
    from public.build002_signal_qualifications qualification
    join jsonb_array_elements_text(p_qualification_ids) selected on selected.value::uuid = qualification.id
    where qualification.owner_tenant_id = v_owner_tenant_id
      and qualification.outcome_transaction_id = v_transaction_id
      and not exists (
        select 1 from public.build002_dependency_requirements requirement
        where requirement.owner_tenant_id = v_owner_tenant_id
          and requirement.outcome_transaction_id = v_transaction_id
          and requirement.dependency_snapshot_id = p_dependency_snapshot_id
          and requirement.requirement_definition_hash = qualification.requirement_definition_hash
      )
  ) then
    raise exception 'BUILD002_READINESS_QUALIFICATION_SET_MISMATCH';
  end if;

  insert into public.build002_delegation_readiness(
    id, owner_tenant_id, outcome_transaction_id, requirement_set_hash,
    qualification_set_hash, dependency_snapshot_id, dependency_snapshot_hash,
    task_spec_hash, source_asset_version_hash, blueprint_hash, policy_hash,
    evaluator, state, blocking_codes, condition_codes, created_at, valid_until,
    schema_version, readiness_content_hash
  ) values (
    v_readiness_id, v_owner_tenant_id, v_transaction_id,
    p_readiness->>'requirement_set_hash', p_readiness->>'qualification_set_hash',
    p_dependency_snapshot_id, v_dependency_hash,
    nullif(p_readiness->>'task_spec_hash', ''), nullif(p_readiness->>'source_asset_version_hash', ''),
    nullif(p_readiness->>'blueprint_hash', ''), nullif(p_readiness->>'policy_hash', ''),
    p_readiness->'evaluator', p_readiness->>'state', p_readiness->'blocking_codes',
    p_readiness->'condition_codes', (p_readiness->>'created_at')::timestamptz,
    nullif(p_readiness->>'valid_until', '')::timestamptz,
    p_readiness->>'schema_version', p_readiness->>'readiness_content_hash'
  );

  insert into public.build002_readiness_qualifications(
    owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash,
    qualification_id, qualification_content_hash
  )
  select v_owner_tenant_id, v_transaction_id, v_readiness_id,
    p_readiness->>'readiness_content_hash', qualification.id, qualification.qualification_content_hash
  from public.build002_signal_qualifications qualification
  join jsonb_array_elements_text(p_qualification_ids) selected on qualification.id = selected.value::uuid
  where qualification.owner_tenant_id = v_owner_tenant_id
    and qualification.outcome_transaction_id = v_transaction_id;

  return v_readiness_id;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'build002_signal_requirements', 'build002_dependency_snapshots', 'build002_signals',
    'build002_dependency_requirements', 'build002_dependency_signals', 'build002_signal_qualifications',
    'build002_qualification_signals', 'build002_delegation_readiness', 'build002_readiness_qualifications'
  ] loop
    execute format('revoke insert on table public.%I from service_role', table_name);
  end loop;
end $$;

revoke execute on function public.build002_insert_signal_requirement(jsonb) from public, anon, authenticated;
revoke execute on function public.build002_insert_signal(jsonb) from public, anon, authenticated;
revoke execute on function public.build002_insert_dependency_snapshot(jsonb) from public, anon, authenticated;
revoke execute on function public.build002_insert_signal_qualification(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.build002_insert_delegation_readiness(jsonb, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.build002_insert_signal_requirement(jsonb) to service_role;
grant execute on function public.build002_insert_signal(jsonb) to service_role;
grant execute on function public.build002_insert_dependency_snapshot(jsonb) to service_role;
grant execute on function public.build002_insert_signal_qualification(jsonb, uuid) to service_role;
grant execute on function public.build002_insert_delegation_readiness(jsonb, uuid, jsonb) to service_role;
