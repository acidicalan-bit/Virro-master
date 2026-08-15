-- BUILD 001-I: one tenant-safe trust chain and atomic canonical commit.
-- Historical rows are intentionally not backfilled. NULL ownership continues
-- to mean that ownership was not proven by the authenticated path.

alter table public.transaction_patches add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.partial_intents add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.mutation_leases add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.execution_runs add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.evidence_receipts add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.verification_runs add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.state_commits add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.cost_records add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.semantic_snapshots add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.candidate_assets add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.preservation_runs add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.candidate_preferences add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;

alter table public.media_storage add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.image_evidence add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;
alter table public.preservation_evidence add column if not exists owner_tenant_id uuid references public.tenants(id) on delete restrict;

alter table public.field_feedback add column if not exists execution_run_id uuid references public.execution_runs(id) on delete restrict;
alter table public.field_feedback add column if not exists task_spec_id uuid;
alter table public.field_feedback add column if not exists task_spec_version integer;
alter table public.field_feedback add column if not exists task_spec_hash text;
alter table public.field_feedback add column if not exists accepted_candidate_id uuid references public.candidate_assets(id) on delete restrict;
alter table public.verification_criterion_evidence add column if not exists task_spec_version integer;
alter table public.verification_criterion_evidence add column if not exists issuer_role text;

create index if not exists execution_runs_owner_transaction_idx on public.execution_runs(owner_tenant_id, transaction_id);
create index if not exists evidence_receipts_owner_transaction_idx on public.evidence_receipts(owner_tenant_id, transaction_id);
create index if not exists verification_runs_owner_transaction_idx on public.verification_runs(owner_tenant_id, transaction_id);
create index if not exists candidate_assets_owner_transaction_idx on public.candidate_assets(owner_tenant_id, transaction_id);
create index if not exists state_commits_owner_transaction_idx on public.state_commits(owner_tenant_id, transaction_id);
create index if not exists media_storage_owner_asset_idx on public.media_storage(owner_tenant_id, asset_id);
create index if not exists field_feedback_owner_execution_idx on public.field_feedback(owner_tenant_id, execution_run_id);

create or replace function public.enforce_transaction_scoped_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_owner uuid;
begin
  select transaction.owner_tenant_id into parent_owner
  from public.outcome_transactions transaction
  where transaction.id = new.transaction_id;

  if not found then
    raise exception 'TRUST_TRANSACTION_NOT_FOUND';
  end if;
  if tg_op = 'UPDATE' and old.owner_tenant_id is not null
     and new.owner_tenant_id is distinct from old.owner_tenant_id then
    raise exception 'TRUST_OWNER_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and old.transaction_id is distinct from new.transaction_id then
    raise exception 'TRUST_TRANSACTION_IMMUTABLE';
  end if;
  if parent_owner is null then
    if new.owner_tenant_id is not null then
      raise exception 'TRUST_HISTORICAL_OWNER_UNPROVEN';
    end if;
    return new;
  end if;
  if new.owner_tenant_id is null then
    new.owner_tenant_id := parent_owner;
  elsif new.owner_tenant_id is distinct from parent_owner then
    raise exception 'TRUST_TRANSACTION_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'transaction_patches', 'partial_intents', 'mutation_leases',
    'execution_runs', 'evidence_receipts', 'verification_runs',
    'state_commits', 'cost_records', 'semantic_snapshots',
    'candidate_assets', 'preservation_runs', 'candidate_preferences'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_trust_owner_guard', table_name);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.enforce_transaction_scoped_owner()',
      table_name || '_trust_owner_guard', table_name
    );
  end loop;
end $$;

create or replace function public.enforce_execution_reference_lineage()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  referenced_transaction uuid;
  referenced_owner uuid;
  transaction_asset uuid;
