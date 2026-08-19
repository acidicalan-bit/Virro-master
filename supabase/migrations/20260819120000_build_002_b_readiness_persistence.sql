-- BUILD 002-B: immutable, tenant-rooted persistence for BUILD 002-A snapshots.
-- This migration is additive. It deliberately does not add execution bindings,
-- API behavior, mutable readiness pointers, or historical backfill.

create unique index if not exists outcome_transactions_owner_id_uq
  on public.outcome_transactions(owner_tenant_id, id);

create table if not exists public.build002_signal_requirements (
  id uuid primary key default gen_random_uuid(),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  outcome_transaction_id uuid not null,
  requirement_id text not null check (char_length(requirement_id) between 1 and 120),
  semantic_type text not null check (char_length(semantic_type) between 1 and 160),
  critical boolean not null,
  accepted_provenance jsonb not null check (jsonb_typeof(accepted_provenance) = 'array'),
  qualification_rule jsonb not null check (jsonb_typeof(qualification_rule) = 'object'),
  dependency_selectors jsonb not null check (jsonb_typeof(dependency_selectors) = 'array'),
  blueprint_id uuid not null,
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_hash text not null check (blueprint_hash ~ '^[0-9a-fA-F]{64}$'),
  policy_id text,
  policy_hash text check (policy_hash is null or policy_hash ~ '^[0-9a-fA-F]{64}$'),
  schema_version text not null check (schema_version = 'build002-signal-requirement-v0.1'),
  requirement_definition_hash text not null check (requirement_definition_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null,
  unique (owner_tenant_id, outcome_transaction_id, id),
  unique (owner_tenant_id, outcome_transaction_id, requirement_definition_hash),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict
);

create table if not exists public.build002_dependency_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  outcome_transaction_id uuid not null,
  requirement_definition_hashes jsonb not null check (jsonb_typeof(requirement_definition_hashes) = 'array'),
  signal_references jsonb not null check (jsonb_typeof(signal_references) = 'array'),
  dependency_bindings jsonb not null check (jsonb_typeof(dependency_bindings) = 'array'),
  blueprint_hash text check (blueprint_hash is null or blueprint_hash ~ '^[0-9a-fA-F]{64}$'),
  policy_hash text check (policy_hash is null or policy_hash ~ '^[0-9a-fA-F]{64}$'),
  task_spec_hash text check (task_spec_hash is null or task_spec_hash ~ '^[0-9a-fA-F]{64}$'),
  transaction_semantic_hash text check (transaction_semantic_hash is null or transaction_semantic_hash ~ '^[0-9a-fA-F]{64}$'),
  source_asset_version_hash text check (source_asset_version_hash is null or source_asset_version_hash ~ '^[0-9a-fA-F]{64}$'),
  context_lens_hash text check (context_lens_hash is null or context_lens_hash ~ '^[0-9a-fA-F]{64}$'),
  schema_version text not null check (schema_version = 'build002-dependency-snapshot-v0.2'),
  dependency_snapshot_hash text not null check (dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now(),
  unique (owner_tenant_id, outcome_transaction_id, id),
  unique (owner_tenant_id, outcome_transaction_id, id, dependency_snapshot_hash),
  unique (owner_tenant_id, outcome_transaction_id, dependency_snapshot_hash),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict
);

create table if not exists public.build002_signals (
  signal_id uuid primary key,
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  outcome_transaction_id uuid not null,
  requirement_id text not null check (char_length(requirement_id) between 1 and 120),
  requirement_definition_hash text not null check (requirement_definition_hash ~ '^[0-9a-fA-F]{64}$'),
  payload jsonb not null,
  source jsonb not null check (jsonb_typeof(source) = 'object'),
  provenance text not null check (provenance in ('CUSTOMER_STATED', 'OBSERVED', 'SYSTEM_DERIVED', 'INFERRED', 'APPROVED', 'UNKNOWN')),
  captured_at timestamptz not null,
  valid_until timestamptz,
  dependency_identity text not null check (char_length(dependency_identity) between 1 and 240),
  dependency_hash text not null check (dependency_hash ~ '^[0-9a-fA-F]{64}$'),
  schema_version text not null check (schema_version = 'build002-signal-v0.2'),
  content_hash text not null check (content_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now(),
  unique (owner_tenant_id, outcome_transaction_id, signal_id),
  unique (owner_tenant_id, outcome_transaction_id, signal_id, content_hash),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, requirement_definition_hash)
    references public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_definition_hash) on delete restrict
);

