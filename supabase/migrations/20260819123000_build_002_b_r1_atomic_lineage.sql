-- BUILD 002-B R1: exact relational lineage and atomic persistence boundaries.
-- The original BUILD 002-B migration is intentionally preserved unchanged.

alter table public.build002_signal_requirements
  add constraint build002_requirements_exact_address_uq
  unique (owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash);

alter table public.build002_signals
  add constraint build002_signals_exact_address_uq
  unique (owner_tenant_id, outcome_transaction_id, signal_id, content_hash, requirement_id);

alter table public.build002_signals
  drop constraint if exists build002_signals_owner_tenant_id_outcome_transaction_id_requirement_definition_hash_fkey,
  add constraint build002_signals_exact_requirement_fk
    foreign key (owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash)
    references public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash)
    on delete restrict;

alter table public.build002_signal_qualifications
  drop constraint if exists build002_signal_qualifications_owner_tenant_id_outcome_transaction_id_requirement_definition_hash_fkey,
  add constraint build002_qualifications_exact_requirement_fk
    foreign key (owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash)
    references public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash)
    on delete restrict;

alter table public.build002_dependency_signals
  drop constraint if exists build002_dependency_signals_owner_tenant_id_outcome_transaction_id_signal_id_fkey,
  add constraint build002_dependency_signals_exact_signal_fk
    foreign key (owner_tenant_id, outcome_transaction_id, signal_id, signal_content_hash, requirement_id)
    references public.build002_signals(owner_tenant_id, outcome_transaction_id, signal_id, content_hash, requirement_id)
    on delete restrict;

alter table public.build002_qualification_signals
  add column if not exists requirement_id text;

update public.build002_qualification_signals link
set requirement_id = signal.requirement_id
from public.build002_signals signal
where signal.owner_tenant_id = link.owner_tenant_id
  and signal.outcome_transaction_id = link.outcome_transaction_id
  and signal.signal_id = link.signal_id
  and signal.content_hash = link.signal_content_hash
  and link.requirement_id is null;

alter table public.build002_qualification_signals
  alter column requirement_id set not null,
  drop constraint if exists build002_qualification_signals_owner_tenant_id_outcome_transaction_id_signal_id_fkey,
  add constraint build002_qualification_signals_exact_signal_fk
    foreign key (owner_tenant_id, outcome_transaction_id, signal_id, signal_content_hash, requirement_id)
    references public.build002_signals(owner_tenant_id, outcome_transaction_id, signal_id, content_hash, requirement_id)
    on delete restrict;