begin
  if new.owner_tenant_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'TRUST_STATE_COMMIT_IMMUTABLE';
  end if;
  select transaction.asset_id into transaction_asset
  from public.outcome_transactions transaction
  where transaction.id = new.transaction_id;

  if tg_table_name in ('evidence_receipts', 'verification_runs', 'candidate_assets', 'preservation_runs') then
    select execution.transaction_id, execution.owner_tenant_id
      into referenced_transaction, referenced_owner
    from public.execution_runs execution
    where execution.id = new.execution_run_id;
    if referenced_transaction is distinct from new.transaction_id
       or referenced_owner is distinct from new.owner_tenant_id then
      raise exception 'TRUST_EXECUTION_LINEAGE_MISMATCH';
    end if;
  end if;

  if tg_table_name = 'evidence_receipts' then
    if not exists (
      select 1 from public.outcome_transactions transaction
      where transaction.id = new.transaction_id
        and transaction.base_version_id = new.base_version_id
    ) then
      raise exception 'TRUST_EVIDENCE_BASE_VERSION_MISMATCH';
    end if;
  elsif tg_table_name = 'candidate_assets' then
    if new.source_version_id is not null and not exists (
      select 1 from public.asset_versions version
      where version.id = new.source_version_id
        and version.asset_id = transaction_asset
        and version.owner_tenant_id = new.owner_tenant_id
    ) then
      raise exception 'TRUST_CANDIDATE_SOURCE_MISMATCH';
    end if;
    if new.raw_candidate_id is not null and not exists (
      select 1 from public.candidate_assets candidate
      where candidate.id = new.raw_candidate_id
        and candidate.transaction_id = new.transaction_id
        and candidate.owner_tenant_id = new.owner_tenant_id
    ) then
      raise exception 'TRUST_RAW_CANDIDATE_MISMATCH';
    end if;
  elsif tg_table_name = 'preservation_runs' then
    if not exists (
      select 1 from public.asset_versions version
      where version.id = new.source_version_id
        and version.asset_id = transaction_asset
        and version.owner_tenant_id = new.owner_tenant_id
    ) then
      raise exception 'TRUST_PRESERVATION_SOURCE_MISMATCH';
    end if;
    if not exists (
      select 1 from public.candidate_assets candidate
      where candidate.id = new.raw_candidate_id
        and candidate.transaction_id = new.transaction_id
        and candidate.owner_tenant_id = new.owner_tenant_id
    ) then
      raise exception 'TRUST_PRESERVATION_CANDIDATE_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists evidence_receipts_trust_lineage_guard on public.evidence_receipts;
create trigger evidence_receipts_trust_lineage_guard after insert or update on public.evidence_receipts
for each row execute function public.enforce_execution_reference_lineage();
drop trigger if exists verification_runs_trust_lineage_guard on public.verification_runs;
create trigger verification_runs_trust_lineage_guard after insert or update on public.verification_runs
for each row execute function public.enforce_execution_reference_lineage();
drop trigger if exists candidate_assets_trust_lineage_guard on public.candidate_assets;
create trigger candidate_assets_trust_lineage_guard after insert or update on public.candidate_assets
for each row execute function public.enforce_execution_reference_lineage();
drop trigger if exists preservation_runs_trust_lineage_guard on public.preservation_runs;
create trigger preservation_runs_trust_lineage_guard after insert or update on public.preservation_runs
for each row execute function public.enforce_execution_reference_lineage();

create or replace function public.enforce_state_commit_lineage()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.owner_tenant_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.outcome_transactions transaction
    join public.assets asset on asset.id = transaction.asset_id
    join public.asset_versions previous_version
      on previous_version.id = transaction.base_version_id
     and previous_version.asset_id = asset.id
    join public.asset_versions new_version
      on new_version.id = new.new_version_id
     and new_version.asset_id = asset.id
     and new_version.parent_version_id = previous_version.id
    where transaction.id = new.transaction_id
      and transaction.asset_id = new.asset_id
      and transaction.base_version_id = new.previous_version_id
      and transaction.owner_tenant_id = new.owner_tenant_id
      and asset.owner_tenant_id = new.owner_tenant_id
      and asset.current_version_id = new.new_version_id
      and previous_version.owner_tenant_id = new.owner_tenant_id
      and new_version.owner_tenant_id = new.owner_tenant_id
  ) then
    raise exception 'TRUST_STATE_COMMIT_LINEAGE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists state_commits_trust_lineage_guard on public.state_commits;