create table if not exists public.build002_dependency_requirements (
  owner_tenant_id uuid not null,
  outcome_transaction_id uuid not null,
  dependency_snapshot_id uuid not null,
  requirement_definition_hash text not null check (requirement_definition_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now(),
  primary key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, requirement_definition_hash),
  foreign key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id)
    references public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, requirement_definition_hash)
    references public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_definition_hash) on delete restrict
);

create table if not exists public.build002_dependency_signals (
  owner_tenant_id uuid not null,
  outcome_transaction_id uuid not null,
  dependency_snapshot_id uuid not null,
  signal_id uuid not null,
  signal_content_hash text not null check (signal_content_hash ~ '^[0-9a-fA-F]{64}$'),
  requirement_id text not null check (char_length(requirement_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id),
  foreign key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id)
    references public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, signal_id)
    references public.build002_signals(owner_tenant_id, outcome_transaction_id, signal_id) on delete restrict
);

create table if not exists public.build002_signal_qualifications (
  id uuid primary key default gen_random_uuid(),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  outcome_transaction_id uuid not null,
  requirement_id text not null check (char_length(requirement_id) between 1 and 120),
  requirement_definition_hash text not null check (requirement_definition_hash ~ '^[0-9a-fA-F]{64}$'),
  dependency_snapshot_id uuid not null,
  dependency_snapshot_hash text not null check (dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  signal_ids jsonb not null check (jsonb_typeof(signal_ids) = 'array'),
  signal_content_hashes jsonb not null check (jsonb_typeof(signal_content_hashes) = 'array'),
  evaluator jsonb not null check (jsonb_typeof(evaluator) = 'object'),
  outcome text not null check (outcome in ('QUALIFIED', 'MISSING', 'UNKNOWN', 'INCOMPATIBLE_PROVENANCE', 'CONTRADICTORY', 'STALE_SOURCE', 'INVALID', 'REQUIRES_HUMAN_REVIEW')),
  reason_code text not null check (char_length(reason_code) between 1 and 160),
  evidence_valid_until timestamptz,
  qualified_at timestamptz not null,
  schema_version text not null check (schema_version = 'build002-signal-qualification-v0.3'),
  qualification_content_hash text not null check (qualification_content_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now(),
  unique (owner_tenant_id, outcome_transaction_id, id, qualification_content_hash),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, requirement_definition_hash)
    references public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_definition_hash) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, dependency_snapshot_hash)
    references public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, id, dependency_snapshot_hash) on delete restrict
);

create table if not exists public.build002_qualification_signals (
  owner_tenant_id uuid not null,
  outcome_transaction_id uuid not null,
  qualification_id uuid not null,
  qualification_content_hash text not null check (qualification_content_hash ~ '^[0-9a-fA-F]{64}$'),
  signal_id uuid not null,
  signal_content_hash text not null check (signal_content_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now(),
  primary key (owner_tenant_id, outcome_transaction_id, qualification_id, signal_id),
  foreign key (owner_tenant_id, outcome_transaction_id, qualification_id, qualification_content_hash)
    references public.build002_signal_qualifications(owner_tenant_id, outcome_transaction_id, id, qualification_content_hash) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, signal_id)
    references public.build002_signals(owner_tenant_id, outcome_transaction_id, signal_id) on delete restrict
);

