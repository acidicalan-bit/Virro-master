-- BUILD 001-F1: canonical candidates are immutable artifacts. Canonical state
-- is represented by AssetVersion + asset head + StateCommit + transaction status.

create or replace function public.commit_accepted_field_outcome(p_field_outcome_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  outcome public.field_outcomes%rowtype;
  transaction public.outcome_transactions%rowtype;
  asset public.assets%rowtype;
  feedback public.field_feedback%rowtype;
  execution public.execution_runs%rowtype;
  verification public.verification_runs%rowtype;
  candidate public.candidate_assets%rowtype;
  existing_commit public.state_commits%rowtype;
  existing_version public.asset_versions%rowtype;
  created_version public.asset_versions%rowtype;
  created_commit public.state_commits%rowtype;
  required_criteria integer;
  valid_criteria integer;
  next_version integer;
begin
  if actor is null then
    raise exception 'TRUST_AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into outcome
  from public.field_outcomes
  where id = p_field_outcome_id;
  if not found or outcome.owner_tenant_id is null then
    raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tenant_memberships membership
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = outcome.owner_tenant_id
      and membership.principal_id = actor
      and membership.role = 'OWNER'
      and membership.status = 'ACTIVE'
      and tenant.status = 'ACTIVE'
  ) then
    raise exception 'TRUST_COMMIT_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select * into transaction
  from public.outcome_transactions
  where id = outcome.transaction_id;
  if not found or transaction.owner_tenant_id is distinct from outcome.owner_tenant_id then
    raise exception 'TRUST_TRANSACTION_TENANT_MISMATCH';
  end if;

  select * into asset
  from public.assets
  where id = transaction.asset_id
  for update;
  if not found or asset.owner_tenant_id is distinct from outcome.owner_tenant_id then
    raise exception 'TRUST_ASSET_TENANT_MISMATCH';
  end if;

  select * into existing_commit
  from public.state_commits commit_record
  where commit_record.transaction_id = transaction.id;
  if found then
    if existing_commit.owner_tenant_id is distinct from outcome.owner_tenant_id
       or existing_commit.asset_id is distinct from asset.id
       or asset.current_version_id is distinct from existing_commit.new_version_id
       or transaction.status is distinct from 'COMMITTED' then
      raise exception 'TRUST_EXISTING_COMMIT_INCONSISTENT';
    end if;
    select * into existing_version
    from public.asset_versions version
    where version.id = existing_commit.new_version_id;
    if not found then
      raise exception 'TRUST_EXISTING_COMMIT_INCONSISTENT';
    end if;
    return jsonb_build_object(
      'stateCommit', to_jsonb(existing_commit),
      'newVersion', to_jsonb(existing_version),
      'idempotent', true
    );
  end if;

  if transaction.status is distinct from 'VERIFIED'
     or outcome.machine_verification_status is distinct from 'PASSED' then
    raise exception 'TRUST_VERIFICATION_REQUIRED';
  end if;
  if asset.current_version_id is distinct from transaction.base_version_id then
    raise exception 'TRUST_STALE_HEAD' using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.asset_versions version
    where version.id = transaction.base_version_id
      and version.asset_id = asset.id
      and version.owner_tenant_id = outcome.owner_tenant_id
  ) then
    raise exception 'TRUST_BASE_VERSION_MISMATCH';
  end if;

  if outcome.task_spec_snapshot->>'status' is distinct from 'READY'
     or outcome.task_spec_snapshot->>'id' is distinct from outcome.task_spec_id::text
     or (outcome.task_spec_snapshot->>'version')::integer is distinct from outcome.task_spec_version
     or outcome.task_spec_snapshot->>'hash' is distinct from outcome.task_spec_hash
     or outcome.task_spec_snapshot->>'transactionId' is distinct from transaction.id::text
     or outcome.task_spec_snapshot->'source'->>'assetId' is distinct from asset.id::text
     or outcome.task_spec_snapshot->'source'->>'versionId' is distinct from transaction.base_version_id::text then
    raise exception 'TRUST_TASK_SPEC_MISMATCH';
  end if;

  select * into feedback
  from public.field_feedback
  where field_outcome_id = outcome.id;
  if not found
     or not feedback.human_accepted
     or feedback.owner_tenant_id is distinct from outcome.owner_tenant_id
     or feedback.task_spec_id is distinct from outcome.task_spec_id
     or feedback.task_spec_version is distinct from outcome.task_spec_version
     or feedback.task_spec_hash is distinct from outcome.task_spec_hash
     or feedback.accepted_candidate_id is distinct from outcome.delivered_candidate_id then
    raise exception 'TRUST_HUMAN_ACCEPTANCE_REQUIRED';
  end if;
  if not exists (
    select 1 from public.tenant_memberships accepting_membership
    where accepting_membership.tenant_id = outcome.owner_tenant_id
      and accepting_membership.principal_id = feedback.recorded_by_principal_id
      and accepting_membership.role = 'OWNER'
      and accepting_membership.status = 'ACTIVE'
  ) then
    raise exception 'TRUST_HUMAN_ACCEPTANCE_AUTHORITY_REVOKED';
  end if;

  select execution_record.* into execution
  from public.execution_runs execution_record
  where execution_record.id = feedback.execution_run_id
    and execution_record.transaction_id = transaction.id
    and execution_record.owner_tenant_id = outcome.owner_tenant_id
    and execution_record.status = 'SUCCESS';
  if not found then
    raise exception 'TRUST_EXECUTION_MISMATCH';
  end if;

  select verification_record.* into verification
  from public.verification_runs verification_record
  where verification_record.transaction_id = transaction.id
    and verification_record.execution_run_id = execution.id
    and verification_record.owner_tenant_id = outcome.owner_tenant_id
    and verification_record.status = 'PASSED'
  order by verification_record.verified_at desc
  limit 1;
  if not found then
    raise exception 'TRUST_VERIFICATION_MISMATCH';
  end if;

  select count(*) into required_criteria
  from jsonb_array_elements(outcome.task_spec_snapshot->'criteria') criterion
  where (criterion->>'critical')::boolean
    and criterion->>'verifier' <> 'HUMAN_REVIEW';

  select count(*) into valid_criteria
  from jsonb_array_elements(outcome.task_spec_snapshot->'criteria') criterion
  join public.verification_criterion_evidence evidence
    on evidence.criterion_id = criterion->>'id'
   and evidence.owner_tenant_id = outcome.owner_tenant_id
   and evidence.tenant_id = outcome.owner_tenant_id::text
   and evidence.transaction_id = transaction.id
   and evidence.execution_run_id = execution.id
   and evidence.verification_run_id = verification.id
   and evidence.task_spec_id = outcome.task_spec_id
   and evidence.task_spec_version = outcome.task_spec_version
   and evidence.task_spec_hash = outcome.task_spec_hash
   and evidence.status = 'PASS'
   and (criterion->'evidenceTypes') ? evidence.evidence_type
   and evidence.evidence_type <> 'EXECUTOR_ASSERTION'
   and evidence.artifact_bindings->>'sourceVersionId' = transaction.base_version_id::text
   and evidence.artifact_bindings->>'rawCandidateId' = outcome.raw_candidate_id::text
   and evidence.artifact_bindings->>'preservedCandidateId' = outcome.delivered_candidate_id::text
  where (criterion->>'critical')::boolean
    and criterion->>'verifier' <> 'HUMAN_REVIEW'
    and (
      (criterion->>'verifier' = 'SAME_SPEC_GATE' and evidence.issuer_role = 'SYSTEM_GATE')
      or (criterion->>'verifier' <> 'SAME_SPEC_GATE' and evidence.issuer_role = 'VERIFIER')
    );
  if required_criteria = 0 or valid_criteria is distinct from required_criteria then
    raise exception 'TRUST_EXACT_EVIDENCE_REQUIRED';
  end if;

  select * into candidate
  from public.candidate_assets candidate_record
  where candidate_record.id = outcome.delivered_candidate_id
    and candidate_record.transaction_id = transaction.id
    and candidate_record.execution_run_id = execution.id
    and candidate_record.source_version_id = transaction.base_version_id
    and candidate_record.owner_tenant_id = outcome.owner_tenant_id;
  if not found then
    raise exception 'TRUST_ARTIFACT_MISMATCH';
  end if;

  select coalesce(max(version.version_number), 0) + 1 into next_version
  from public.asset_versions version
  where version.asset_id = asset.id;

  insert into public.asset_versions(owner_tenant_id, asset_id, version_number, state, parent_version_id)
  values (
    outcome.owner_tenant_id,
    asset.id,
    next_version,
    jsonb_build_object('media', jsonb_build_object(
      'storageKey', candidate.storage_key,
      'mimeType', candidate.mime_type,
      'width', candidate.width,
      'height', candidate.height,
      'byteSize', candidate.byte_size,
      'sha256', candidate.sha256,
      'candidateId', candidate.id,
      'candidateType', candidate.candidate_type
    )),
    transaction.base_version_id
  )
  returning * into created_version;

  update public.assets
  set current_version_id = created_version.id, updated_at = now()
  where id = asset.id and current_version_id = transaction.base_version_id;
  if not found then
    raise exception 'TRUST_STALE_HEAD' using errcode = '40001';
  end if;

  insert into public.state_commits(owner_tenant_id, transaction_id, asset_id, new_version_id, previous_version_id)
  values (outcome.owner_tenant_id, transaction.id, asset.id, created_version.id, transaction.base_version_id)
  returning * into created_commit;

  update public.outcome_transactions
  set status = 'COMMITTED', completed_at = now(), updated_at = now()
  where id = transaction.id and owner_tenant_id = outcome.owner_tenant_id;

  return jsonb_build_object(
    'stateCommit', to_jsonb(created_commit),
    'newVersion', to_jsonb(created_version),
    'idempotent', false
  );
end;
$$;

revoke all on function public.commit_accepted_field_outcome(uuid) from public, anon;
grant execute on function public.commit_accepted_field_outcome(uuid) to authenticated;

comment on function public.commit_accepted_field_outcome(uuid) is
  'BUILD 001-F1 atomic commit: canonical candidates remain immutable; version, head, StateCommit and transaction status form the single canonical state transition.';
