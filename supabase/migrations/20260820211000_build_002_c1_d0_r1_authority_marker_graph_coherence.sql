-- BUILD 002-C1-D0 R1: isolate the authority marker capability and make the
-- relational graph behind a marker self-coherent at the final write.

-- The marker table is not a service-role write surface.  The SECURITY DEFINER
-- RPC is owned by the migration role and remains the only minting operation.
revoke insert on table public.build002_readiness_authority_commits from service_role;
grant select on table public.build002_readiness_authority_commits to authenticated;

create or replace function public.build002_readiness_authority_commit_immutable()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT'
     and current_setting('build002.authority_commit', true) is distinct from (select token from public.build002_readiness_authority_capability limit 1) then
    raise exception 'BUILD002_READINESS_AUTHORITY_COMMIT_INSERT_RESTRICTED' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'BUILD002_READINESS_AUTHORITY_COMMIT_IMMUTABLE_%', tg_op using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.build002_readiness_authority_marker_graph_coherent()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_snapshot record;
  v_readiness record;
  v_required_hashes jsonb;
  v_qualification_hashes jsonb;
  v_snapshot_refs jsonb;
  v_db_refs jsonb;
  v_hash_count integer;
  v_distinct_hash_count integer;
  v_requirement_count integer;
  v_qualification_count integer;
  v_distinct_qualification_count integer;
  v_ref_count integer;
  v_distinct_ref_count integer;
  v_binding record;
  v_profile record;
  v_profile_requirements jsonb;
  v_persisted_requirements jsonb;
  v_persisted_requirement_hashes jsonb;
  v_linked_qualifications jsonb;
  v_readiness_links jsonb;