create trigger state_commits_trust_lineage_guard after insert or update on public.state_commits
for each row execute function public.enforce_state_commit_lineage();

create or replace function public.enforce_asset_scoped_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_owner uuid;
begin
  if tg_table_name = 'media_storage' then
    select asset.owner_tenant_id into parent_owner from public.assets asset where asset.id = new.asset_id;
  elsif tg_table_name = 'image_evidence' then
    select receipt.owner_tenant_id into parent_owner from public.evidence_receipts receipt where receipt.id = new.evidence_receipt_id;
  elsif tg_table_name = 'preservation_evidence' then
    select run.owner_tenant_id into parent_owner from public.preservation_runs run where run.id = new.preservation_run_id;
    if not exists (
      select 1 from public.candidate_assets candidate
      where candidate.id = new.candidate_id and candidate.owner_tenant_id = parent_owner
    ) then
      raise exception 'TRUST_PRESERVATION_EVIDENCE_CANDIDATE_MISMATCH';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.owner_tenant_id is not null
     and new.owner_tenant_id is distinct from old.owner_tenant_id then
    raise exception 'TRUST_OWNER_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and (
    (tg_table_name = 'media_storage' and old.asset_id is distinct from new.asset_id)
    or (tg_table_name = 'image_evidence' and old.evidence_receipt_id is distinct from new.evidence_receipt_id)
    or (tg_table_name = 'preservation_evidence' and (
      old.preservation_run_id is distinct from new.preservation_run_id
      or old.candidate_id is distinct from new.candidate_id
    ))
  ) then
    raise exception 'TRUST_RESOURCE_REFERENCE_IMMUTABLE';
  end if;
  if parent_owner is null then
    if new.owner_tenant_id is not null then
      raise exception 'TRUST_HISTORICAL_OWNER_UNPROVEN';
    end if;
    return new;
  end if;
  if new.owner_tenant_id is null then
    new.owner_tenant_id := parent_owner;
  elsif new.owner_tenant_id is distinct from parent_owner then
    raise exception 'TRUST_RESOURCE_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists media_storage_trust_owner_guard on public.media_storage;
create trigger media_storage_trust_owner_guard before insert or update on public.media_storage
for each row execute function public.enforce_asset_scoped_owner();
drop trigger if exists image_evidence_trust_owner_guard on public.image_evidence;
create trigger image_evidence_trust_owner_guard before insert or update on public.image_evidence
for each row execute function public.enforce_asset_scoped_owner();
drop trigger if exists preservation_evidence_trust_owner_guard on public.preservation_evidence;
create trigger preservation_evidence_trust_owner_guard before insert or update on public.preservation_evidence
for each row execute function public.enforce_asset_scoped_owner();

create or replace function public.enforce_field_trust_lineage()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  transaction_owner uuid;
  transaction_asset uuid;
