-- BUILD 004: deterministic preservation, raw-vs-preserved evidence, and human decisions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760, array['image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.candidate_assets
  drop constraint if exists candidate_assets_execution_run_id_key;

-- Build 003 introduced EDIT_REGION in the domain contract, but the Build 002
-- database checks still only allowed the original four operations. Keep the
-- persisted contract aligned with the validated TypeScript schemas.
alter table public.partial_intents
  drop constraint if exists partial_intents_operation_check,
  add constraint partial_intents_operation_check
    check (operation in ('SET_ATTRIBUTE', 'DELETE_ENTITY', 'TRANSFORM_ENTITY', 'ADJUST_ATTRIBUTE', 'EDIT_REGION'));

alter table public.transaction_patches
  drop constraint if exists transaction_patches_operation_check,
  add constraint transaction_patches_operation_check
    check (operation in ('SET_ATTRIBUTE', 'DELETE_ENTITY', 'TRANSFORM_ENTITY', 'ADJUST_ATTRIBUTE', 'EDIT_REGION'));

alter table public.candidate_assets
  add column if not exists candidate_type text not null default 'RAW_PROVIDER',
  add column if not exists source_version_id uuid references public.asset_versions(id),
  add column if not exists raw_candidate_id uuid references public.candidate_assets(id),
  add column if not exists preservation_run_id uuid;

update public.candidate_assets candidate
set source_version_id = transaction.base_version_id
from public.outcome_transactions transaction
where transaction.id = candidate.transaction_id
  and candidate.source_version_id is null;

alter table public.candidate_assets
  alter column source_version_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidate_assets_candidate_type_check'
  ) then
    alter table public.candidate_assets
      add constraint candidate_assets_candidate_type_check
      check (candidate_type in ('RAW_PROVIDER', 'PRESERVED'));
  end if;
end $$;

create unique index if not exists candidate_assets_execution_type_uidx
  on public.candidate_assets(execution_run_id, candidate_type);

create table if not exists public.preservation_runs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  execution_run_id uuid not null references public.execution_runs(id),
  source_version_id uuid not null references public.asset_versions(id),
  raw_candidate_id uuid not null references public.candidate_assets(id),
  preserved_candidate_id uuid references public.candidate_assets(id),
  policy_version text not null,
  methodology_version text not null,
  core_roi jsonb not null,
  coupled_band jsonb not null,
  zones jsonb,
  status text not null check (status in ('RUNNING', 'SUCCESS', 'FAILURE')),
  error_code text,
  error_message text,
  processing_time_ms numeric(16, 3),
  started_at timestamptz not null,
  completed_at timestamptz,
  unique (execution_run_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidate_assets_preservation_run_fk'
  ) then
    alter table public.candidate_assets
      add constraint candidate_assets_preservation_run_fk
      foreign key (preservation_run_id) references public.preservation_runs(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidate_assets_commit_preserved_check'
  ) then
    alter table public.candidate_assets
      add constraint candidate_assets_commit_preserved_check
      check (not committed or candidate_type = 'PRESERVED') not valid;
  end if;
end $$;

create table if not exists public.preservation_evidence (
  id uuid primary key default gen_random_uuid(),
  preservation_run_id uuid not null references public.preservation_runs(id) on delete cascade,
  candidate_id uuid not null unique references public.candidate_assets(id),
  candidate_type text not null check (candidate_type in ('RAW_PROVIDER', 'PRESERVED')),
  methodology_version text not null,
  mean_total_pixel_diff numeric(12, 11) not null check (mean_total_pixel_diff between 0 and 1),
  changed_pixel_ratio_total numeric(12, 11) not null check (changed_pixel_ratio_total between 0 and 1),
  mean_core_pixel_diff numeric(12, 11) not null check (mean_core_pixel_diff between 0 and 1),
  changed_pixel_ratio_core numeric(12, 11) not null check (changed_pixel_ratio_core between 0 and 1),
  mean_coupled_pixel_diff numeric(12, 11) not null check (mean_coupled_pixel_diff between 0 and 1),
  changed_pixel_ratio_coupled numeric(12, 11) not null check (changed_pixel_ratio_coupled between 0 and 1),
  mean_locked_outside_pixel_diff numeric(12, 11) not null check (mean_locked_outside_pixel_diff between 0 and 1),
  changed_pixel_ratio_locked_outside numeric(12, 11) not null check (changed_pixel_ratio_locked_outside between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.outcome_transactions(id) on delete cascade,
  raw_candidate_id uuid not null references public.candidate_assets(id),
  preserved_candidate_id uuid not null references public.candidate_assets(id),
  preference text not null check (preference in ('RAW', 'PRESERVED', 'TIE', 'BOTH_BAD')),
  evaluation_tags text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 2000),
  human_accepted boolean,
  accepted_candidate_id uuid references public.candidate_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_preferences
  add column if not exists evaluation_tags text[] not null default '{}',
  add column if not exists notes text;

alter table public.candidate_preferences
  drop constraint if exists candidate_preferences_notes_check,
  add constraint candidate_preferences_notes_check
    check (notes is null or char_length(notes) <= 2000);

create index if not exists preservation_runs_transaction_id_idx on public.preservation_runs(transaction_id);
create index if not exists preservation_evidence_run_id_idx on public.preservation_evidence(preservation_run_id);
create index if not exists candidate_preferences_transaction_id_idx on public.candidate_preferences(transaction_id);

alter table public.preservation_runs enable row level security;
alter table public.preservation_evidence enable row level security;
alter table public.candidate_preferences enable row level security;

revoke all on table public.preservation_runs from anon, authenticated;
revoke all on table public.preservation_evidence from anon, authenticated;
revoke all on table public.candidate_preferences from anon, authenticated;

grant select, insert, update, delete on table public.preservation_runs to service_role;
grant select, insert, update, delete on table public.preservation_evidence to service_role;
grant select, insert, update, delete on table public.candidate_preferences to service_role;

comment on table public.preservation_runs is 'Deterministic preservation runs derived from one raw provider candidate.';
comment on table public.preservation_evidence is 'Independent zone metrics for raw and preserved candidates; pixel suppression is not semantic correctness.';
comment on table public.candidate_preferences is 'Experimental human preference and separate preserved-candidate acceptance decision.';
