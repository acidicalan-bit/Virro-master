
-- BUILD 003: Precision Edit tables (full migration with changedPixelRatio columns)

create table if not exists public.media_storage (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  mime_type text not null check (char_length(mime_type) between 1 and 100),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size integer not null check (byte_size >= 0),
  sha256 text not null check (length(sha256) = 64),
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.semantic_snapshots (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.outcome_transactions(id) on delete cascade,
  transaction_schema_version text not null,
  patch_schema_version text not null,
  executor_adapter_version text not null,
  provider text not null,
  image_model_identifier text not null,
  verification_methodology_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.image_evidence (
  id uuid primary key default gen_random_uuid(),
  evidence_receipt_id uuid not null unique references public.evidence_receipts(id) on delete cascade,
  source_hash text not null check (length(source_hash) = 64),
  candidate_hash text not null check (length(candidate_hash) = 64),
  source_width integer not null check (source_width > 0),
  source_height integer not null check (source_height > 0),
  candidate_width integer not null check (candidate_width > 0),
  candidate_height integer not null check (candidate_height > 0),
  normalized_total_diff numeric(10, 9) not null check (normalized_total_diff between 0 and 1),
  normalized_roi_diff numeric(10, 9) not null check (normalized_roi_diff between 0 and 1),
  normalized_outside_roi_diff numeric(10, 9) not null check (normalized_outside_roi_diff between 0 and 1),
  changed_pixel_ratio_total numeric(10, 9) not null default 0 check (changed_pixel_ratio_total between 0 and 1),
  changed_pixel_ratio_inside numeric(10, 9) not null default 0 check (changed_pixel_ratio_inside between 0 and 1),
  changed_pixel_ratio_outside numeric(10, 9) not null default 0 check (changed_pixel_ratio_outside between 0 and 1),
  methodology text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.candidate_assets (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.outcome_transactions(id) on delete cascade,
  execution_run_id uuid not null unique references public.execution_runs(id),
  storage_key text not null,
  mime_type text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size integer not null check (byte_size >= 0),
  sha256 text not null check (length(sha256) = 64),
  roi jsonb not null,
  instruction text not null,
  provider text not null,
  model text not null,
  cost_usd numeric(16, 10),
  committed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists media_storage_asset_id_idx on public.media_storage(asset_id);
create index if not exists semantic_snapshots_transaction_id_idx on public.semantic_snapshots(transaction_id);
create index if not exists image_evidence_evidence_receipt_id_idx on public.image_evidence(evidence_receipt_id);
create index if not exists candidate_assets_transaction_id_idx on public.candidate_assets(transaction_id);

alter table public.media_storage enable row level security;
alter table public.semantic_snapshots enable row level security;
alter table public.image_evidence enable row level security;
alter table public.candidate_assets enable row level security;

revoke all on table public.media_storage from anon, authenticated;
revoke all on table public.semantic_snapshots from anon, authenticated;
revoke all on table public.image_evidence from anon, authenticated;
revoke all on table public.candidate_assets from anon, authenticated;

grant select, insert, update, delete on table public.media_storage to service_role;
grant select, insert, update, delete on table public.semantic_snapshots to service_role;
grant select, insert, update, delete on table public.image_evidence to service_role;
grant select, insert, update, delete on table public.candidate_assets to service_role;

comment on table public.media_storage is 'Immutable media file metadata and storage references.';
comment on table public.semantic_snapshots is 'Schema/provider/model versions used for reproducibility.';
comment on table public.image_evidence is 'Deterministic image diff metrics with pixel-level ratios.';
comment on table public.candidate_assets is 'Non-canonical candidate images awaiting human verification.';