begin
  if tg_op <> 'INSERT' then
    raise exception 'BUILD002_READINESS_AUTHORITY_COMMIT_IMMUTABLE_%', tg_op using errcode = '55000';
  end if;

  select * into v_snapshot
  from public.build002_dependency_snapshots
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and id = new.dependency_snapshot_id
    and dependency_snapshot_hash = new.dependency_snapshot_hash;
  if not found then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select * into v_readiness
  from public.build002_delegation_readiness
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and id = new.readiness_id
    and readiness_content_hash = new.readiness_content_hash;
  if not found
     or v_readiness.dependency_snapshot_id is distinct from v_snapshot.id
     or v_readiness.dependency_snapshot_hash is distinct from v_snapshot.dependency_snapshot_hash
     or v_readiness.policy_hash is not null
     or v_readiness.condition_codes is distinct from '[]'::jsonb
     or v_readiness.state in ('READY_WITH_CONDITIONS', 'BLOCKED_BY_POLICY') then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select coalesce(jsonb_agg(value order by value), '[]'::jsonb), count(*), count(distinct value)
    into v_required_hashes, v_hash_count, v_distinct_hash_count
  from jsonb_array_elements_text(v_snapshot.requirement_definition_hashes) as values(value);
  if v_hash_count = 0 or v_hash_count <> v_distinct_hash_count then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  select count(*) into v_requirement_count
  from public.build002_signal_requirements
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and requirement_definition_hash in (select value from jsonb_array_elements_text(v_required_hashes));
  if v_requirement_count <> v_hash_count then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'requirementId', value->>'requirementId',
      'signalId', value->>'signalId',
      'contentHash', value->>'contentHash')
      order by value->>'requirementId', value->>'signalId', value->>'contentHash'), '[]'::jsonb),
      count(*), count(distinct value::text)
    into v_snapshot_refs, v_ref_count, v_distinct_ref_count
  from jsonb_array_elements(v_snapshot.signal_references) as refs(value);
  if v_ref_count <> v_distinct_ref_count then
    raise exception 'READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'requirementId', requirement_id,
      'signalId', signal_id::text,
      'contentHash', content_hash)
      order by requirement_id, signal_id::text, content_hash), '[]'::jsonb)
    into v_db_refs
  from public.build002_signals
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and requirement_definition_hash in (select value from jsonb_array_elements_text(v_required_hashes));
  if v_db_refs is distinct from v_snapshot_refs then
    raise exception 'READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED';
  end if;

  select count(*), count(distinct qualification_id)
    into v_qualification_count, v_distinct_qualification_count
  from public.build002_readiness_qualifications
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and readiness_id = v_readiness.id
    and readiness_content_hash = v_readiness.readiness_content_hash;
  if v_qualification_count = 0 or v_qualification_count <> v_distinct_qualification_count
     or v_qualification_count <> v_hash_count then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select coalesce(jsonb_agg(q.requirement_definition_hash order by q.requirement_definition_hash), '[]'::jsonb)
    into v_qualification_hashes
  from public.build002_readiness_qualifications rq
  join public.build002_signal_qualifications q
    on q.owner_tenant_id = rq.owner_tenant_id
   and q.outcome_transaction_id = rq.outcome_transaction_id
   and q.id = rq.qualification_id
   and q.qualification_content_hash = rq.qualification_content_hash
  where rq.owner_tenant_id = new.owner_tenant_id
    and rq.outcome_transaction_id = new.outcome_transaction_id
    and rq.readiness_id = v_readiness.id
    and rq.readiness_content_hash = v_readiness.readiness_content_hash;
  if v_qualification_hashes is distinct from v_required_hashes then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    into v_required_hashes
  from jsonb_array_elements_text(v_snapshot.requirement_definition_hashes) as values(value);

  select b.*, p.definition as profile_definition
    into v_binding
  from public.outcome_transaction_requirement_bindings b
  join public.outcome_requirement_profiles p
    on p.id = b.requirement_profile_id
   and p.version = b.requirement_profile_version
   and p.hash = b.requirement_profile_hash
  where b.owner_tenant_id = new.owner_tenant_id
    and b.outcome_transaction_id = new.outcome_transaction_id;
  if not found or v_binding.policy_id is not null or v_binding.policy_hash is not null then
    raise exception 'READINESS_AUTHORITY_C0_CHANGED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'requirementId', value->>'requirementId',
      'semanticType', value->>'semanticType',
      'critical', (value->>'critical')::boolean,
      'acceptedProvenance', value->'acceptedProvenance',
      'qualificationRule', value->'qualificationRule',
      'dependencySelectors', value->'dependencySelectors',
      'blueprintId', v_binding.blueprint_id::text,
      'blueprintVersion', v_binding.blueprint_version,
      'blueprintHash', v_binding.blueprint_hash,
      'policyId', null,
      'policyHash', null,
      'definitionSchemaVersion', 'build002-signal-requirement-v0.1')
      order by value->>'requirementId'), '[]'::jsonb)
    into v_profile_requirements
  from jsonb_array_elements(v_binding.profile_definition->'requirements') as profile_requirements(value);
  select coalesce(jsonb_agg(jsonb_build_object(
      'requirementId', requirement_id,
      'semanticType', semantic_type,
      'critical', critical,
      'acceptedProvenance', accepted_provenance,
      'qualificationRule', qualification_rule,
      'dependencySelectors', dependency_selectors,
      'blueprintId', blueprint_id::text,
      'blueprintVersion', blueprint_version,
      'blueprintHash', blueprint_hash,
      'policyId', policy_id,
      'policyHash', policy_hash,
      'definitionSchemaVersion', schema_version)
      order by requirement_id), '[]'::jsonb),
      coalesce(jsonb_agg(requirement_definition_hash order by requirement_definition_hash), '[]'::jsonb)
    into v_persisted_requirements, v_persisted_requirement_hashes
  from public.build002_signal_requirements
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and requirement_definition_hash in (select value from jsonb_array_elements_text(v_required_hashes));
  if v_profile_requirements is distinct from v_persisted_requirements
     or v_persisted_requirement_hashes is distinct from v_required_hashes then
    raise exception 'READINESS_AUTHORITY_C0_CHANGED';
  end if;

  if exists (
    select 1
    from public.build002_readiness_qualifications rq
    join public.build002_signal_qualifications q
      on q.owner_tenant_id = rq.owner_tenant_id
     and q.outcome_transaction_id = rq.outcome_transaction_id
     and q.id = rq.qualification_id
     and q.qualification_content_hash = rq.qualification_content_hash
    left join public.build002_signal_requirements req
      on req.owner_tenant_id = q.owner_tenant_id
     and req.outcome_transaction_id = q.outcome_transaction_id
     and req.requirement_definition_hash = q.requirement_definition_hash
    where rq.owner_tenant_id = new.owner_tenant_id
      and rq.outcome_transaction_id = new.outcome_transaction_id
      and rq.readiness_id = v_readiness.id
      and rq.readiness_content_hash = v_readiness.readiness_content_hash
      and (req.requirement_id is null
        or req.requirement_id is distinct from q.requirement_id
        or q.dependency_snapshot_id is distinct from v_snapshot.id
        or q.dependency_snapshot_hash is distinct from v_snapshot.dependency_snapshot_hash)
  ) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', q.id::text, 'hash', q.qualification_content_hash)
      order by q.id::text, q.qualification_content_hash), '[]'::jsonb)
    into v_linked_qualifications
  from public.build002_readiness_qualifications rq
  join public.build002_signal_qualifications q
    on q.owner_tenant_id = rq.owner_tenant_id
   and q.outcome_transaction_id = rq.outcome_transaction_id
   and q.id = rq.qualification_id
   and q.qualification_content_hash = rq.qualification_content_hash
  where rq.owner_tenant_id = new.owner_tenant_id
    and rq.outcome_transaction_id = new.outcome_transaction_id
    and rq.readiness_id = v_readiness.id
    and rq.readiness_content_hash = v_readiness.readiness_content_hash;
  select coalesce(jsonb_agg(jsonb_build_object('id', qualification_id::text, 'hash', qualification_content_hash)
      order by qualification_id::text, qualification_content_hash), '[]'::jsonb)
    into v_readiness_links
  from public.build002_readiness_qualifications
  where owner_tenant_id = new.owner_tenant_id
    and outcome_transaction_id = new.outcome_transaction_id
    and readiness_id = v_readiness.id
    and readiness_content_hash = v_readiness.readiness_content_hash;
  if v_linked_qualifications is distinct from v_readiness_links then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  if exists (
    select 1
    from public.build002_readiness_qualifications rq
    join public.build002_signal_qualifications q
      on q.owner_tenant_id = rq.owner_tenant_id
     and q.outcome_transaction_id = rq.outcome_transaction_id
     and q.id = rq.qualification_id
     and q.qualification_content_hash = rq.qualification_content_hash
    where rq.owner_tenant_id = new.owner_tenant_id
      and rq.outcome_transaction_id = new.outcome_transaction_id
      and rq.readiness_id = v_readiness.id
      and rq.readiness_content_hash = v_readiness.readiness_content_hash
      and (q.evaluator is distinct from v_readiness.evaluator
        or q.qualified_at is distinct from v_readiness.created_at
        or q.requirement_id is null
        or q.requirement_definition_hash is null
        or q.dependency_snapshot_id is distinct from v_snapshot.id
        or q.dependency_snapshot_hash is distinct from v_snapshot.dependency_snapshot_hash)
  ) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  if exists (
    select 1
    from public.build002_readiness_qualifications rq
    join public.build002_signal_qualifications q
      on q.owner_tenant_id = rq.owner_tenant_id
     and q.outcome_transaction_id = rq.outcome_transaction_id
     and q.id = rq.qualification_id
     and q.qualification_content_hash = rq.qualification_content_hash
    where rq.owner_tenant_id = new.owner_tenant_id
      and rq.outcome_transaction_id = new.outcome_transaction_id
      and rq.readiness_id = v_readiness.id
      and rq.readiness_content_hash = v_readiness.readiness_content_hash
      and (
        jsonb_array_length(q.signal_ids) <> jsonb_array_length(q.signal_content_hashes)
        or (select coalesce(jsonb_agg(jsonb_build_object('signalId', ids.value, 'contentHash', hashes.value)
              order by ids.value, hashes.value), '[]'::jsonb)
            from jsonb_array_elements(q.signal_ids) with ordinality ids(value, ord)
            join jsonb_array_elements(q.signal_content_hashes) with ordinality hashes(value, ord) using (ord))
          is distinct from (select coalesce(jsonb_agg(jsonb_build_object('signalId', qs.signal_id::text, 'contentHash', qs.signal_content_hash)
              order by qs.signal_id::text, qs.signal_content_hash), '[]'::jsonb)
            from public.build002_qualification_signals qs
            where qs.owner_tenant_id = q.owner_tenant_id
              and qs.outcome_transaction_id = q.outcome_transaction_id
              and qs.qualification_id = q.id
              and qs.qualification_content_hash = q.qualification_content_hash)
        or (select coalesce(jsonb_agg(jsonb_build_object('signalId', refs.value->>'signalId', 'contentHash', refs.value->>'contentHash')
              order by refs.value->>'signalId', refs.value->>'contentHash'), '[]'::jsonb)
            from jsonb_array_elements(v_snapshot.signal_references) refs(value)
            where refs.value->>'requirementId' = q.requirement_id)
          is distinct from (select coalesce(jsonb_agg(jsonb_build_object('signalId', ids.value, 'contentHash', hashes.value)
              order by ids.value, hashes.value), '[]'::jsonb)
            from jsonb_array_elements(q.signal_ids) with ordinality ids(value, ord)
            join jsonb_array_elements(q.signal_content_hashes) with ordinality hashes(value, ord) using (ord))
      )
  ) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  if exists (
    select 1
    from public.build002_readiness_qualifications rq
    join public.build002_signal_qualifications q
      on q.owner_tenant_id = rq.owner_tenant_id
     and q.outcome_transaction_id = rq.outcome_transaction_id
     and q.id = rq.qualification_id
     and q.qualification_content_hash = rq.qualification_content_hash
    where rq.owner_tenant_id = new.owner_tenant_id
      and rq.outcome_transaction_id = new.outcome_transaction_id
      and rq.readiness_id = v_readiness.id
      and rq.readiness_content_hash = v_readiness.readiness_content_hash
      and jsonb_array_length(q.signal_ids) <> (
        select count(*)
        from public.build002_qualification_signals qs
        where qs.owner_tenant_id = q.owner_tenant_id
          and qs.outcome_transaction_id = q.outcome_transaction_id
          and qs.qualification_id = q.id
          and qs.qualification_content_hash = q.qualification_content_hash)
  ) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  return new;
