-- PRODUCT GATE 004: append-only, blind human value study over frozen BUILD 004 evidence.

create table if not exists public.preservation_value_studies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  protocol_version text not null,
  target_case_count integer not null check (target_case_count > 0),
  created_at timestamptz not null default now()
);

insert into public.preservation_value_studies (slug, name, protocol_version, target_case_count)
values ('preservation-value-study-v0-1', 'PRODUCT GATE 004 — Preservation Value Study v0.1', 'preservation-value-study-v0.1', 30)
on conflict (slug) do nothing;

create table if not exists public.preservation_study_cases (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.preservation_value_studies(id),
  plan_case_id text,
  topology text not null check (topology in ('LOCAL_INDEPENDENT', 'LOCAL_COUPLED', 'STRUCTURAL', 'GLOBAL')),
  task_type text not null check (task_type in ('COLOR_CHANGE', 'OBJECT_REMOVAL', 'TEXT_EDIT', 'IDENTITY_EDIT', 'PRODUCT_EDIT', 'GEOMETRY_EDIT', 'OTHER')),
  transaction_id uuid not null references public.outcome_transactions(id),
  execution_run_id uuid not null references public.execution_runs(id),
  preservation_run_id uuid not null references public.preservation_runs(id),
  source_version_id uuid not null references public.asset_versions(id),
  raw_candidate_id uuid not null references public.candidate_assets(id),
  preserved_candidate_id uuid not null references public.candidate_assets(id),
  source_storage_key text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_width integer not null check (source_width > 0),
  source_height integer not null check (source_height > 0),
  raw_storage_key text not null,
  raw_sha256 text not null check (raw_sha256 ~ '^[0-9a-f]{64}$'),
  raw_width integer not null check (raw_width > 0),
  raw_height integer not null check (raw_height > 0),
  preserved_storage_key text not null,
  preserved_sha256 text not null check (preserved_sha256 ~ '^[0-9a-f]{64}$'),
  preserved_width integer not null check (preserved_width > 0),
  preserved_height integer not null check (preserved_height > 0),
  instruction text not null check (char_length(instruction) between 1 and 8000),
  roi jsonb not null check (jsonb_typeof(roi) = 'object'),
  coupled_band jsonb not null check (jsonb_typeof(coupled_band) = 'object'),
  provider text not null,
  model text not null,
  raw_metrics jsonb not null check (jsonb_typeof(raw_metrics) = 'object'),
  preserved_metrics jsonb not null check (jsonb_typeof(preserved_metrics) = 'object'),
  created_at timestamptz not null default now(),
  unique (study_id, transaction_id),
  unique (study_id, plan_case_id),
  check (raw_candidate_id <> preserved_candidate_id)
);

create table if not exists public.preservation_study_intents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.preservation_study_cases(id),
  expected_change text not null check (char_length(expected_change) between 1 and 8000),
  expected_preservation text not null check (char_length(expected_preservation) between 1 and 8000),
  unacceptable_notes text check (unacceptable_notes is null or char_length(unacceptable_notes) <= 8000),
  locked_at timestamptz not null default now()
);

create table if not exists public.preservation_study_presentations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.preservation_study_cases(id),
  candidate_a text not null check (candidate_a in ('RAW', 'PRESERVED')),
  candidate_a_id uuid not null references public.candidate_assets(id),
  candidate_b text not null check (candidate_b in ('RAW', 'PRESERVED')),
  candidate_b_id uuid not null references public.candidate_assets(id),
  randomized_at timestamptz not null default now(),
  check (candidate_a <> candidate_b),
  check (candidate_a_id <> candidate_b_id)
);

