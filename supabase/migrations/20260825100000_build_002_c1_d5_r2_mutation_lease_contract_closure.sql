-- BUILD 002-C1-D5-R2: close the D5 mutation-authority contract.
--
-- R0 and R1 migrations remain immutable historical artifacts.  R1's public
-- boundary already performs the exact operation/value/intent checks and
-- consequence-time graph validation; it delegated the final insert to R0.
-- R0 incorrectly treated TaskSpec criticality as mutation permission.  This
-- forward migration replaces only that internal predicate in the installed
-- R0 function.  The resulting public path remains the R1 boundary, while the
-- internal issuer no longer interprets criticality as mutability.

do $migration$
declare
  v_definition text;
  v_rewritten text;
  v_critical_predicate text := $$coalesce((item->>'critical')::boolean, true) = false and $$;
begin
  select pg_get_functiondef(
    'public.build002_grant_mutation_lease_r0(uuid,uuid,uuid,text,text)'::regprocedure
  )
    into v_definition;

  if v_definition is null then
    raise exception 'BUILD002_D5_R2_R0_FUNCTION_NOT_FOUND';
  end if;

  v_rewritten := replace(v_definition, v_critical_predicate, '');
  if v_rewritten = v_definition then
    raise exception 'BUILD002_D5_R2_CRITICAL_PREDICATE_NOT_FOUND';
  end if;

  execute v_rewritten;
end;
$migration$;

-- The R1 public function remains the sole service_role issuance boundary.
-- Keep the internal historical names unavailable to ordinary roles.
revoke all on function public.build002_grant_mutation_lease_r0(uuid,uuid,uuid,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.build002_validate_mutation_lease_row(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)
  to service_role;

comment on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) is
  'BUILD002-C1-D5-R2: exact TaskSpec/patch authority; criticality is not mutation permission; issuance only.';
