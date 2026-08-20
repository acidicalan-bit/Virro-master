-- BUILD 002-C1-D0: atomic, append-only authority marker for a complete
-- readiness graph. Domain hashes remain TypeScript-owned; PostgreSQL owns
-- scope, current-state locks, relational exactness, and atomic visibility.

create table if not exists public.build002_readiness_authority_commits (
  id uuid primary key default gen_random_uuid(),
  owner_tenant_id uuid not null,
  outcome_transaction_id uuid not null,
  principal_id uuid not null references auth.users(id) on delete restrict,
  dependency_snapshot_id uuid not null,
  dependency_snapshot_hash text not null check (dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  readiness_id uuid not null,
  readiness_content_hash text not null check (readiness_content_hash ~ '^[0-9a-fA-F]{64}$'),
  evaluation_time timestamptz not null,
  committed_at timestamptz not null default clock_timestamp(),
  schema_version text not null check (schema_version = 'build002-readiness-authority-commit-v0.1'),
  unique (owner_tenant_id, outcome_transaction_id, readiness_id),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, dependency_snapshot_hash)
    references public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, id, dependency_snapshot_hash)
    on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash)
    references public.build002_delegation_readiness(owner_tenant_id, outcome_transaction_id, id, readiness_content_hash)
    on delete restrict
);

create or replace function public.build002_readiness_authority_commit_immutable()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' and current_setting('build002.authority_commit', true) is distinct from '1' then
    raise exception 'BUILD002_READINESS_AUTHORITY_COMMIT_INSERT_RESTRICTED' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'BUILD002_READINESS_AUTHORITY_COMMIT_IMMUTABLE_%', tg_op using errcode = '55000';
  end if;
end;
$$;

drop trigger if exists build002_readiness_authority_commit_immutable
  on public.build002_readiness_authority_commits;
create trigger build002_readiness_authority_commit_immutable
before insert or update or delete on public.build002_readiness_authority_commits
for each row execute function public.build002_readiness_authority_commit_immutable();

alter table public.build002_readiness_authority_commits enable row level security;
revoke all on table public.build002_readiness_authority_commits from public, anon, authenticated, service_role;
grant select, insert on table public.build002_readiness_authority_commits to service_role;
create policy build002_readiness_authority_commits_authenticated_select
on public.build002_readiness_authority_commits for select to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = build002_readiness_authority_commits.owner_tenant_id
      and m.principal_id = auth.uid()
      and m.status = 'ACTIVE'
      and t.status = 'ACTIVE'
  )
);

