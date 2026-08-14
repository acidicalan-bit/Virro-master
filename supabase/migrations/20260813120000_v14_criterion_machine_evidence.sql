-- v1.4 criterion-level Machine Same-Spec evidence.
-- Additive only: historical verification rows are never rewritten or backfilled.

create table if not exists public.verification_criterion_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'internal-lab' check (char_length(tenant_id) between 1 and 120),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  verification_run_id uuid not null references public.verification_runs(id) on delete cascade,
  execution_run_id uuid not null references public.execution_runs(id) on delete cascade,
  criterion_id text not null check (char_length(criterion_id) between 1 and 120),
  status text not null check (status in ('PASS', 'FAIL', 'UNKNOWN')),
  evidence_type text not null check (evidence_type in ('METRIC', 'HASH', 'POLICY_CHECK', 'EXECUTOR_ASSERTION')),
  task_spec_id uuid not null,
  task_spec_hash text not null check (task_spec_hash ~ '^[0-9a-f]{64}$'),
  artifact_bindings jsonb not null default '{}'::jsonb,
  verifier jsonb not null,
  evidence_ref text not null check (char_length(evidence_ref) between 1 and 500),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, verification_run_id, criterion_id)
);

create index if not exists verification_criterion_evidence_transaction_idx
  on public.verification_criterion_evidence(tenant_id, transaction_id, created_at);
create index if not exists verification_criterion_evidence_run_idx
  on public.verification_criterion_evidence(tenant_id, verification_run_id);

do $$
begin
  execute 'drop trigger if exists verification_criterion_evidence_immutable_update on public.verification_criterion_evidence';
  execute 'create trigger verification_criterion_evidence_immutable_update before update or delete on public.verification_criterion_evidence for each row execute function public.build005_immutable_insert_only()';
exception when undefined_function then
  -- The Build 005 migration defines this shared immutable trigger. This guard
  -- keeps the migration readable if applied in isolation during a clean test.
  null;
end $$;

alter table public.verification_criterion_evidence enable row level security;
revoke all on table public.verification_criterion_evidence from anon, authenticated;
grant select, insert on table public.verification_criterion_evidence to service_role;

comment on table public.verification_criterion_evidence is
  'Durable criterion-level verifier evidence. Aggregate verification status and legacy same_spec_status are not evidence decomposition.';