begin
  select transaction.owner_tenant_id, transaction.asset_id
    into transaction_owner, transaction_asset
  from public.outcome_transactions transaction
  where transaction.id = new.transaction_id;
  if transaction_owner is null then
    if new.owner_tenant_id is not null then
      raise exception 'TRUST_HISTORICAL_OWNER_UNPROVEN';
    end if;
    return new;
  end if;
  if new.owner_tenant_id is null then
    new.owner_tenant_id := transaction_owner;
  elsif new.owner_tenant_id is distinct from transaction_owner then
    raise exception 'TRUST_FIELD_OWNER_MISMATCH';
  end if;
  if new.tenant_id is distinct from transaction_owner::text then
    raise exception 'TRUST_FIELD_TENANT_MISMATCH';
  end if;

  if tg_table_name = 'field_outcomes' then
    if not exists (
      select 1 from public.asset_versions version
      where version.id = new.source_version_id
        and version.asset_id = transaction_asset
        and version.owner_tenant_id = transaction_owner
    ) then
      raise exception 'TRUST_FIELD_SOURCE_MISMATCH';
    end if;
    if not exists (
      select 1 from public.candidate_assets candidate
      where candidate.id = new.delivered_candidate_id
        and candidate.transaction_id = new.transaction_id
        and candidate.owner_tenant_id = transaction_owner
    ) then
      raise exception 'TRUST_FIELD_CANDIDATE_MISMATCH';
    end if;
    if new.task_spec_snapshot->>'id' is distinct from new.task_spec_id::text
       or (new.task_spec_snapshot->>'version')::integer is distinct from new.task_spec_version
       or new.task_spec_snapshot->>'hash' is distinct from new.task_spec_hash
       or new.task_spec_snapshot->>'transactionId' is distinct from new.transaction_id::text
       or new.task_spec_snapshot->'source'->>'assetId' is distinct from transaction_asset::text
       or new.task_spec_snapshot->'source'->>'versionId' is distinct from new.source_version_id::text then
      raise exception 'TRUST_FIELD_TASK_SPEC_MISMATCH';
    end if;
    if tg_op = 'UPDATE' and (
      old.task_spec_id is distinct from new.task_spec_id
      or old.task_spec_version is distinct from new.task_spec_version
      or old.task_spec_hash is distinct from new.task_spec_hash
      or old.task_spec_snapshot is distinct from new.task_spec_snapshot
      or old.delivered_candidate_id is distinct from new.delivered_candidate_id
    ) then
      raise exception 'TRUST_FIELD_OUTCOME_IMMUTABLE';
    end if;
  elsif tg_table_name = 'preservation_strategy_runs' then
    if not exists (
      select 1 from public.execution_runs execution
      where execution.id = new.execution_run_id
        and execution.transaction_id = new.transaction_id
        and execution.owner_tenant_id = transaction_owner
    ) or not exists (
      select 1 from public.candidate_assets candidate
      where candidate.id = new.candidate_id
        and candidate.transaction_id = new.transaction_id
        and candidate.owner_tenant_id = transaction_owner
    ) then
      raise exception 'TRUST_FIELD_STRATEGY_LINEAGE_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists field_outcomes_trust_lineage_guard on public.field_outcomes;
create trigger field_outcomes_trust_lineage_guard before insert or update on public.field_outcomes
for each row execute function public.enforce_field_trust_lineage();
drop trigger if exists preservation_strategy_runs_trust_lineage_guard on public.preservation_strategy_runs;
create trigger preservation_strategy_runs_trust_lineage_guard before insert or update on public.preservation_strategy_runs
for each row execute function public.enforce_field_trust_lineage();

create or replace function public.enforce_criterion_evidence_trust_lineage()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  transaction_owner uuid;
begin
  select transaction.owner_tenant_id into transaction_owner
  from public.outcome_transactions transaction
  where transaction.id = new.transaction_id;
  if transaction_owner is null then
    if new.owner_tenant_id is not null then
      raise exception 'TRUST_HISTORICAL_OWNER_UNPROVEN';
    end if;
    return new;
  end if;
  if new.owner_tenant_id is null then
    new.owner_tenant_id := transaction_owner;
  elsif new.owner_tenant_id is distinct from transaction_owner then
    raise exception 'TRUST_EVIDENCE_OWNER_MISMATCH';
  end if;
  if new.tenant_id is distinct from transaction_owner::text then
    raise exception 'TRUST_EVIDENCE_TENANT_MISMATCH';
  end if;
  if new.task_spec_version is null
     or new.issuer_role not in ('VERIFIER', 'SYSTEM_GATE') then
    raise exception 'TRUST_EVIDENCE_AUTHORITY_REQUIRED';
  end if;
  if not exists (
    select 1 from public.execution_runs execution
    where execution.id = new.execution_run_id
      and execution.transaction_id = new.transaction_id
      and execution.owner_tenant_id = transaction_owner
  ) or not exists (
    select 1 from public.verification_runs verification
    where verification.id = new.verification_run_id
      and verification.transaction_id = new.transaction_id
      and verification.execution_run_id = new.execution_run_id
      and verification.owner_tenant_id = transaction_owner
  ) then
    raise exception 'TRUST_EVIDENCE_EXECUTION_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists verification_criterion_evidence_trust_guard on public.verification_criterion_evidence;
