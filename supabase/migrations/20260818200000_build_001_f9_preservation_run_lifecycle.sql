-- BUILD 001-F9: separate PreservationRun lifecycle updates from immutable artifacts.

create or replace function public.enforce_preservation_run_lineage()
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
    if new.owner_tenant_id is distinct from old.owner_tenant_id
       or new.transaction_id is distinct from old.transaction_id
       or new.execution_run_id is distinct from old.execution_run_id
       or new.source_version_id is distinct from old.source_version_id
       or new.raw_candidate_id is distinct from old.raw_candidate_id
       or new.policy_version is distinct from old.policy_version
       or new.methodology_version is distinct from old.methodology_version
       or new.core_roi is distinct from old.core_roi
       or new.coupled_band is distinct from old.coupled_band
       or new.started_at is distinct from old.started_at then
      raise exception 'TRUST_PRESERVATION_RUN_IMMUTABLE';
    end if;
    if old.preserved_candidate_id is not null
       and new.preserved_candidate_id is distinct from old.preserved_candidate_id then
      raise exception 'TRUST_PRESERVATION_RUN_LIFECYCLE_IMMUTABLE';
    end if;
  end if;

  select transaction.asset_id
    into transaction_asset
  from public.outcome_transactions transaction
  where transaction.id = new.transaction_id;

  select execution.transaction_id, execution.owner_tenant_id
    into referenced_transaction, referenced_owner
  from public.execution_runs execution
  where execution.id = new.execution_run_id;
  if referenced_transaction is distinct from new.transaction_id
     or referenced_owner is distinct from new.owner_tenant_id then
    raise exception 'TRUST_EXECUTION_LINEAGE_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.asset_versions version
    where version.id = new.source_version_id
      and version.asset_id = transaction_asset
      and version.owner_tenant_id = new.owner_tenant_id
  ) then
    raise exception 'TRUST_PRESERVATION_SOURCE_MISMATCH';
  end if;
  if not exists (
    select 1
    from public.candidate_assets candidate
    where candidate.id = new.raw_candidate_id
      and candidate.transaction_id = new.transaction_id
      and candidate.owner_tenant_id = new.owner_tenant_id
  ) then
    raise exception 'TRUST_PRESERVATION_CANDIDATE_MISMATCH';
  end if;

  if new.preserved_candidate_id is not null and not exists (
    select 1
    from public.candidate_assets candidate
    where candidate.id = new.preserved_candidate_id
      and candidate.owner_tenant_id = new.owner_tenant_id
      and candidate.transaction_id = new.transaction_id
      and candidate.execution_run_id = new.execution_run_id
      and candidate.candidate_type = 'PRESERVED'
      and candidate.raw_candidate_id = new.raw_candidate_id
      and candidate.preservation_run_id = new.id
  ) then
    raise exception 'TRUST_PRESERVED_CANDIDATE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists preservation_runs_trust_lineage_guard on public.preservation_runs;
create trigger preservation_runs_trust_lineage_guard after insert or update on public.preservation_runs
for each row execute function public.enforce_preservation_run_lineage();

revoke all on function public.enforce_preservation_run_lineage() from public, anon, authenticated;