create table if not exists public.preservation_study_ratings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.preservation_study_cases(id),
  candidate_label text not null check (candidate_label in ('A', 'B')),
  ratings jsonb not null check (jsonb_typeof(ratings) = 'object'),
  failure_tags text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 8000),
  locked_at timestamptz not null default now(),
  unique (case_id, candidate_label),
  check (ratings ?& array['requestedEditSuccess','preservationSuccess','naturalness','artifactFreedom','overallUsefulness']),
  check ((ratings->>'requestedEditSuccess')::numeric in (0,1,2)),
  check ((ratings->>'preservationSuccess')::numeric in (0,1,2)),
  check ((ratings->>'naturalness')::numeric in (0,1,2)),
  check ((ratings->>'artifactFreedom')::numeric in (0,1,2)),
  check ((ratings->>'overallUsefulness')::numeric in (0,1,2)),
  check (failure_tags <@ array['boundary_artifact','shadow_cutoff','geometry_cutoff','texture_discontinuity','identity_drift','background_drift','text_drift','requested_edit_failed','over_preservation','under_preservation','other']::text[])
);

create table if not exists public.preservation_study_pairwise (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.preservation_study_cases(id),
  preference text not null check (preference in ('A_BETTER', 'B_BETTER', 'TIE', 'BOTH_BAD')),
  derived_preference text not null check (derived_preference in ('RAW_BETTER', 'PRESERVED_BETTER', 'TIE', 'BOTH_BAD')),
  divergence_tags text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 8000),
  locked_at timestamptz not null default now(),
  check (divergence_tags <@ array['LARGE_PIXEL_GAIN_NO_HUMAN_PREFERENCE','LARGE_PIXEL_GAIN_PRESERVED_PREFERENCE','LARGE_PIXEL_GAIN_RAW_PREFERENCE','SMALL_PIXEL_DIFFERENCE_HUMAN_PRESERVATION_FAILURE']::text[])
);

create table if not exists public.preservation_study_acceptances (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.preservation_study_cases(id),
  raw_accepted boolean not null,
  preserved_accepted boolean not null,
  locked_at timestamptz not null default now()
);

create or replace function public.lock_preservation_study_intent(
  p_case_id uuid,
  p_expected_change text,
  p_expected_preservation text,
  p_unacceptable_notes text,
  p_candidate_a text,
  p_candidate_a_id uuid,
  p_candidate_b text,
  p_candidate_b_id uuid
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_case public.preservation_study_cases%rowtype;
  v_intent public.preservation_study_intents%rowtype;
  v_presentation public.preservation_study_presentations%rowtype;
begin
  select * into strict v_case from public.preservation_study_cases where id = p_case_id for update;
  if exists (select 1 from public.preservation_study_intents where case_id = p_case_id)
     or exists (select 1 from public.preservation_study_presentations where case_id = p_case_id) then
    raise exception 'Study intent and presentation are already locked';
  end if;
  if not (
    (p_candidate_a = 'RAW' and p_candidate_a_id = v_case.raw_candidate_id and p_candidate_b = 'PRESERVED' and p_candidate_b_id = v_case.preserved_candidate_id)
    or
    (p_candidate_a = 'PRESERVED' and p_candidate_a_id = v_case.preserved_candidate_id and p_candidate_b = 'RAW' and p_candidate_b_id = v_case.raw_candidate_id)
  ) then
    raise exception 'Randomized presentation does not match frozen candidates';
  end if;
  insert into public.preservation_study_intents (case_id, expected_change, expected_preservation, unacceptable_notes)
  values (p_case_id, p_expected_change, p_expected_preservation, p_unacceptable_notes)
  returning * into v_intent;
  insert into public.preservation_study_presentations (case_id, candidate_a, candidate_a_id, candidate_b, candidate_b_id)
  values (p_case_id, p_candidate_a, p_candidate_a_id, p_candidate_b, p_candidate_b_id)
  returning * into v_presentation;
  return jsonb_build_object('intent', to_jsonb(v_intent), 'presentation', to_jsonb(v_presentation));
end;
$$;

create or replace function public.enforce_preservation_study_sequence()
returns trigger language plpgsql set search_path = public as $$
declare
  v_presentation public.preservation_study_presentations%rowtype;
  v_expected text;
begin
  if tg_table_name = 'preservation_study_ratings' then
    select * into strict v_presentation from public.preservation_study_presentations where case_id = new.case_id;
    if new.candidate_label = 'A' and exists (select 1 from public.preservation_study_ratings where case_id = new.case_id) then
      raise exception 'Candidate A must be rated first and only once';
    end if;
    if new.candidate_label = 'B' and not exists (select 1 from public.preservation_study_ratings where case_id = new.case_id and candidate_label = 'A') then
      raise exception 'Candidate A must be rated before B';
    end if;
  elsif tg_table_name = 'preservation_study_pairwise' then
    if (select count(*) from public.preservation_study_ratings where case_id = new.case_id) <> 2 then
      raise exception 'Both independent ratings are required';
    end if;
    select * into strict v_presentation from public.preservation_study_presentations where case_id = new.case_id;
    v_expected := case
      when new.preference in ('TIE', 'BOTH_BAD') then new.preference
      when new.preference = 'A_BETTER' and v_presentation.candidate_a = 'RAW' then 'RAW_BETTER'
      when new.preference = 'A_BETTER' then 'PRESERVED_BETTER'
      when new.preference = 'B_BETTER' and v_presentation.candidate_b = 'RAW' then 'RAW_BETTER'
      else 'PRESERVED_BETTER'
    end;
    if new.derived_preference <> v_expected then raise exception 'Derived preference does not match frozen presentation'; end if;
  elsif tg_table_name = 'preservation_study_acceptances' then
    if not exists (select 1 from public.preservation_study_pairwise where case_id = new.case_id) then
      raise exception 'Pairwise preference must be locked before acceptance';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists preservation_study_rating_sequence on public.preservation_study_ratings;
create trigger preservation_study_rating_sequence before insert on public.preservation_study_ratings
for each row execute function public.enforce_preservation_study_sequence();
drop trigger if exists preservation_study_pairwise_sequence on public.preservation_study_pairwise;
create trigger preservation_study_pairwise_sequence before insert on public.preservation_study_pairwise
for each row execute function public.enforce_preservation_study_sequence();
drop trigger if exists preservation_study_acceptance_sequence on public.preservation_study_acceptances;
create trigger preservation_study_acceptance_sequence before insert on public.preservation_study_acceptances
for each row execute function public.enforce_preservation_study_sequence();

create or replace function public.reject_preservation_study_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Preservation study history is append-only';
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'preservation_study_cases', 'preservation_study_intents', 'preservation_study_presentations',
    'preservation_study_ratings', 'preservation_study_pairwise', 'preservation_study_acceptances'
  ] loop
    execute format('drop trigger if exists reject_study_mutation on public.%I', table_name);
    execute format('create trigger reject_study_mutation before update or delete on public.%I for each row execute function public.reject_preservation_study_mutation()', table_name);
  end loop;
