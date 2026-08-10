comment on table public.blind_evaluation_comparisons is 'Server-side randomized A/B mapping linked to immutable model runs or failures. Compilation is deferred until human intent is recorded.';

create table if not exists public.blind_evaluation_human_intents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.blind_evaluation_sessions(id) on delete cascade,
  comparison_id uuid references public.blind_evaluation_comparisons(id) on delete set null,
  evaluation_case_id uuid not null references public.blind_evaluation_cases(id),
  intended_meaning text not null check (char_length(intended_meaning) between 1 and 8000),
  expected_next_action text not null check (expected_next_action in ('ASSUME', 'SHOW_OPTIONS', 'ASK', 'EXECUTE', 'EXPLORE')),
  preservation_notes text,
  recorded_at timestamptz not null default now(),
  locked_at timestamptz not null default now(),
  unique (session_id, evaluation_case_id)
);

create table if not exists public.blind_evaluation_step_ratings (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.blind_evaluation_comparisons(id) on delete cascade,
  output_position integer not null check (output_position in (1, 2)),
  ratings jsonb not null,
  error_tags text[] not null default '{}',
  evaluator_notes text,
  created_at timestamptz not null default now(),
  unique (comparison_id, output_position)
);

alter table public.blind_evaluation_judgments
  alter column preference drop not null;

create index if not exists blind_evaluation_human_intents_case_idx
  on public.blind_evaluation_human_intents(evaluation_case_id);
create index if not exists blind_evaluation_human_intents_comparison_idx
  on public.blind_evaluation_human_intents(comparison_id);
create index if not exists blind_evaluation_step_ratings_comparison_idx
  on public.blind_evaluation_step_ratings(comparison_id);

alter table public.blind_evaluation_human_intents enable row level security;
alter table public.blind_evaluation_step_ratings enable row level security;

revoke all on table public.blind_evaluation_human_intents from anon, authenticated;
revoke all on table public.blind_evaluation_step_ratings from anon, authenticated;

grant select, insert, update, delete on table public.blind_evaluation_human_intents to service_role;
grant select, insert, update, delete on table public.blind_evaluation_step_ratings to service_role;

comment on table public.blind_evaluation_human_intents is 'Pre-model human interpretation frozen before outputs are revealed. Immutable within the active session.';
comment on table public.blind_evaluation_step_ratings is 'Independent per-output ratings collected sequentially; each output rated on its own without contaminating the other.';