create or replace function public.build002_insert_dependency_snapshot(p_snapshot jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
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
    v_owner_tenant_id, v_transaction_id,
    p_snapshot->'requirement_definition_hashes',
    p_snapshot->'signal_references',
    p_snapshot->'dependency_bindings',
    nullif(p_snapshot->>'blueprint_hash', ''),
    nullif(p_snapshot->>'policy_hash', ''),
    nullif(p_snapshot->>'task_spec_hash', ''),
    nullif(p_snapshot->>'transaction_semantic_hash', ''),
    nullif(p_snapshot->>'source_asset_version_hash', ''),
    nullif(p_snapshot->>'context_lens_hash', ''),
    p_snapshot->>'schema_version',
    p_snapshot->>'dependency_snapshot_hash'
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
    (reference->>'signalId')::uuid,
    reference->>'contentHash',
    reference->>'requirementId'
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
security invoker
set search_path = public
as $$
declare
  v_owner_tenant_id uuid := (p_qualification->>'owner_tenant_id')::uuid;
  v_transaction_id uuid := (p_qualification->>'outcome_transaction_id')::uuid;
  v_requirement_id text := p_qualification->>'requirement_id';
  v_dependency_hash text;
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

  if exists (
    select 1
    from jsonb_array_elements((select signal_references from public.build002_dependency_snapshots where id = p_dependency_snapshot_id)) reference
    where reference->>'requirementId' = v_requirement_id
      and not exists (
        select 1 from jsonb_array_elements_text(p_qualification->'signalIds') id
        where id.value = reference->>'signalId'
      )
  ) or exists (
    select 1 from jsonb_array_elements_text(p_qualification->'signalIds') id
    where not exists (
      select 1
      from jsonb_array_elements((select signal_references from public.build002_dependency_snapshots where id = p_dependency_snapshot_id)) reference
      where reference->>'requirementId' = v_requirement_id
        and reference->>'signalId' = id.value
    )
  ) or exists (
    select 1
    from jsonb_array_elements((select signal_references from public.build002_dependency_snapshots where id = p_dependency_snapshot_id)) reference
    where reference->>'requirementId' = v_requirement_id
      and not exists (
        select 1 from jsonb_array_elements_text(p_qualification->'signalContentHashes') hash
        where hash.value = reference->>'contentHash'
      )
  ) or exists (
    select 1 from jsonb_array_elements_text(p_qualification->'signalContentHashes') hash
    where not exists (
      select 1
      from jsonb_array_elements((select signal_references from public.build002_dependency_snapshots where id = p_dependency_snapshot_id)) reference
      where reference->>'requirementId' = v_requirement_id
        and reference->>'contentHash' = hash.value
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
    p_qualification->'signalIds', p_qualification->'signalContentHashes',
    p_qualification->'evaluator', p_qualification->>'outcome', p_qualification->>'reason_code',
    nullif(p_qualification->>'evidence_valid_until', '')::timestamptz,
    (p_qualification->>'qualified_at')::timestamptz,
    p_qualification->>'schema_version', p_qualification->>'qualification_content_hash'
  );

  insert into public.build002_qualification_signals(
    owner_tenant_id, outcome_transaction_id, qualification_id,
    qualification_content_hash, signal_id, signal_content_hash, requirement_id
  )
  select v_owner_tenant_id, v_transaction_id, v_qualification_id,
    p_qualification->>'qualification_content_hash',
    (reference->>'signalId')::uuid, reference->>'contentHash', v_requirement_id
  from jsonb_array_elements((select signal_references from public.build002_dependency_snapshots where id = p_dependency_snapshot_id)) reference
  where reference->>'requirementId' = v_requirement_id;

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
security invoker
set search_path = public
as $$
declare
  v_owner_tenant_id uuid := (p_readiness->>'owner_tenant_id')::uuid;
  v_transaction_id uuid := (p_readiness->>'outcome_transaction_id')::uuid;
  v_dependency_hash text;
  v_readiness_id uuid := (p_readiness->>'id')::uuid;
begin
  select dependency_snapshot_hash into v_dependency_hash
  from public.build002_dependency_snapshots
  where owner_tenant_id = v_owner_tenant_id
    and outcome_transaction_id = v_transaction_id
    and id = p_dependency_snapshot_id;
  if v_dependency_hash is null or v_dependency_hash <> p_readiness->>'dependency_snapshot_hash' then
    raise exception 'BUILD002_READINESS_DEPENDENCY_BINDING_MISMATCH';
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_qualification_ids) qualification_id
    where not exists (
      select 1 from public.build002_signal_qualifications qualification
      where qualification.owner_tenant_id = v_owner_tenant_id
        and qualification.outcome_transaction_id = v_transaction_id
        and qualification.id = qualification_id.value::uuid
        and qualification.dependency_snapshot_hash = v_dependency_hash
    )
  ) then
    raise exception 'BUILD002_READINESS_QUALIFICATION_BINDING_MISMATCH';
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
    nullif(p_readiness->>'task_spec_hash', ''),
    nullif(p_readiness->>'source_asset_version_hash', ''),
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
  join jsonb_array_elements_text(p_qualification_ids) selected
    on qualification.id = selected.value::uuid
  where qualification.owner_tenant_id = v_owner_tenant_id
    and qualification.outcome_transaction_id = v_transaction_id;

  return v_readiness_id;
end;
$$;

revoke execute on function public.build002_insert_dependency_snapshot(jsonb) from public, anon, authenticated;
revoke execute on function public.build002_insert_signal_qualification(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.build002_insert_delegation_readiness(jsonb, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.build002_insert_dependency_snapshot(jsonb) to service_role;
grant execute on function public.build002_insert_signal_qualification(jsonb, uuid) to service_role;
grant execute on function public.build002_insert_delegation_readiness(jsonb, uuid, jsonb) to service_role;
