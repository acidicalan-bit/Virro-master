-- BUILD 001-F8: keep table-specific trigger row shapes isolated.

create or replace function public.enforce_media_storage_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_owner uuid;
begin
  select asset.owner_tenant_id
    into parent_owner
  from public.assets asset
  where asset.id = new.asset_id;

  if tg_op = 'UPDATE' and old.owner_tenant_id is not null
     and new.owner_tenant_id is distinct from old.owner_tenant_id then
    raise exception 'TRUST_OWNER_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and old.asset_id is distinct from new.asset_id then
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

create or replace function public.enforce_image_evidence_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_owner uuid;
begin
  select receipt.owner_tenant_id
    into parent_owner
  from public.evidence_receipts receipt
  where receipt.id = new.evidence_receipt_id;

  if tg_op = 'UPDATE' and old.owner_tenant_id is not null
     and new.owner_tenant_id is distinct from old.owner_tenant_id then
    raise exception 'TRUST_OWNER_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and old.evidence_receipt_id is distinct from new.evidence_receipt_id then
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

create or replace function public.enforce_preservation_evidence_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_owner uuid;
begin
  select run.owner_tenant_id
    into parent_owner
  from public.preservation_runs run
  where run.id = new.preservation_run_id;

  if not exists (
    select 1
    from public.candidate_assets candidate
    where candidate.id = new.candidate_id
      and candidate.owner_tenant_id = parent_owner
  ) then
    raise exception 'TRUST_PRESERVATION_EVIDENCE_CANDIDATE_MISMATCH';
  end if;
  if tg_op = 'UPDATE' and old.owner_tenant_id is not null
     and new.owner_tenant_id is distinct from old.owner_tenant_id then
    raise exception 'TRUST_OWNER_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and (
    old.preservation_run_id is distinct from new.preservation_run_id
    or old.candidate_id is distinct from new.candidate_id
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
create trigger media_storage_trust_owner_guard
before insert or update on public.media_storage
for each row execute function public.enforce_media_storage_owner();

drop trigger if exists image_evidence_trust_owner_guard on public.image_evidence;
create trigger image_evidence_trust_owner_guard
before insert or update on public.image_evidence
for each row execute function public.enforce_image_evidence_owner();

drop trigger if exists preservation_evidence_trust_owner_guard on public.preservation_evidence;
create trigger preservation_evidence_trust_owner_guard
before insert or update on public.preservation_evidence
for each row execute function public.enforce_preservation_evidence_owner();

revoke all on function public.enforce_media_storage_owner() from public, anon, authenticated;
revoke all on function public.enforce_image_evidence_owner() from public, anon, authenticated;
revoke all on function public.enforce_preservation_evidence_owner() from public, anon, authenticated;
