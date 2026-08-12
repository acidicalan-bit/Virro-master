-- BUILD 005-B: one RAW artifact per execution, multiple PRESERVED ladder artifacts.
drop index if exists public.candidate_assets_execution_type_uidx;

create unique index if not exists candidate_assets_execution_raw_uidx
  on public.candidate_assets(execution_run_id)
  where candidate_type = 'RAW_PROVIDER';

comment on index public.candidate_assets_execution_raw_uidx is
  'Exactly one RAW_PROVIDER artifact per execution; preserved ladder artifacts are strategy-scoped.';
