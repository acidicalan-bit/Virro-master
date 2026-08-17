-- BUILD 001-F3: StateCommit is immutable historical canonical state.
-- Creation remains available to the canonical commit transaction; corrections
-- must append a new canonical event/version instead of rewriting this row.

create or replace function public.enforce_state_commit_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'TRUST_STATE_COMMIT_IMMUTABLE' using errcode = '42501';
end;
$$;

drop trigger if exists state_commits_immutable_guard on public.state_commits;
create trigger state_commits_immutable_guard
before update or delete on public.state_commits
for each row execute function public.enforce_state_commit_immutable();

-- A committed transaction is a historical parent of StateCommit.  Do not let
-- a project/transaction cascade erase canonical history.
alter table public.state_commits
  drop constraint if exists state_commits_transaction_id_restrict_fkey;
alter table public.state_commits
  drop constraint if exists state_commits_transaction_id_fkey;
alter table public.state_commits
  add constraint state_commits_transaction_id_restrict_fkey
  foreign key (transaction_id) references public.outcome_transactions(id) on delete restrict;

revoke all on function public.enforce_state_commit_immutable() from public, anon, authenticated;

comment on function public.enforce_state_commit_immutable() is
  'BUILD 001-F3: ordinary supported roles, including service_role, cannot update or delete canonical StateCommit history.';