end $$;

create index if not exists preservation_study_cases_study_idx on public.preservation_study_cases(study_id, created_at);

alter table public.preservation_value_studies enable row level security;
alter table public.preservation_study_cases enable row level security;
alter table public.preservation_study_intents enable row level security;
alter table public.preservation_study_presentations enable row level security;
alter table public.preservation_study_ratings enable row level security;
alter table public.preservation_study_pairwise enable row level security;
alter table public.preservation_study_acceptances enable row level security;

revoke all on table public.preservation_value_studies, public.preservation_study_cases,
  public.preservation_study_intents, public.preservation_study_presentations,
  public.preservation_study_ratings, public.preservation_study_pairwise,
  public.preservation_study_acceptances from anon, authenticated;
revoke all on function public.lock_preservation_study_intent(uuid, text, text, text, text, uuid, text, uuid) from public, anon, authenticated;

grant select, insert on table public.preservation_value_studies, public.preservation_study_cases,
  public.preservation_study_intents, public.preservation_study_presentations,
  public.preservation_study_ratings, public.preservation_study_pairwise,
  public.preservation_study_acceptances to service_role;
grant execute on function public.lock_preservation_study_intent(uuid, text, text, text, text, uuid, text, uuid) to service_role;

comment on table public.preservation_study_cases is 'Immutable snapshots of one BUILD 004 SOURCE/RAW/PRESERVED chain; no regeneration.';
comment on table public.preservation_study_presentations is 'Persisted randomized A/B identity, hidden by the application until pairwise lock.';
comment on table public.preservation_study_acceptances is 'Experimental acceptance only; never creates a canonical asset commit.';
