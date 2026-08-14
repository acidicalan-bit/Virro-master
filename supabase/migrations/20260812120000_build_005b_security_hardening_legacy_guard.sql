-- BUILD 005-B hardening guard.
-- This migration deliberately never invents Blueprint/Task Spec snapshots.
-- It is transactional and is a no-op after the snapshot-aware schema exists.
begin;

do $$
begin
  if to_regclass('public.field_outcomes') is not null
    and (
      not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'field_outcomes'
          and column_name = 'blueprint_snapshot'
      )
      or not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'field_outcomes'
          and column_name = 'task_spec_snapshot'
      )
    ) then
    raise exception using
      errcode = 'check_violation',
      message = 'BUILD_005_LEGACY_SCHEMA_REQUIRES_REVIEW',
      detail = 'Existing field_outcomes rows cannot be assigned fabricated Blueprint or Task Spec snapshots.';
  end if;
end $$;

comment on table public.field_outcomes is
  'BUILD 005 executions require durable Blueprint and Task Spec snapshots; legacy rows require explicit review.';

commit;
