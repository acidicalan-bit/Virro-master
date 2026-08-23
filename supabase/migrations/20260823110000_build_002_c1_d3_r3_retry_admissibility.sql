-- BUILD 002-C1-D3-R3: validate retry admissibility before reusing a prior fact.
-- This forward migration preserves the R1 function and closes its existing-row
-- short-circuit without changing the execution boundary.

create or replace function public.build002_admit_delegability(
  p_principal_id uuid,
  p_membership_id uuid,
  p_authority_commit_id uuid,
  p_admission jsonb,
  p_current_material jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tenant uuid := nullif(p_admission->>'ownerTenantId','')::uuid;
  v_tx_id uuid := nullif(p_admission->>'outcomeTransactionId','')::uuid;
  v_tenant_status text;
  v_membership record;
  v_commit record;
  v_tx record;
  v_asset record;
  v_version record;
  v_binding record;
  v_blueprint record;
  v_profile record;
  v_snapshot record;
  v_readiness record;
  v_existing record;
  v_refs jsonb;
  v_req_hashes jsonb;
  v_admission jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if p_admission is null or jsonb_typeof(p_admission) <> 'object' or p_current_material is null or jsonb_typeof(p_current_material) <> 'object' then
    raise exception 'SERIALIZED_RECHECK_FAILED';
  end if;
  if v_tenant is null or v_tx_id is null or p_principal_id is null or p_membership_id is null or p_authority_commit_id is null then
    raise exception 'AUTHORITY_NOT_CURRENT';
  end if;

  select status into v_tenant_status from public.tenants where id = v_tenant for update;
  if not found or v_tenant_status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_membership from public.tenant_memberships where id = p_membership_id and tenant_id = v_tenant and principal_id = p_principal_id for update;
  if not found or v_membership.status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_commit from public.build002_readiness_authority_commits where id = p_authority_commit_id for update;
  if not found or v_commit.owner_tenant_id is distinct from v_tenant or v_commit.principal_id is distinct from p_principal_id or v_commit.outcome_transaction_id is distinct from v_tx_id then raise exception 'AUTHORITY_COMMIT_NOT_FOUND'; end if;

  select * into v_tx from public.outcome_transactions where id = v_tx_id and owner_tenant_id = v_tenant for update;
  if not found or v_tx.status is distinct from 'PREPARED' then raise exception 'AUTHORITY_NOT_CURRENT'; end if;
  select * into v_asset from public.assets where id = v_tx.asset_id for update;
  if not found or v_asset.owner_tenant_id is distinct from v_tenant or v_asset.project_id is distinct from v_tx.project_id or v_asset.current_version_id is distinct from v_tx.base_version_id then raise exception 'SOURCE_ASSET_HEAD_CHANGED'; end if;
  select * into v_version from public.asset_versions where id = v_tx.base_version_id for update;
  if not found or v_version.owner_tenant_id is distinct from v_tenant or v_version.asset_id is distinct from v_asset.id then raise exception 'SOURCE_ASSET_HEAD_CHANGED'; end if;
  select * into v_binding from public.outcome_transaction_requirement_bindings where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx_id for update;
  if not found or v_binding.policy_id is not null or v_binding.policy_hash is not null then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;
  select * into v_blueprint from public.outcome_blueprints where id = v_binding.blueprint_id and version = v_binding.blueprint_version and hash = v_binding.blueprint_hash for share;
  if not found or v_blueprint.status is distinct from 'PUBLISHED' then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;
  select * into v_profile from public.outcome_requirement_profiles where id = v_binding.requirement_profile_id and version = v_binding.requirement_profile_version and hash = v_binding.requirement_profile_hash for share;
  if not found or v_profile.status is distinct from 'PUBLISHED' or v_profile.policy_id is not null or v_profile.policy_hash is not null or v_profile.blueprint_id is distinct from v_blueprint.id or v_profile.blueprint_version is distinct from v_blueprint.version or v_profile.blueprint_hash is distinct from v_blueprint.hash then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;

  if (p_current_material->'transaction'->>'ownerTenantId')::uuid is distinct from v_tx.owner_tenant_id
     or (p_current_material->'transaction'->>'transactionId')::uuid is distinct from v_tx.id
     or (p_current_material->'transaction'->>'projectId')::uuid is distinct from v_tx.project_id
     or (p_current_material->'transaction'->>'assetId')::uuid is distinct from v_tx.asset_id
     or (p_current_material->'transaction'->>'baseVersionId')::uuid is distinct from v_tx.base_version_id
     or p_current_material->'transaction'->>'rawRequest' is distinct from v_tx.raw_request then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if (p_current_material->'asset'->>'id')::uuid is distinct from v_asset.id
     or (p_current_material->'asset'->>'projectId')::uuid is distinct from v_asset.project_id
     or (p_current_material->'asset'->>'ownerTenantId')::uuid is distinct from v_asset.owner_tenant_id
     or nullif(p_current_material->'asset'->>'currentVersionId','')::uuid is distinct from v_asset.current_version_id then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if (p_current_material->'sourceVersion'->>'id')::uuid is distinct from v_version.id
     or (p_current_material->'sourceVersion'->>'assetId')::uuid is distinct from v_version.asset_id
     or (p_current_material->'sourceVersion'->>'ownerTenantId')::uuid is distinct from v_version.owner_tenant_id
     or (p_current_material->'sourceVersion'->>'versionNumber')::integer is distinct from v_version.version_number
     or nullif(p_current_material->'sourceVersion'->>'parentVersionId','')::uuid is distinct from v_version.parent_version_id
     or p_current_material->'sourceVersion'->'state' is distinct from v_version.state then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if (p_current_material->'binding'->>'ownerTenantId')::uuid is distinct from v_binding.owner_tenant_id
     or (p_current_material->'binding'->>'outcomeTransactionId')::uuid is distinct from v_binding.outcome_transaction_id
     or p_current_material->'binding'->'blueprint'->>'id' is distinct from v_binding.blueprint_id::text
     or (p_current_material->'binding'->'blueprint'->>'version')::integer is distinct from v_binding.blueprint_version
     or p_current_material->'binding'->'blueprint'->>'hash' is distinct from v_binding.blueprint_hash
     or p_current_material->'binding'->'requirementProfile'->>'id' is distinct from v_binding.requirement_profile_id::text
     or (p_current_material->'binding'->'requirementProfile'->>'version')::integer is distinct from v_binding.requirement_profile_version
     or p_current_material->'binding'->'requirementProfile'->>'hash' is distinct from v_binding.requirement_profile_hash
     or p_current_material->'binding'->>'bindingHash' is distinct from v_binding.binding_hash then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;

  lock table public.build002_signal_requirements in share mode;
  lock table public.build002_signals in share mode;
  lock table public.build002_dependency_snapshots in share mode;
  lock table public.build002_signal_qualifications in share mode;
  lock table public.build002_delegation_readiness in share mode;
  select * into v_snapshot from public.build002_dependency_snapshots where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx_id and dependency_snapshot_hash = v_commit.dependency_snapshot_hash for share;
  if not found then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;
  select * into v_readiness from public.build002_delegation_readiness where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx_id and id = v_commit.readiness_id for share;
  if not found or v_readiness.readiness_content_hash is distinct from v_commit.readiness_content_hash or v_readiness.state is distinct from 'READY' or v_readiness.dependency_snapshot_hash is distinct from v_commit.dependency_snapshot_hash then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;
  if v_readiness.valid_until is not null and v_readiness.valid_until <= v_now then raise exception 'READINESS_EXPIRED'; end if;
  if (v_readiness.evaluator->>'schemaVersion') is distinct from 'build002-qualification-evaluator-v0.1' or (v_readiness.evaluator->>'version') is distinct from '0.2.0' or (v_readiness.evaluator->>'definitionHash') is distinct from 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746' then raise exception 'EVALUATOR_CHANGED'; end if;
  if p_current_material->'dependencySnapshot'->>'ownerTenantId' is distinct from v_snapshot.owner_tenant_id::text
     or p_current_material->'dependencySnapshot'->>'transactionId' is distinct from v_snapshot.outcome_transaction_id::text
     or p_current_material->'dependencySnapshot'->>'schemaVersion' is distinct from v_snapshot.schema_version
     or p_current_material->'dependencySnapshot'->'requirementDefinitionHashes' is distinct from v_snapshot.requirement_definition_hashes
     or p_current_material->'dependencySnapshot'->'signalReferences' is distinct from v_snapshot.signal_references
     or p_current_material->'dependencySnapshot'->'dependencyBindings' is distinct from v_snapshot.dependency_bindings
     or p_current_material->'dependencySnapshot'->>'blueprintHash' is distinct from v_snapshot.blueprint_hash
     or p_current_material->'dependencySnapshot'->>'policyHash' is distinct from v_snapshot.policy_hash
     or p_current_material->'dependencySnapshot'->>'taskSpecHash' is distinct from v_snapshot.task_spec_hash
     or p_current_material->'dependencySnapshot'->>'transactionSemanticHash' is distinct from v_snapshot.transaction_semantic_hash
     or p_current_material->'dependencySnapshot'->>'sourceAssetVersionHash' is distinct from v_snapshot.source_asset_version_hash
     or p_current_material->'dependencySnapshot'->>'contextLensHash' is distinct from v_snapshot.context_lens_hash
     or p_current_material->'dependencySnapshot'->>'dependencySnapshotHash' is distinct from v_snapshot.dependency_snapshot_hash then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('requirementId', requirement_id, 'signalId', signal_id::text, 'contentHash', content_hash) order by requirement_id, signal_id::text, content_hash), '[]'::jsonb) into v_refs from public.build002_signals where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx_id;
  if v_refs is distinct from v_snapshot.signal_references then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select coalesce(jsonb_agg(requirement_definition_hash order by requirement_definition_hash), '[]'::jsonb) into v_req_hashes from public.build002_signal_requirements where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx_id;
  if v_req_hashes is distinct from v_snapshot.requirement_definition_hashes then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if p_current_material->'dependencySnapshot'->>'dependencySnapshotHash' is distinct from v_commit.dependency_snapshot_hash or p_admission->>'currentDependencySnapshotHash' is distinct from v_commit.dependency_snapshot_hash then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if p_current_material->'evaluator'->>'schemaVersion' is distinct from 'build002-qualification-evaluator-v0.1'
     or p_current_material->'evaluator'->>'version' is distinct from '0.2.0'
     or p_current_material->'evaluator'->>'definitionHash' is distinct from 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746' then raise exception 'AUTHORITY_NOT_CURRENT'; end if;

  -- Validate the complete caller envelope before any idempotent lookup.
  if p_admission->>'schemaVersion' is distinct from 'build002-delegability-admission-v0.1'
     or p_admission->>'ownerTenantId' is distinct from v_tenant::text
     or p_admission->>'principalId' is distinct from p_principal_id::text
     or p_admission->>'membershipId' is distinct from p_membership_id::text
     or p_admission->>'authorityCommitId' is distinct from p_authority_commit_id::text
     or p_admission->>'outcomeTransactionId' is distinct from v_tx.id::text
     or p_admission->>'readinessId' is distinct from v_commit.readiness_id::text
     or p_admission->>'readinessContentHash' is distinct from v_commit.readiness_content_hash
     or p_admission->>'readinessState' is distinct from 'READY'
     or p_admission->>'historicalDependencySnapshotHash' is distinct from v_commit.dependency_snapshot_hash
     or p_admission->>'currentDependencySnapshotHash' is distinct from v_snapshot.dependency_snapshot_hash
     or p_admission->>'evaluatorSchemaVersion' is distinct from 'build002-qualification-evaluator-v0.1'
     or p_admission->>'evaluatorVersion' is distinct from '0.2.0'
     or p_admission->>'evaluatorDefinitionHash' is distinct from 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746'
     or p_admission->>'currentness' is distinct from 'CURRENT'
     or p_admission->>'scope' is distinct from 'DELEGABILITY_ONLY'
     or (p_admission->>'executionAuthorityGranted')::boolean is distinct from false
     or (p_admission->>'executionStarted')::boolean is distinct from false
     or p_admission->>'consequenceBoundary' is distinct from 'FRESH_SERIALIZED_RECHECK_REQUIRED_BEFORE_EXECUTION' then
    raise exception 'CURRENTNESS_NOT_CURRENT';
  end if;
  if (p_admission->>'revalidatedAt')::timestamptz < v_commit.evaluation_time or (p_admission->>'revalidatedAt')::timestamptz > v_now then raise exception 'SERIALIZED_RECHECK_FAILED'; end if;

  select * into v_existing from public.build002_delegability_admissions where owner_tenant_id = v_tenant and authority_commit_id = p_authority_commit_id and principal_id = p_principal_id and current_dependency_snapshot_hash = v_commit.dependency_snapshot_hash;
  if found then
    if v_existing.schema_version is distinct from 'build002-delegability-admission-v0.1'
       or v_existing.owner_tenant_id is distinct from v_tenant
       or v_existing.principal_id is distinct from p_principal_id
       or v_existing.membership_id is distinct from p_membership_id
       or v_existing.authority_commit_id is distinct from p_authority_commit_id
       or v_existing.outcome_transaction_id is distinct from v_tx.id
       or v_existing.readiness_id is distinct from v_commit.readiness_id
       or v_existing.readiness_content_hash is distinct from v_commit.readiness_content_hash
       or v_existing.readiness_state is distinct from 'READY'
       or v_existing.historical_dependency_snapshot_hash is distinct from v_commit.dependency_snapshot_hash
       or v_existing.current_dependency_snapshot_hash is distinct from v_snapshot.dependency_snapshot_hash
       or v_existing.evaluator_schema_version is distinct from 'build002-qualification-evaluator-v0.1'
       or v_existing.evaluator_version is distinct from '0.2.0'
       or v_existing.evaluator_definition_hash is distinct from 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746'
       or v_existing.currentness is distinct from 'CURRENT'
       or v_existing.scope is distinct from 'DELEGABILITY_ONLY'
       or v_existing.execution_authority_granted is distinct from false
       or v_existing.execution_started is distinct from false
       or v_existing.consequence_boundary is distinct from 'FRESH_SERIALIZED_RECHECK_REQUIRED_BEFORE_EXECUTION'
       or v_existing.admission_id is null
       or v_existing.admission_content_hash is null
       or length(v_existing.admission_content_hash) <> 64 then raise exception 'DELEGABILITY_ADMISSION_READBACK_FAILED'; end if;
    return jsonb_build_object('admission_id', v_existing.admission_id, 'admitted_at', v_existing.admitted_at);
  end if;
  v_admission := public.build002_admit_delegability_legacy(p_principal_id, p_membership_id, p_authority_commit_id, p_admission);
  return v_admission;
exception when others then
  if sqlstate in ('P0001','42501','55000') then raise; end if;
  raise exception 'SERIALIZED_RECHECK_FAILED';
end;
$$;

revoke all on function public.build002_admit_delegability(uuid, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.build002_admit_delegability(uuid, uuid, uuid, jsonb, jsonb) to service_role;
