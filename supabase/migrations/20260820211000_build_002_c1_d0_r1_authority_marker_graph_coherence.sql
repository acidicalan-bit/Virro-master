-- BUILD 002-C1-D0 R1: isolate the authority marker capability and make the
-- relational graph behind a marker self-coherent at the final write.

-- The marker table is not a service-role write surface.  The SECURITY DEFINER
-- RPC is owned by the migration role and remains the only minting operation.
revoke insert on table public.build002_readiness_authority_commits from service_role;

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
  v_qualification record;
  v_requirement record;
  v_required_hashes jsonb;
  v_qualification_hashes jsonb;
  v_snapshot_refs jsonb;
  v_db_refs jsonb;
  v_qualification_refs jsonb;
  v_expected_refs jsonb;
  v_hash_count integer;
  v_distinct_hash_count integer;
  v_requirement_count integer;
  v_qualification_count integer;
  v_distinct_qualification_count integer;
  v_ref_count integer;
  v_distinct_ref_count integer;
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

  for v_qualification in
    select q.*
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
  loop
    select * into v_requirement
    from public.build002_signal_requirements
    where owner_tenant_id = new.owner_tenant_id
      and outcome_transaction_id = new.outcome_transaction_id
      and requirement_definition_hash = v_qualification.requirement_definition_hash;
    if not found or v_requirement.requirement_id is distinct from v_qualification.requirement_id
       or v_qualification.dependency_snapshot_id is distinct from v_snapshot.id
       or v_qualification.dependency_snapshot_hash is distinct from v_snapshot.dependency_snapshot_hash
       or v_qualification.qualified_at is distinct from v_readiness.created_at
       or v_qualification.evaluator is distinct from v_readiness.evaluator then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('signalId', value, 'contentHash', v_qualification.signal_content_hashes->>(ord - 1)) order by value), '[]'::jsonb)
      into v_expected_refs
    from jsonb_array_elements_text(v_qualification.signal_ids) with ordinality as ids(value, ord);
    select coalesce(jsonb_agg(jsonb_build_object('signalId', signal_id::text, 'contentHash', signal_content_hash) order by signal_id::text), '[]'::jsonb)
      into v_qualification_refs
    from public.build002_qualification_signals
    where owner_tenant_id = new.owner_tenant_id
      and outcome_transaction_id = new.outcome_transaction_id
      and qualification_id = v_qualification.id
      and qualification_content_hash = v_qualification.qualification_content_hash;
    if v_expected_refs is distinct from v_qualification_refs then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object('requirementId', q.requirement_id, 'signalId', s.signal_id::text, 'contentHash', s.signal_content_hash)
      order by q.requirement_id, s.signal_id::text, s.signal_content_hash), '[]'::jsonb)
    into v_qualification_refs
  from public.build002_readiness_qualifications rq
  join public.build002_signal_qualifications q
    on q.owner_tenant_id = rq.owner_tenant_id
   and q.outcome_transaction_id = rq.outcome_transaction_id
   and q.id = rq.qualification_id
   and q.qualification_content_hash = rq.qualification_content_hash
  join public.build002_qualification_signals s
    on s.owner_tenant_id = q.owner_tenant_id
   and s.outcome_transaction_id = q.outcome_transaction_id
   and s.qualification_id = q.id
   and s.qualification_content_hash = q.qualification_content_hash
  where rq.owner_tenant_id = new.owner_tenant_id
    and rq.outcome_transaction_id = new.outcome_transaction_id
    and rq.readiness_id = v_readiness.id
    and rq.readiness_content_hash = v_readiness.readiness_content_hash;
  if v_qualification_refs is distinct from v_snapshot_refs then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  return new;
end;
$$;

drop trigger if exists build002_readiness_authority_marker_graph_coherent
  on public.build002_readiness_authority_commits;
create trigger build002_readiness_authority_marker_graph_coherent
before insert on public.build002_readiness_authority_commits
for each row execute function public.build002_readiness_authority_marker_graph_coherent();

comment on table public.build002_readiness_authority_capability is
  'BUILD002-C1-D0 internal transaction capability; no API role may read or write this marker.';
comment on table public.build002_readiness_authority_commits is
  'BUILD002-C1-D0 immutable marker. R1 requires a self-coherent persisted graph and grants no direct service-role INSERT.';

-- TEMPORARY DIAGNOSTIC: removed before the final R1 candidate.
drop trigger build002_readiness_authority_marker_graph_coherent
  on public.build002_readiness_authority_commits;
