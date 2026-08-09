alter table public.intent_runs
  add column if not exists system_instruction_version text,
  add column if not exists provider_latency_ms integer check (provider_latency_ms is null or provider_latency_ms >= 0),
  add column if not exists cached_input_tokens integer check (cached_input_tokens is null or cached_input_tokens >= 0),
  add column if not exists reasoning_tokens integer check (reasoning_tokens is null or reasoning_tokens >= 0),
  add column if not exists estimated_cost_usd numeric(16, 10) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  add column if not exists pricing_version text;

update public.intent_runs
set system_instruction_version = 'heuristic-baseline-0.1.0'
where system_instruction_version is null;

alter table public.intent_runs
  alter column system_instruction_version set not null;

create table if not exists public.intent_model_failures (
  id uuid primary key default gen_random_uuid(),
  raw_input text not null check (char_length(raw_input) between 1 and 8000),
  context text,
  compiler_version text not null,
  model_provider text not null,
  model_name text not null,
  model_version text,
  system_instruction_version text not null,
  latency_ms integer not null check (latency_ms >= 0),
  failure_type text not null,
  failure_message text not null check (char_length(failure_message) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.blind_evaluation_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  source_label text not null,
  is_demo boolean not null default false,
  content_hash text not null unique,
  imported_at timestamptz not null default now(),
  frozen_at timestamptz not null default now()
);

create table if not exists public.blind_evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  evaluation_set_id uuid not null references public.blind_evaluation_sets(id) on delete cascade,
  external_id text not null,
  raw_input text not null check (char_length(raw_input) between 1 and 8000),
  context text,
  domain text,
  private_evaluator_notes text,
  expected_high_level_behavior text,
  position integer not null check (position >= 0),
  unique (evaluation_set_id, external_id),
  unique (evaluation_set_id, position)
);

create table if not exists public.blind_evaluation_sessions (
  id uuid primary key default gen_random_uuid(),
  evaluation_set_id uuid not null references public.blind_evaluation_sets(id),
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED')),
  compiler_version text not null,
  baseline_provider text not null,
  baseline_model text not null,
  baseline_model_version text,
  baseline_revision text not null,
  baseline_system_instruction_version text not null,
  candidate_provider text not null,
  candidate_model text not null,
  candidate_model_version text,
  candidate_system_instruction_version text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.blind_evaluation_comparisons (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.blind_evaluation_sessions(id) on delete cascade,
  evaluation_case_id uuid not null references public.blind_evaluation_cases(id),
  response_a_run_id uuid references public.intent_runs(id),
  response_a_failure_id uuid references public.intent_model_failures(id),
  response_a_source text not null check (response_a_source in ('BASELINE', 'CANDIDATE')),
  response_b_run_id uuid references public.intent_runs(id),
  response_b_failure_id uuid references public.intent_model_failures(id),
  response_b_source text not null check (response_b_source in ('BASELINE', 'CANDIDATE')),
  created_at timestamptz not null default now(),
  unique (session_id, evaluation_case_id),
  check (response_a_source <> response_b_source),
  check (((response_a_run_id is not null)::int + (response_a_failure_id is not null)::int) = 1),
  check (((response_b_run_id is not null)::int + (response_b_failure_id is not null)::int) = 1)
);

create table if not exists public.blind_evaluation_judgments (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null unique references public.blind_evaluation_comparisons(id) on delete cascade,
  preference text not null check (preference in (
    'A_CLEARLY_BETTER', 'A_SLIGHTLY_BETTER', 'TIE',
    'B_SLIGHTLY_BETTER', 'B_CLEARLY_BETTER', 'BOTH_BAD'
  )),
  ratings_a jsonb not null,
  ratings_b jsonb not null,
  evaluator_notes text,
  error_tags text[] not null default '{}',
  corrected_intent text,
  created_at timestamptz not null default now()
);

create index if not exists intent_model_failures_created_at_idx
  on public.intent_model_failures(created_at desc);
create index if not exists blind_evaluation_cases_set_position_idx
  on public.blind_evaluation_cases(evaluation_set_id, position);
create index if not exists blind_evaluation_sessions_set_created_idx
  on public.blind_evaluation_sessions(evaluation_set_id, created_at desc);
create index if not exists blind_evaluation_comparisons_session_idx
  on public.blind_evaluation_comparisons(session_id);

alter table public.intent_model_failures enable row level security;
alter table public.blind_evaluation_sets enable row level security;
alter table public.blind_evaluation_cases enable row level security;
alter table public.blind_evaluation_sessions enable row level security;
alter table public.blind_evaluation_comparisons enable row level security;
alter table public.blind_evaluation_judgments enable row level security;

revoke all on table public.intent_model_failures from anon, authenticated;
revoke all on table public.blind_evaluation_sets from anon, authenticated;
revoke all on table public.blind_evaluation_cases from anon, authenticated;
revoke all on table public.blind_evaluation_sessions from anon, authenticated;
revoke all on table public.blind_evaluation_comparisons from anon, authenticated;
revoke all on table public.blind_evaluation_judgments from anon, authenticated;

grant select, insert, update, delete on table public.intent_model_failures to service_role;
grant select, insert, update, delete on table public.blind_evaluation_sets to service_role;
grant select, insert, update, delete on table public.blind_evaluation_cases to service_role;
grant select, insert, update, delete on table public.blind_evaluation_sessions to service_role;
grant select, insert, update, delete on table public.blind_evaluation_comparisons to service_role;
grant select, insert, update, delete on table public.blind_evaluation_judgments to service_role;

comment on table public.intent_model_failures is 'Explicit provider and validation failures; never replaced by heuristic fallback.';
comment on table public.blind_evaluation_sets is 'Immutable imported evaluation sets identified by content hash.';
comment on table public.blind_evaluation_cases is 'Unseen evaluation cases. Private notes remain server-side until session completion.';
comment on table public.blind_evaluation_sessions is 'Frozen A/B model and compiler identities for one human evaluation session.';
comment on table public.blind_evaluation_comparisons is 'Server-side randomized A/B mapping linked to immutable model runs or failures.';
comment on table public.blind_evaluation_judgments is 'Human preference, independent ratings and correction signal without overwriting outputs.';