create or replace function public.build002_commit_readiness_authority(
  p_principal_id uuid,
  p_commit jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant uuid := (p_commit->>'owner_tenant_id')::uuid;
  v_transaction uuid := (p_commit->>'outcome_transaction_id')::uuid;
  v_principal uuid := p_principal_id;
  v_tenant_status text;
  v_membership_status text;
  v_tx record;
  v_asset record;
  v_version record;
  v_binding record;
  v_blueprint record;
  v_profile record;
  v_commit_time timestamptz := clock_timestamp();
  v_snapshot jsonb := p_commit->'dependency_snapshot';
  v_readiness jsonb := p_commit->'readiness';
  v_snapshot_id uuid;
  v_readiness_id uuid;
  v_authority_id uuid;
  v_existing record;
  v_hashes jsonb;
  v_refs jsonb;
  v_db_refs jsonb;
  v_qual_ids jsonb := '[]'::jsonb;
  v_req jsonb;
  v_qual jsonb;
  v_req_hash text;
  v_qual_id uuid;
  v_qualification_count integer;
  v_state text;
begin
  if session_user <> 'service_role' and current_user <> 'service_role' then
    raise exception 'READINESS_AUTHORITY_COMMIT_FAILED';
  end if;
  if p_commit is null or jsonb_typeof(p_commit) <> 'object'
     or jsonb_typeof(p_commit->'requirements') <> 'array'
     or jsonb_typeof(v_snapshot) <> 'object'
     or jsonb_typeof(p_commit->'qualifications') <> 'array'
     or jsonb_typeof(v_readiness) <> 'object' then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  if v_tenant is null or v_transaction is null or v_principal is null then
    raise exception 'READINESS_AUTHORITY_SCOPE_INVALID';
  end if;

  select status into v_tenant_status from public.tenants where id = v_tenant for update;
  if v_tenant_status is distinct from 'ACTIVE' then
    raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID';
  end if;
  select status into v_membership_status
  from public.tenant_memberships
  where tenant_id = v_tenant and principal_id = v_principal
  for update;
  if v_membership_status is distinct from 'ACTIVE' then
    raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID';
  end if;

  select * into v_tx from public.outcome_transactions
  where id = v_transaction and owner_tenant_id = v_tenant for update;
  if not found or v_tx.status is distinct from 'PREPARED' then
    raise exception 'READINESS_AUTHORITY_TRANSACTION_NOT_PREPARED';
  end if;
  if (p_commit->'transaction'->>'ownerTenantId')::uuid is distinct from v_tx.owner_tenant_id
     or (p_commit->'transaction'->>'transactionId')::uuid is distinct from v_tx.id
     or (p_commit->'transaction'->>'projectId')::uuid is distinct from v_tx.project_id
     or (p_commit->'transaction'->>'assetId')::uuid is distinct from v_tx.asset_id
     or (p_commit->'transaction'->>'baseVersionId')::uuid is distinct from v_tx.base_version_id
     or p_commit->'transaction'->>'rawRequest' is distinct from v_tx.raw_request then
    raise exception 'READINESS_AUTHORITY_SOURCE_CHANGED';
  end if;

  select * into v_asset from public.assets where id = v_tx.asset_id for update;
  if not found or v_asset.owner_tenant_id is distinct from v_tenant
     or v_asset.project_id is distinct from v_tx.project_id
     or v_asset.current_version_id is null then
    raise exception 'READINESS_AUTHORITY_SOURCE_CHANGED';
  end if;
  if v_asset.current_version_id is distinct from v_tx.base_version_id then
    raise exception 'SOURCE_ASSET_HEAD_CHANGED';
  end if;
  if (p_commit->'asset'->>'id')::uuid is distinct from v_asset.id
     or (p_commit->'asset'->>'ownerTenantId')::uuid is distinct from v_asset.owner_tenant_id
     or (p_commit->'asset'->>'projectId')::uuid is distinct from v_asset.project_id
     or (p_commit->'asset'->>'currentVersionId')::uuid is distinct from v_asset.current_version_id then
    raise exception 'READINESS_AUTHORITY_SOURCE_CHANGED';
  end if;

  select * into v_version from public.asset_versions where id = v_tx.base_version_id for update;
  if not found or v_version.owner_tenant_id is distinct from v_tenant
     or v_version.asset_id is distinct from v_asset.id then
    raise exception 'READINESS_AUTHORITY_SOURCE_CHANGED';
  end if;
  if (p_commit->'sourceVersion'->>'id')::uuid is distinct from v_version.id
     or (p_commit->'sourceVersion'->>'ownerTenantId')::uuid is distinct from v_version.owner_tenant_id
     or (p_commit->'sourceVersion'->>'assetId')::uuid is distinct from v_version.asset_id
     or (p_commit->'sourceVersion'->>'versionNumber')::integer is distinct from v_version.version_number
     or (p_commit->'sourceVersion'->>'parentVersionId')::uuid is distinct from v_version.parent_version_id
     or (p_commit->'sourceVersion'->'state') is distinct from v_version.state then
    raise exception 'READINESS_AUTHORITY_SOURCE_CHANGED';
  end if;

  select * into v_binding from public.outcome_transaction_requirement_bindings
  where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction;
  if not found or v_binding.policy_id is not null or v_binding.policy_hash is not null
     or (p_commit->'binding'->>'bindingHash') is distinct from v_binding.binding_hash
     or (p_commit->'binding'->>'blueprintId')::uuid is distinct from v_binding.blueprint_id
     or (p_commit->'binding'->>'blueprintVersion')::integer is distinct from v_binding.blueprint_version
     or p_commit->'binding'->>'blueprintHash' is distinct from v_binding.blueprint_hash
     or (p_commit->'binding'->>'requirementProfileId')::uuid is distinct from v_binding.requirement_profile_id
     or (p_commit->'binding'->>'requirementProfileVersion')::integer is distinct from v_binding.requirement_profile_version
     or p_commit->'binding'->>'requirementProfileHash' is distinct from v_binding.requirement_profile_hash then
    raise exception 'READINESS_AUTHORITY_C0_CHANGED';
  end if;
  select * into v_blueprint from public.outcome_blueprints
  where id = v_binding.blueprint_id and version = v_binding.blueprint_version and hash = v_binding.blueprint_hash;
  select * into v_profile from public.outcome_requirement_profiles
  where id = v_binding.requirement_profile_id and version = v_binding.requirement_profile_version and hash = v_binding.requirement_profile_hash;
  if not found or v_blueprint.status is distinct from 'PUBLISHED' or v_profile.status is distinct from 'PUBLISHED'
     or v_profile.blueprint_id is distinct from v_blueprint.id
     or v_profile.blueprint_version is distinct from v_blueprint.version
     or v_profile.blueprint_hash is distinct from v_blueprint.hash
     or v_profile.policy_id is not null or v_profile.policy_hash is not null then
    raise exception 'READINESS_AUTHORITY_C0_CHANGED';
  end if;

  if (v_snapshot->>'ownerTenantId')::uuid is distinct from v_tenant
     or (v_snapshot->>'transactionId')::uuid is distinct from v_transaction
     or v_snapshot->>'schemaVersion' is distinct from 'build002-dependency-snapshot-v0.2'
     or v_snapshot->>'policyHash' is not null
     or v_snapshot->>'blueprintHash' is distinct from v_binding.blueprint_hash then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  select jsonb_agg(value order by value) into v_hashes
  from jsonb_array_elements(p_commit->'requirements') r, lateral (select r.value->>'requirementDefinitionHash' as value) x;
  if v_hashes is null or v_hashes is distinct from (
    select jsonb_agg(value order by value)
    from jsonb_array_elements_text(v_snapshot->'requirementDefinitionHashes') x(value)
  ) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  select jsonb_agg(jsonb_build_object('requirementId', r.value->>'requirementId', 'signalId', r.value->>'signalId', 'contentHash', r.value->>'contentHash') order by r.value->>'requirementId', r.value->>'signalId', r.value->>'contentHash') into v_refs
  from jsonb_array_elements(v_snapshot->'signalReferences') r;
  if jsonb_array_length(v_hashes) <> (select count(*) from jsonb_array_elements_text(v_hashes))
     or jsonb_array_length(v_hashes) <> (select count(distinct value) from jsonb_array_elements_text(v_hashes)) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  select jsonb_agg(jsonb_build_object('requirementId', requirement_id, 'signalId', signal_id::text, 'contentHash', content_hash) order by requirement_id, signal_id, content_hash)
    into v_db_refs
  from public.build002_signals
  where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction;
  if coalesce(v_db_refs, '[]'::jsonb) is distinct from coalesce(v_refs, '[]'::jsonb) then
    raise exception 'READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED';
  end if;

  for v_req in select value from jsonb_array_elements(p_commit->'requirements') loop
    v_req_hash := v_req->>'requirementDefinitionHash';
    if v_req->>'policyId' is not null or v_req->>'policyHash' is not null then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;
    select * into v_existing from public.build002_signal_requirements
    where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction
      and requirement_definition_hash = v_req_hash;
    if found then
      if v_existing.requirement_id is distinct from v_req->>'requirementId'
         or v_existing.semantic_type is distinct from v_req->>'semanticType'
         or v_existing.critical is distinct from (v_req->>'critical')::boolean
         or v_existing.accepted_provenance is distinct from v_req->'acceptedProvenance'
         or v_existing.qualification_rule is distinct from v_req->'qualificationRule'
         or v_existing.dependency_selectors is distinct from v_req->'dependencySelectors'
         or v_existing.blueprint_id is distinct from (v_req->>'blueprintId')::uuid
         or v_existing.blueprint_version is distinct from (v_req->>'blueprintVersion')::integer
         or v_existing.blueprint_hash is distinct from v_req->>'blueprintHash' then
        raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
      end if;
    else
      insert into public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical, accepted_provenance, qualification_rule, dependency_selectors, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, schema_version, requirement_definition_hash, created_at)
      values (v_tenant, v_transaction, v_req->>'requirementId', v_req->>'semanticType', (v_req->>'critical')::boolean, v_req->'acceptedProvenance', v_req->'qualificationRule', v_req->'dependencySelectors', (v_req->>'blueprintId')::uuid, (v_req->>'blueprintVersion')::integer, v_req->>'blueprintHash', null, null, v_req->>'definitionSchemaVersion', v_req_hash, coalesce((v_req->>'createdAt')::timestamptz, v_commit_time));
    end if;
  end loop;

  select * into v_existing from public.build002_dependency_snapshots
  where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction
    and dependency_snapshot_hash = v_snapshot->>'dependencySnapshotHash';
  if found then
    if v_existing.requirement_definition_hashes is distinct from v_snapshot->'requirementDefinitionHashes'
       or v_existing.signal_references is distinct from v_snapshot->'signalReferences'
       or v_existing.dependency_bindings is distinct from v_snapshot->'dependencyBindings'
       or v_existing.blueprint_hash is distinct from nullif(v_snapshot->>'blueprintHash','')
       or v_existing.policy_hash is distinct from nullif(v_snapshot->>'policyHash','')
       or v_existing.task_spec_hash is distinct from nullif(v_snapshot->>'taskSpecHash','')
       or v_existing.transaction_semantic_hash is distinct from nullif(v_snapshot->>'transactionSemanticHash','')
       or v_existing.source_asset_version_hash is distinct from nullif(v_snapshot->>'sourceAssetVersionHash','')
       or v_existing.context_lens_hash is distinct from nullif(v_snapshot->>'contextLensHash','') then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;
    v_snapshot_id := v_existing.id;
  else
    insert into public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, requirement_definition_hashes, signal_references, dependency_bindings, blueprint_hash, policy_hash, task_spec_hash, transaction_semantic_hash, source_asset_version_hash, context_lens_hash, schema_version, dependency_snapshot_hash)
    values (v_tenant, v_transaction, v_snapshot->'requirementDefinitionHashes', v_snapshot->'signalReferences', v_snapshot->'dependencyBindings', nullif(v_snapshot->>'blueprintHash',''), nullif(v_snapshot->>'policyHash',''), nullif(v_snapshot->>'taskSpecHash',''), nullif(v_snapshot->>'transactionSemanticHash',''), nullif(v_snapshot->>'sourceAssetVersionHash',''), nullif(v_snapshot->>'contextLensHash',''), v_snapshot->>'schemaVersion', v_snapshot->>'dependencySnapshotHash') returning id into v_snapshot_id;
    insert into public.build002_dependency_requirements(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, requirement_definition_hash)
    select v_tenant, v_transaction, v_snapshot_id, value from jsonb_array_elements_text(v_snapshot->'requirementDefinitionHashes');
    insert into public.build002_dependency_signals(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id, signal_content_hash, requirement_id)
    select v_tenant, v_transaction, v_snapshot_id, (value->>'signalId')::uuid, value->>'contentHash', value->>'requirementId' from jsonb_array_elements(v_snapshot->'signalReferences');
  end if;

  for v_qual in select value from jsonb_array_elements(p_commit->'qualifications') loop
    if v_qual->>'ownerTenantId' is distinct from v_tenant::text
       or v_qual->>'transactionId' is distinct from v_transaction::text
       or v_qual->>'dependencySnapshotHash' is distinct from v_snapshot->>'dependencySnapshotHash'
       or v_qual->>'schemaVersion' is distinct from 'build002-signal-qualification-v0.3' then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;
    select id into v_qual_id from public.build002_signal_qualifications
    where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction and id = (v_qual->>'id')::uuid;
    if v_qual_id is not null then
      select * into v_existing from public.build002_signal_qualifications
      where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction and id = v_qual_id;
      if v_existing.qualification_content_hash is distinct from v_qual->>'qualificationContentHash'
         or v_existing.requirement_id is distinct from v_qual->>'requirementId'
         or v_existing.requirement_definition_hash is distinct from v_qual->>'requirementDefinitionHash'
         or v_existing.dependency_snapshot_id is distinct from v_snapshot_id
         or v_existing.dependency_snapshot_hash is distinct from v_qual->>'dependencySnapshotHash'
         or v_existing.signal_ids is distinct from v_qual->'signalIds'
         or v_existing.signal_content_hashes is distinct from v_qual->'signalContentHashes'
         or v_existing.evaluator is distinct from v_qual->'evaluator'
         or v_existing.outcome is distinct from v_qual->>'outcome'
         or v_existing.reason_code is distinct from v_qual->>'reasonCode' then
        raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
      end if;
    else
      insert into public.build002_signal_qualifications(id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, dependency_snapshot_id, dependency_snapshot_hash, signal_ids, signal_content_hashes, evaluator, outcome, reason_code, evidence_valid_until, qualified_at, schema_version, qualification_content_hash)
      values ((v_qual->>'id')::uuid, v_tenant, v_transaction, v_qual->>'requirementId', v_qual->>'requirementDefinitionHash', v_snapshot_id, v_qual->>'dependencySnapshotHash', v_qual->'signalIds', v_qual->'signalContentHashes', v_qual->'evaluator', v_qual->>'outcome', v_qual->>'reasonCode', nullif(v_qual->>'evidenceValidUntil','')::timestamptz, (v_qual->>'qualifiedAt')::timestamptz, v_qual->>'schemaVersion', v_qual->>'qualificationContentHash') returning id into v_qual_id;
      insert into public.build002_qualification_signals(owner_tenant_id, outcome_transaction_id, qualification_id, qualification_content_hash, signal_id, signal_content_hash, requirement_id)
      select v_tenant, v_transaction, v_qual_id, v_qual->>'qualificationContentHash', (x->>'signalId')::uuid, x->>'contentHash', v_qual->>'requirementId' from jsonb_array_elements(v_qual->'signalReferences') x;
    end if;
    v_qual_ids := v_qual_ids || jsonb_build_array(jsonb_build_object('id', v_qual_id::text, 'hash', v_qual->>'qualificationContentHash'));
  end loop;

  v_state := v_readiness->>'state';
  if v_state in ('READY_WITH_CONDITIONS', 'BLOCKED_BY_POLICY') then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  if v_readiness->'evaluator'->>'schemaVersion' is distinct from 'build002-qualification-evaluator-v0.1'
     or v_readiness->'evaluator'->>'version' is distinct from '0.2.0'
     or v_readiness->'evaluator'->>'definitionHash' is distinct from 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746'
     or exists (select 1 from jsonb_array_elements(p_commit->'qualifications') q where q->'evaluator'->>'schemaVersion' is distinct from 'build002-qualification-evaluator-v0.1' or q->'evaluator'->>'version' is distinct from '0.2.0' or q->'evaluator'->>'definitionHash' is distinct from 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746') then
    raise exception 'READINESS_AUTHORITY_EVALUATOR_STALE';
  end if;
  if v_readiness->>'ownerTenantId' is distinct from v_tenant::text
     or v_readiness->>'transactionId' is distinct from v_transaction::text
     or v_readiness->>'dependencySnapshotHash' is distinct from v_snapshot->>'dependencySnapshotHash'
     or v_readiness->>'policyHash' is not null
     or v_readiness->>'conditionCodes' <> '[]'
     or v_readiness->>'schemaVersion' is distinct from 'build002-signal-readiness-v0.3'
     or (v_readiness->>'createdAt')::timestamptz > v_commit_time then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  if v_state = 'READY' and v_readiness->>'validUntil' is not null and (v_readiness->>'validUntil')::timestamptz <= v_commit_time then
    raise exception 'READINESS_AUTHORITY_EXPIRED_BEFORE_COMMIT';
  end if;
  if exists (select 1 from jsonb_array_elements(p_commit->'qualifications') q where (q->>'qualifiedAt')::timestamptz is distinct from (v_readiness->>'createdAt')::timestamptz) then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;
  select count(*) into v_qualification_count from jsonb_array_elements(p_commit->'qualifications');
  if v_qualification_count <> jsonb_array_length(p_commit->'requirements')
     or (select count(distinct q.value->>'requirementId') from jsonb_array_elements(p_commit->'qualifications') q) <> v_qualification_count then
    raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
  end if;

  select * into v_existing from public.build002_delegation_readiness where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction and id = (v_readiness->>'id')::uuid;
  if found then
    if v_existing.readiness_content_hash is distinct from v_readiness->>'readinessContentHash' or v_existing.dependency_snapshot_id is distinct from v_snapshot_id then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;
    v_readiness_id := v_existing.id;
  else
    insert into public.build002_delegation_readiness(id, owner_tenant_id, outcome_transaction_id, requirement_set_hash, qualification_set_hash, dependency_snapshot_id, dependency_snapshot_hash, task_spec_hash, source_asset_version_hash, blueprint_hash, policy_hash, evaluator, state, blocking_codes, condition_codes, created_at, valid_until, schema_version, readiness_content_hash)
    values ((v_readiness->>'id')::uuid, v_tenant, v_transaction, v_readiness->>'requirementSetHash', v_readiness->>'qualificationSetHash', v_snapshot_id, v_readiness->>'dependencySnapshotHash', nullif(v_readiness->>'taskSpecHash',''), nullif(v_readiness->>'sourceAssetVersionHash',''), nullif(v_readiness->>'blueprintHash',''), null, v_readiness->'evaluator', v_state, v_readiness->'blockingCodes', v_readiness->'conditionCodes', (v_readiness->>'createdAt')::timestamptz, nullif(v_readiness->>'validUntil','')::timestamptz, v_readiness->>'schemaVersion', v_readiness->>'readinessContentHash') returning id into v_readiness_id;
    insert into public.build002_readiness_qualifications(owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash, qualification_id, qualification_content_hash)
    select v_tenant, v_transaction, v_readiness_id, v_readiness->>'readinessContentHash', (x->>'id')::uuid, x->>'hash' from jsonb_array_elements(v_qual_ids) x;
  end if;

  select * into v_existing from public.build002_readiness_authority_commits
  where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction and readiness_id = v_readiness_id;
  if found then
    if v_existing.dependency_snapshot_id is distinct from v_snapshot_id or v_existing.dependency_snapshot_hash is distinct from v_snapshot->>'dependencySnapshotHash' or v_existing.readiness_content_hash is distinct from v_readiness->>'readinessContentHash' then
      raise exception 'READINESS_AUTHORITY_GRAPH_INVALID';
    end if;
    return jsonb_build_object('authority_commit_id', v_existing.id, 'dependency_snapshot_id', v_existing.dependency_snapshot_id, 'readiness_id', v_existing.readiness_id, 'committed_at', v_existing.committed_at);
  end if;
  perform set_config('build002.authority_commit', '1', true);
  insert into public.build002_readiness_authority_commits(owner_tenant_id, outcome_transaction_id, principal_id, dependency_snapshot_id, dependency_snapshot_hash, readiness_id, readiness_content_hash, evaluation_time, schema_version)
  values (v_tenant, v_transaction, v_principal, v_snapshot_id, v_snapshot->>'dependencySnapshotHash', v_readiness_id, v_readiness->>'readinessContentHash', (v_readiness->>'createdAt')::timestamptz, 'build002-readiness-authority-commit-v0.1')
  returning id, committed_at into v_authority_id, v_commit_time;
  return jsonb_build_object('authority_commit_id', v_authority_id, 'dependency_snapshot_id', v_snapshot_id, 'readiness_id', v_readiness_id, 'committed_at', v_commit_time);
exception
  when others then
    if sqlstate = 'P0001' or sqlstate = '42501' or sqlstate = '55000' then raise; end if;
    raise exception 'READINESS_AUTHORITY_COMMIT_FAILED';
end;
$$;

revoke all on function public.build002_commit_readiness_authority(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.build002_commit_readiness_authority(uuid, jsonb) to service_role;

comment on table public.build002_readiness_authority_commits is 'BUILD 002-C1-D0 immutable marker proving one atomic, current-state-validated readiness graph commit.';
