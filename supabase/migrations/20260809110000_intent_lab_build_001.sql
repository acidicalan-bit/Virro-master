create extension if not exists pgcrypto;

create table if not exists public.intent_runs (
  id uuid primary key default gen_random_uuid(),
  raw_input text not null check (char_length(raw_input) between 1 and 8000),
  context text,
  compiled_contract jsonb not null,
  compiler_version text not null,
  model_provider text not null,
  model_name text not null,
  model_version text,
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.intent_feedback (
  id uuid primary key default gen_random_uuid(),
  intent_run_id uuid not null references public.intent_runs(id) on delete cascade,
  accepted boolean not null,
  corrected_interpretation text,
  feedback_tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_cases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  input text not null,
  context text,
  expected_concepts jsonb not null default '[]'::jsonb,
  forbidden_interpretations jsonb not null default '[]'::jsonb,
  expected_interaction_mode text not null check (expected_interaction_mode in ('ASSUME', 'SHOW_OPTIONS', 'ASK', 'EXECUTE', 'EXPLORE')),
  expected_assumptions jsonb not null default '[]'::jsonb,
  forbidden_questions jsonb not null default '[]'::jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  benchmark_case_id uuid references public.benchmark_cases(id) on delete cascade,
  compiler_version text not null,
  model_provider text not null,
  model_name text not null,
  compiled_contract jsonb not null,
  evaluation jsonb not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists intent_feedback_intent_run_id_idx on public.intent_feedback(intent_run_id);
create index if not exists intent_runs_created_at_idx on public.intent_runs(created_at desc);
create index if not exists benchmark_runs_case_created_idx on public.benchmark_runs(benchmark_case_id, created_at desc);
create index if not exists benchmark_cases_active_idx on public.benchmark_cases(active) where active = true;

alter table public.intent_runs enable row level security;
alter table public.intent_feedback enable row level security;
alter table public.benchmark_cases enable row level security;
alter table public.benchmark_runs enable row level security;

-- Build 001 has no end-user authentication. No anon/authenticated policies are
-- created: all reads and writes go through server-only repositories using the
-- service role. The service role bypasses RLS and must never reach the browser.
revoke all on table public.intent_runs from anon, authenticated;
revoke all on table public.intent_feedback from anon, authenticated;
revoke all on table public.benchmark_cases from anon, authenticated;
revoke all on table public.benchmark_runs from anon, authenticated;

comment on table public.intent_runs is 'Validated Intent Contracts and compiler metadata.';
comment on table public.intent_feedback is 'Human acceptance and corrections linked to an Intent Run.';
comment on table public.benchmark_cases is 'Versioned human-language evaluation fixtures.';
comment on table public.benchmark_runs is 'Deterministic benchmark evaluations for a compiler/model version.';
