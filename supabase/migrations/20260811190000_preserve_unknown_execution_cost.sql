-- Unknown provider cost is represented as NULL. Numeric zero is reserved for a
-- provider-reported zero. Historical rows are only backfilled when their own
-- execution metadata explicitly says the cost was not reported.

alter table public.execution_runs
  alter column cost_usd drop not null;

alter table public.evidence_receipts
  alter column cost_usd drop not null;

update public.evidence_receipts as evidence
set cost_usd = null
from public.execution_runs as execution
where evidence.execution_run_id = execution.id
  and evidence.cost_usd = 0
  and execution.metadata ->> 'costReported' = 'false';

update public.execution_runs
set cost_usd = null
where cost_usd = 0
  and metadata ->> 'costReported' = 'false';

comment on column public.execution_runs.cost_usd is
  'Provider-reported execution cost in USD. NULL means unknown/not reported; zero means a reported zero.';

comment on column public.evidence_receipts.cost_usd is
  'Provider-reported execution cost copied into the receipt. NULL means unknown/not reported.';