create trigger verification_criterion_evidence_trust_guard before insert or update on public.verification_criterion_evidence
for each row execute function public.enforce_criterion_evidence_trust_lineage();

create or replace function public.enforce_field_feedback_trust_binding()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  outcome public.field_outcomes%rowtype;
  execution_id uuid;
begin
  select * into outcome from public.field_outcomes where id = new.field_outcome_id;
  if not found then
    raise exception 'TRUST_ACCEPTANCE_OUTCOME_NOT_FOUND';
  end if;
  if outcome.owner_tenant_id is null then
    return new;
  end if;
  if new.owner_tenant_id is null then
    new.owner_tenant_id := outcome.owner_tenant_id;
  end if;
  if new.owner_tenant_id is distinct from outcome.owner_tenant_id
     or new.tenant_id is distinct from outcome.owner_tenant_id::text then
    raise exception 'TRUST_ACCEPTANCE_TENANT_MISMATCH';
  end if;
  if new.recorded_by_principal_id is null
     or new.recorded_by is distinct from new.recorded_by_principal_id::text then
    raise exception 'TRUST_ACCEPTANCE_ACTOR_REQUIRED';
  end if;
  if not exists (
    select 1 from public.tenant_memberships membership
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = outcome.owner_tenant_id
      and membership.principal_id = new.recorded_by_principal_id
      and membership.role = 'OWNER'
      and membership.status = 'ACTIVE'
      and tenant.status = 'ACTIVE'
  ) then
    raise exception 'TRUST_ACCEPTANCE_ACTOR_NOT_AUTHORIZED';
  end if;
  select strategy.execution_run_id into execution_id
  from public.preservation_strategy_runs strategy
  where strategy.owner_tenant_id = outcome.owner_tenant_id
    and strategy.transaction_id = outcome.transaction_id
    and strategy.candidate_id = outcome.delivered_candidate_id
    and strategy.task_spec_id = outcome.task_spec_id
    and strategy.task_spec_version = outcome.task_spec_version
    and strategy.task_spec_hash = outcome.task_spec_hash
  limit 1;
  if execution_id is null then
    raise exception 'TRUST_ACCEPTANCE_EXECUTION_NOT_FOUND';
  end if;
  new.execution_run_id := execution_id;
  new.task_spec_id := outcome.task_spec_id;
  new.task_spec_version := outcome.task_spec_version;
  new.task_spec_hash := outcome.task_spec_hash;
  new.accepted_candidate_id := case when new.human_accepted then outcome.delivered_candidate_id else null end;
  if tg_op = 'UPDATE' then
    raise exception 'TRUST_ACCEPTANCE_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists field_feedback_trust_binding_guard on public.field_feedback;
create trigger field_feedback_trust_binding_guard before insert or update on public.field_feedback
for each row execute function public.enforce_field_feedback_trust_binding();

create or replace function public.enforce_canonical_asset_version_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.owner_tenant_id is not null then
    raise exception 'TRUST_ASSET_VERSION_IMMUTABLE';
  end if;
  return old;
end;
$$;

