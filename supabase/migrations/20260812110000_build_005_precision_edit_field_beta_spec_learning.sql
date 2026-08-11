-- BUILD 005 recovery: internal field beta records anchored to the Foundation 1.3 spec.
-- The untracked partial migration is intentionally not reused.

create table if not exists public.preservation_policy_versions (
  tenant_id text not null default 'internal-lab',
  policy_version text not null,
  status text not null,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, policy_version)
);

create table if not exists public.preservation_strategy_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  execution_run_id uuid not null references public.execution_runs(id),
  raw_candidate_id uuid not null references public.candidate_assets(id),
  candidate_id uuid not null references public.candidate_assets(id),
  policy_version text not null,
  outcome_sku text not null check (outcome_sku = 'precision-edit-v0'),
  blueprint_id uuid not null,
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_hash text not null,
  task_spec_id uuid not null,
  task_spec_version integer not null check (task_spec_version > 0),
  task_spec_hash text not null,
  spec_compiler_version text not null,
  strategy_id text not null check (strategy_id in ('P0_RAW', 'P1_SOFT', 'P2_MODERATE', 'P3_HARD')),
  parameters jsonb not null,
  candidate_role text not null check (candidate_role in ('DELIVERED', 'SHADOW')),
  machine_metrics jsonb not null,
  preservation_latency_ms numeric(16,3) not null check (preservation_latency_ms >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, transaction_id, strategy_id)
);

create table if not exists public.field_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  transaction_id uuid not null unique references public.outcome_transactions(id) on delete cascade,
  source_version_id uuid not null references public.asset_versions(id),
  source_sha256 text not null,
  instruction text not null check (char_length(instruction) between 1 and 8000),
  roi jsonb not null,
  topology text not null check (topology in ('LOCAL_INDEPENDENT', 'LOCAL_COUPLED', 'STRUCTURAL', 'GLOBAL')),
  task_type text not null,
  provider text not null,
  model text not null,
  raw_candidate_id uuid not null references public.candidate_assets(id),
  delivered_candidate_id uuid not null references public.candidate_assets(id),
  recommended_strategy text not null check (recommended_strategy in ('P0_RAW', 'P1_SOFT', 'P2_MODERATE', 'P3_HARD')),
  strategy_id text not null check (strategy_id in ('P0_RAW', 'P1_SOFT', 'P2_MODERATE', 'P3_HARD')),
  policy_version text not null,
  outcome_sku text not null check (outcome_sku = 'precision-edit-v0'),
  blueprint_id uuid not null,
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_hash text not null,
  task_spec_id uuid not null,
  task_spec_version integer not null check (task_spec_version > 0),
  task_spec_hash text not null,
  spec_compiler_name text not null,
  spec_compiler_version text not null,
  machine_verification_status text not null check (machine_verification_status in ('PASSED', 'FAILED')),
  same_spec_status text not null check (same_spec_status in ('PASSED', 'FAILED', 'BLOCKED')),
  override_reason text,
  provider_latency_ms numeric(16,3) not null check (provider_latency_ms >= 0),
  preservation_latency_ms numeric(16,3) not null check (preservation_latency_ms >= 0),
  total_latency_ms numeric(16,3) not null check (total_latency_ms >= 0),
  provider_cost_usd numeric(16,8) check (provider_cost_usd is null or provider_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.field_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  field_outcome_id uuid not null unique references public.field_outcomes(id) on delete cascade,
  human_accepted boolean not null,
  acceptance_source text not null default 'HUMAN_EVALUATOR' check (acceptance_source = 'HUMAN_EVALUATOR'),
  recorded_by text not null default 'internal-evaluator',
  failure_tags text[] not null default '{}',
  human_correction text,
  created_at timestamptz not null default now()
);

create table if not exists public.field_regression_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  field_outcome_id uuid not null unique references public.field_outcomes(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.field_golden_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  field_outcome_id uuid not null unique references public.field_outcomes(id) on delete cascade,
  golden_version text not null,
  intent_expectation text not null,
  critical_preservation_expectation text not null,
  promotion_reason text not null,
  provenance jsonb not null,
  usage_authorization_status text not null check (usage_authorization_status in ('NOT_AUTHORIZED', 'AUTHORIZED_INTERNAL')),
  regression_candidate_id uuid references public.field_regression_candidates(id),
  created_at timestamptz not null default now()
);

create table if not exists public.field_evaluation_samples (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  field_outcome_id uuid not null unique references public.field_outcomes(id) on delete cascade,
  candidate_a_id uuid not null references public.candidate_assets(id),
  candidate_a_strategy text not null check (candidate_a_strategy in ('P0_RAW', 'P1_SOFT', 'P2_MODERATE', 'P3_HARD')),
  candidate_b_id uuid not null references public.candidate_assets(id),
  candidate_b_strategy text not null check (candidate_b_strategy in ('P0_RAW', 'P1_SOFT', 'P2_MODERATE', 'P3_HARD')),
  created_at timestamptz not null default now(),
  check (candidate_a_id <> candidate_b_id)
);

create table if not exists public.field_evaluation_judgments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab',
  sample_id uuid not null unique references public.field_evaluation_samples(id) on delete cascade,
  preference text not null check (preference in ('A_BETTER', 'B_BETTER', 'TIE', 'BOTH_BAD')),
  created_at timestamptz not null default now()
);

create or replace function public.build005_immutable_insert_only() returns trigger language plpgsql as $$
begin
  raise exception 'BUILD 005 records are immutable; append a new version/record instead';
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['field_outcomes','field_feedback','field_regression_candidates','field_golden_cases','field_evaluation_samples','field_evaluation_judgments'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_immutable_update', table_name);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.build005_immutable_insert_only()', table_name || '_immutable_update', table_name);
  end loop;
end $$;

alter table public.preservation_policy_versions enable row level security;
alter table public.preservation_strategy_runs enable row level security;
alter table public.field_outcomes enable row level security;
alter table public.field_feedback enable row level security;
alter table public.field_regression_candidates enable row level security;
alter table public.field_golden_cases enable row level security;
alter table public.field_evaluation_samples enable row level security;
alter table public.field_evaluation_judgments enable row level security;

revoke all on table public.preservation_policy_versions, public.preservation_strategy_runs, public.field_outcomes, public.field_feedback, public.field_regression_candidates, public.field_golden_cases, public.field_evaluation_samples, public.field_evaluation_judgments from anon, authenticated;
grant select, insert on table public.preservation_policy_versions, public.preservation_strategy_runs, public.field_outcomes, public.field_feedback, public.field_regression_candidates, public.field_golden_cases, public.field_evaluation_samples, public.field_evaluation_judgments to service_role;

create index if not exists field_outcomes_tenant_created_idx on public.field_outcomes(tenant_id, created_at desc);
create index if not exists field_outcomes_task_spec_idx on public.field_outcomes(task_spec_id, task_spec_hash);
create index if not exists strategy_runs_task_spec_idx on public.preservation_strategy_runs(task_spec_id, task_spec_hash);

comment on table public.field_outcomes is 'Internal BUILD 005 executions; provider cost is nullable and canonical commit is intentionally out of scope.';