create table if not exists public.build002_delegation_readiness (
  id uuid primary key default gen_random_uuid(),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  outcome_transaction_id uuid not null,
  requirement_set_hash text not null check (requirement_set_hash ~ '^[0-9a-fA-F]{64}$'),
  qualification_set_hash text not null check (qualification_set_hash ~ '^[0-9a-fA-F]{64}$'),
  dependency_snapshot_id uuid not null,
  dependency_snapshot_hash text not null check (dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  task_spec_hash text check (task_spec_hash is null or task_spec_hash ~ '^[0-9a-fA-F]{64}$'),
  source_asset_version_hash text check (source_asset_version_hash is null or source_asset_version_hash ~ '^[0-9a-fA-F]{64}$'),
  blueprint_hash text check (blueprint_hash is null or blueprint_hash ~ '^[0-9a-fA-F]{64}$'),
  policy_hash text check (policy_hash is null or policy_hash ~ '^[0-9a-fA-F]{64}$'),
  evaluator jsonb not null check (jsonb_typeof(evaluator) = 'object'),
  state text not null check (state in ('NEEDS_CONTEXT', 'INSUFFICIENT_SIGNAL', 'READY_WITH_CONDITIONS', 'READY', 'HUMAN_REVIEW_REQUIRED', 'BLOCKED_BY_POLICY')),
  blocking_codes jsonb not null check (jsonb_typeof(blocking_codes) = 'array'),
  condition_codes jsonb not null check (jsonb_typeof(condition_codes) = 'array'),
  created_at timestamptz not null,
  valid_until timestamptz,
  schema_version text not null check (schema_version = 'build002-signal-readiness-v0.3'),
  readiness_content_hash text not null check (readiness_content_hash ~ '^[0-9a-fA-F]{64}$'),
  unique (owner_tenant_id, outcome_transaction_id, id, readiness_content_hash),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, dependency_snapshot_hash)
    references public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, id, dependency_snapshot_hash) on delete restrict
);

create table if not exists public.build002_readiness_qualifications (
  owner_tenant_id uuid not null,
  outcome_transaction_id uuid not null,
  readiness_id uuid not null,
  readiness_content_hash text not null check (readiness_content_hash ~ '^[0-9a-fA-F]{64}$'),
  qualification_id uuid not null,
  qualification_content_hash text not null check (qualification_content_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now(),
  primary key (owner_tenant_id, outcome_transaction_id, readiness_id, qualification_id),
  foreign key (owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash)
    references public.build002_delegation_readiness(owner_tenant_id, outcome_transaction_id, id, readiness_content_hash) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, qualification_id, qualification_content_hash)
    references public.build002_signal_qualifications(owner_tenant_id, outcome_transaction_id, id, qualification_content_hash) on delete restrict
);

create index if not exists build002_requirements_transaction_idx on public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, created_at);
create index if not exists build002_dependencies_transaction_idx on public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, created_at);
create index if not exists build002_signals_transaction_idx on public.build002_signals(owner_tenant_id, outcome_transaction_id, captured_at);
create index if not exists build002_qualifications_transaction_idx on public.build002_signal_qualifications(owner_tenant_id, outcome_transaction_id, qualified_at);
create index if not exists build002_readiness_transaction_idx on public.build002_delegation_readiness(owner_tenant_id, outcome_transaction_id, created_at);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'build002_signal_requirements', 'build002_dependency_snapshots', 'build002_signals',
    'build002_dependency_requirements', 'build002_dependency_signals', 'build002_signal_qualifications',
    'build002_qualification_signals', 'build002_delegation_readiness', 'build002_readiness_qualifications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('revoke update, delete on table public.%I from service_role', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
    execute format('grant select, insert on table public.%I to service_role', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_select', table_name);
    execute format($policy$
      create policy %I on public.%I for select to authenticated using (
        exists (
          select 1 from public.tenant_memberships m
          join public.tenants t on t.id = m.tenant_id
          where m.tenant_id = %I.owner_tenant_id
            and m.principal_id = auth.uid()
            and m.status = 'ACTIVE'
            and t.status = 'ACTIVE'
        )
      )
    $policy$, table_name || '_tenant_select', table_name, table_name);
    execute format('drop trigger if exists %I on public.%I', table_name || '_immutable_update', table_name);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.build005_immutable_insert_only()', table_name || '_immutable_update', table_name);
  end loop;
end $$;

comment on table public.build002_signal_requirements is 'BUILD 002-B immutable compiled SignalRequirement snapshots.';
comment on table public.build002_dependency_snapshots is 'BUILD 002-B immutable canonical dependency universes.';
comment on table public.build002_signals is 'BUILD 002-B immutable tenant-rooted Signal observations.';
comment on table public.build002_signal_qualifications is 'BUILD 002-B immutable SignalQualification snapshots.';
comment on table public.build002_delegation_readiness is 'BUILD 002-B immutable DelegationReadiness assessments; append a new row for a later assessment.';