drop trigger if exists asset_versions_canonical_immutable_guard on public.asset_versions;
create trigger asset_versions_canonical_immutable_guard before update or delete on public.asset_versions
for each row execute function public.enforce_canonical_asset_version_immutable();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'transaction_patches', 'partial_intents', 'mutation_leases',
    'execution_runs', 'evidence_receipts', 'verification_runs',
    'state_commits', 'cost_records', 'semantic_snapshots',
    'candidate_assets', 'preservation_runs', 'candidate_preferences',
    'media_storage', 'image_evidence', 'preservation_evidence'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_active_tenant_select', table_name);
    execute format($policy$
      create policy %I on public.%I
        for select to authenticated
        using (
          owner_tenant_id is not null
          and exists (
            select 1
            from public.tenant_memberships membership
            join public.tenants tenant on tenant.id = membership.tenant_id
            where membership.tenant_id = %I.owner_tenant_id
              and membership.principal_id = auth.uid()
              and membership.status = 'ACTIVE'
              and tenant.status = 'ACTIVE'
          )
        )
    $policy$, table_name || '_active_tenant_select', table_name, table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
  end loop;
end $$;

grant select on table public.preservation_strategy_runs, public.field_outcomes,
  public.field_feedback, public.verification_criterion_evidence to authenticated;

-- Direct authenticated version/head mutation is removed. Narrow RPCs below
-- are SECURITY DEFINER because the canonical mutations must not be reproducible
-- as arbitrary table writes by an authenticated client.
revoke insert, update, delete on table public.assets from authenticated;
revoke insert, update, delete on table public.asset_versions from authenticated;

create or replace function public.create_tenant_asset_with_initial_version(
  p_project_id uuid,
  p_name text,
  p_description text,
  p_initial_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  project_owner uuid;
  created_asset public.assets%rowtype;
  created_version public.asset_versions%rowtype;
begin
  if actor is null then
    raise exception 'TRUST_AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  select project.owner_tenant_id into project_owner
  from public.projects project
  where project.id = p_project_id;
  if project_owner is null or not exists (
    select 1 from public.tenant_memberships membership
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = project_owner
      and membership.principal_id = actor
      and membership.status = 'ACTIVE'
      and tenant.status = 'ACTIVE'
  ) then
    raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 200 then
    raise exception 'TRUST_INVALID_ASSET_NAME';
  end if;

  insert into public.assets(owner_tenant_id, project_id, name, description)
  values (project_owner, p_project_id, btrim(p_name), p_description)
  returning * into created_asset;

  insert into public.asset_versions(owner_tenant_id, asset_id, version_number, state, parent_version_id)
  values (project_owner, created_asset.id, 1, coalesce(p_initial_state, '{}'::jsonb), null)
  returning * into created_version;

  update public.assets
  set current_version_id = created_version.id, updated_at = now()
  where id = created_asset.id
  returning * into created_asset;

  return jsonb_build_object('asset', to_jsonb(created_asset), 'version', to_jsonb(created_version));
end;
$$;

revoke all on function public.create_tenant_asset_with_initial_version(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_tenant_asset_with_initial_version(uuid, text, text, jsonb) to authenticated;

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

  update public.candidate_assets
  set committed = true
  where id = candidate.id and owner_tenant_id = outcome.owner_tenant_id;

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
  'BUILD 001 atomic commit: reauthorizes tenant OWNER, locks the asset head, validates exact TaskSpec evidence and durable human acceptance, then commits version/head/StateCommit/status in one transaction.';

revoke all on function public.enforce_transaction_scoped_owner() from public, anon, authenticated;
revoke all on function public.enforce_execution_reference_lineage() from public, anon, authenticated;
revoke all on function public.enforce_state_commit_lineage() from public, anon, authenticated;
revoke all on function public.enforce_asset_scoped_owner() from public, anon, authenticated;
revoke all on function public.enforce_field_trust_lineage() from public, anon, authenticated;
revoke all on function public.enforce_criterion_evidence_trust_lineage() from public, anon, authenticated;
revoke all on function public.enforce_field_feedback_trust_binding() from public, anon, authenticated;
revoke all on function public.enforce_canonical_asset_version_immutable() from public, anon, authenticated;
