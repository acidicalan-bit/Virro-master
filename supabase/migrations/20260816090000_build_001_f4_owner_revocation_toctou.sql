-- BUILD 001-F4: serialize current OWNER authority with the canonical commit.
-- The F1 function remains the implementation; this definer wrapper establishes
-- the authorization linearization point before delegating to it.

alter function public.commit_accepted_field_outcome(uuid)
  rename to commit_accepted_field_outcome_unlocked;

create or replace function public.commit_accepted_field_outcome(p_field_outcome_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  owner_tenant uuid;
  accepting_principal uuid;
  locked_tenant uuid;
  locked_membership uuid;
  locked_principal uuid;
  actor_locked boolean := false;
  accepting_locked boolean := false;
  expected_memberships integer := 0;
  locked_memberships integer := 0;
begin
  if actor is null then
    raise exception 'TRUST_AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select outcome.owner_tenant_id, feedback.recorded_by_principal_id
    into owner_tenant, accepting_principal
  from public.field_outcomes outcome
  left join public.field_feedback feedback on feedback.field_outcome_id = outcome.id
  where outcome.id = p_field_outcome_id;
  if not found or owner_tenant is null then
    raise exception 'TRUST_RESOURCE_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  -- Lock the authoritative tenant first, then all relevant membership rows in
  -- stable id order. The successful lock acquisition is the linearization
  -- point: a prior revocation is observed as absent, while a later revocation
  -- waits until this transaction finishes.
  select tenant.id into locked_tenant
  from public.tenants tenant
  where tenant.id = owner_tenant
    and tenant.status = 'ACTIVE'
  for update;
  if not found then
    raise exception 'TRUST_COMMIT_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  expected_memberships := 1;
  if accepting_principal is not null and accepting_principal is distinct from actor then
    expected_memberships := 2;
  end if;

  for locked_membership, locked_principal in
    select membership.id, membership.principal_id
    from public.tenant_memberships membership
    where membership.tenant_id = owner_tenant
      and membership.principal_id in (actor, accepting_principal)
      and membership.role = 'OWNER'
      and membership.status = 'ACTIVE'
    order by membership.id
    for update
  loop
    locked_memberships := locked_memberships + 1;
    if locked_principal = actor then
      actor_locked := true;
    end if;
    if accepting_principal is not null and locked_principal = accepting_principal then
      accepting_locked := true;
    end if;
  end loop;

  if not actor_locked then
    raise exception 'TRUST_COMMIT_NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if accepting_principal is not null and not accepting_locked then
    raise exception 'TRUST_HUMAN_ACCEPTANCE_AUTHORITY_REVOKED' using errcode = '42501';
  end if;
  if locked_memberships <> expected_memberships then
    raise exception 'TRUST_COMMIT_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  return public.commit_accepted_field_outcome_unlocked(p_field_outcome_id);
end;
$$;

revoke all on function public.commit_accepted_field_outcome_unlocked(uuid) from public, anon, authenticated;
revoke all on function public.commit_accepted_field_outcome(uuid) from public, anon;
grant execute on function public.commit_accepted_field_outcome(uuid) to authenticated;

comment on function public.commit_accepted_field_outcome(uuid) is
  'BUILD 001-F4: current tenant and OWNER membership rows are locked before the F1 canonical commit, defining authorization linearization against revocation.';