end;
$$;

-- Keep the original D0 implementation and surgically narrow its signal-universe
-- query to the exact canonical requirement hash set. This avoids changing the
-- frozen D0 migration while making historical non-canonical signals irrelevant.
do $r1_rpc$
declare
  v_definition text;
  v_original text;
begin
  select pg_get_functiondef('public.build002_commit_readiness_authority(uuid, jsonb)'::regprocedure)
    into v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition,
    $$from public.build002_signals
  where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction;$$,
    $$from public.build002_signals
  where owner_tenant_id = v_tenant
    and outcome_transaction_id = v_transaction
    and requirement_definition_hash in (
      select value from jsonb_array_elements_text(v_snapshot->'requirementDefinitionHashes')
    );$$);
  if v_definition = v_original then
    raise exception 'BUILD002_C1_D0_R1_1_RPC_PATCH_NOT_APPLIED';
  end if;
  execute v_definition;
end;
$r1_rpc$;

drop trigger if exists build002_readiness_authority_marker_graph_coherent
  on public.build002_readiness_authority_commits;
create trigger build002_readiness_authority_marker_graph_coherent
before insert on public.build002_readiness_authority_commits
for each row execute function public.build002_readiness_authority_marker_graph_coherent();

comment on table public.build002_readiness_authority_capability is
  'BUILD002-C1-D0 internal transaction capability; no API role may read or write this marker.';
comment on table public.build002_readiness_authority_commits is
  'BUILD002-C1-D0 immutable marker. R1 requires a self-coherent persisted graph and grants no direct service-role INSERT.';
