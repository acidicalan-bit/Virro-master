create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  state jsonb not null default '{}'::jsonb,
  parent_version_id uuid references public.asset_versions(id),
  created_at timestamptz not null default now(),
  unique (asset_id, version_number)
);

alter table public.assets
  add constraint fk_assets_current_version
  foreign key (current_version_id) references public.asset_versions(id);

create table if not exists public.outcome_transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_id uuid not null references public.assets(id),
  base_version_id uuid not null references public.asset_versions(id),
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'PREPARED', 'READY', 'EXECUTING', 'VERIFYING',
    'REPAIRING', 'VERIFIED', 'COMMITTED', 'FAILED', 'ABORTED'
  )),
  raw_request text not null check (char_length(raw_request) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  abort_reason text
);

create table if not exists public.transaction_patches (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  partial_intent_id uuid not null,
  operation text not null check (operation in ('SET_ATTRIBUTE', 'DELETE_ENTITY', 'TRANSFORM_ENTITY', 'ADJUST_ATTRIBUTE')),
  target_path text not null check (char_length(target_path) between 1 and 500),
  parameters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mutation_leases (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  target_path text not null check (char_length(target_path) between 1 and 500),
  category text not null check (category in ('MUTABLE', 'COUPLED', 'PRESERVE', 'HARD_LOCK')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.execution_runs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  status text not null check (status in ('SUCCESS', 'FAILURE')),
  executor text not null check (char_length(executor) between 1 and 200),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  latency_ms integer not null check (latency_ms >= 0),
  cost_usd numeric(16, 10) not null check (cost_usd >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.evidence_receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  execution_run_id uuid not null unique references public.execution_runs(id),
  base_version_id uuid not null references public.asset_versions(id),
  operation text not null check (char_length(operation) between 1 and 100),
  target text not null check (char_length(target) between 1 and 500),
  requested_effect jsonb not null,
  observed_effect jsonb not null,
  executor text not null check (char_length(executor) between 1 and 200),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  cost_usd numeric(16, 10) not null check (cost_usd >= 0),
  success boolean not null
);

create table if not exists public.verification_runs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  execution_run_id uuid not null unique references public.execution_runs(id),
  status text not null check (status in ('PASSED', 'FAILED')),
  checks jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now()
);

create table if not exists public.state_commits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.outcome_transactions(id) on delete cascade,
  asset_id uuid not null references public.assets(id),
  new_version_id uuid not null references public.asset_versions(id),
  previous_version_id uuid not null references public.asset_versions(id),
  committed_at timestamptz not null default now()
);

create table if not exists public.cost_records (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  execution_run_id uuid references public.execution_runs(id),
  amount_usd numeric(16, 10) not null check (amount_usd >= 0),
  description text not null check (char_length(description) between 1 and 500),
  recorded_at timestamptz not null default now()
);

create index if not exists assets_project_id_idx on public.assets(project_id);
create index if not exists asset_versions_asset_id_idx on public.asset_versions(asset_id);
create index if not exists outcome_transactions_asset_id_idx on public.outcome_transactions(asset_id);
create index if not exists transaction_patches_transaction_id_idx on public.transaction_patches(transaction_id);
create index if not exists mutation_leases_transaction_id_idx on public.mutation_leases(transaction_id);
create index if not exists execution_runs_transaction_id_idx on public.execution_runs(transaction_id);
create index if not exists evidence_receipts_transaction_id_idx on public.evidence_receipts(transaction_id);
create index if not exists verification_runs_transaction_id_idx on public.verification_runs(transaction_id);
create index if not exists cost_records_transaction_id_idx on public.cost_records(transaction_id);

alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.outcome_transactions enable row level security;
alter table public.transaction_patches enable row level security;
alter table public.mutation_leases enable row level security;
alter table public.execution_runs enable row level security;
alter table public.evidence_receipts enable row level security;
alter table public.verification_runs enable row level security;
alter table public.state_commits enable row level security;
alter table public.cost_records enable row level security;

revoke all on table public.projects from anon, authenticated;
revoke all on table public.assets from anon, authenticated;
revoke all on table public.asset_versions from anon, authenticated;
revoke all on table public.outcome_transactions from anon, authenticated;
revoke all on table public.transaction_patches from anon, authenticated;
revoke all on table public.mutation_leases from anon, authenticated;
revoke all on table public.execution_runs from anon, authenticated;
revoke all on table public.evidence_receipts from anon, authenticated;
revoke all on table public.verification_runs from anon, authenticated;
revoke all on table public.state_commits from anon, authenticated;
revoke all on table public.cost_records from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.projects to service_role;
grant select, insert, update, delete on table public.assets to service_role;
grant select, insert, update, delete on table public.asset_versions to service_role;
grant select, insert, update, delete on table public.outcome_transactions to service_role;
grant select, insert, update, delete on table public.transaction_patches to service_role;
grant select, insert, update, delete on table public.mutation_leases to service_role;
grant select, insert, update, delete on table public.execution_runs to service_role;
grant select, insert, update, delete on table public.evidence_receipts to service_role;
grant select, insert, update, delete on table public.verification_runs to service_role;
grant select, insert, update, delete on table public.state_commits to service_role;
grant select, insert, update, delete on table public.cost_records to service_role;

comment on table public.projects is 'Proyectos que agrupan activos para el kernel de transacciones de resultados.';
comment on table public.assets is 'Activos mutables con versionado inmutable.';
comment on table public.asset_versions is 'Versiones inmutables de un activo.';
comment on table public.outcome_transactions is 'Transacciones de resultado con ciclo de vida controlado.';
comment on table public.transaction_patches is 'Parches semanticos provider-neutral autorizados para una transaccion.';
comment on table public.mutation_leases is 'Autorizacion de efectos por camino de atributo.';
comment on table public.execution_runs is 'Ejecuciones deterministas que nunca modifican estado canonico directamente.';
comment on table public.evidence_receipts is 'Recibos de evidencia inmutables vinculados a una ejecucion.';
comment on table public.verification_runs is 'Verificaciones estructuradas de la ejecucion.';
comment on table public.state_commits is 'Commits atomicos que avanzan la cabeza del activo.';
comment on table public.cost_records is 'Registros de costo persistidos por transaccion.';

create table if not exists public.partial_intents (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  raw_input text not null check (char_length(raw_input) between 1 and 8000),
  target_path text not null check (char_length(target_path) between 1 and 500),
  operation text not null check (operation in ('SET_ATTRIBUTE', 'DELETE_ENTITY', 'TRANSFORM_ENTITY', 'ADJUST_ATTRIBUTE')),
  desired_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partial_intents_transaction_id_idx on public.partial_intents(transaction_id);

alter table public.partial_intents enable row level security;
revoke all on table public.partial_intents from anon, authenticated;
grant select, insert, update, delete on table public.partial_intents to service_role;

comment on table public.partial_intents is 'Intenciones parciales que representan solo cambios deseados sin inventar estado no especificado.';
