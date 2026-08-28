do $build002_r4_f1_validate$
declare
  v_function_name text;
  v_function_oid oid;
  v_match_count integer;
begin
  foreach v_function_name in array array[
    'build002_delegability_admission_immutable',
    'build002_execution_authority_immutable',
    'build002_mutation_lease_immutable',
    'build002_readiness_authority_commit_immutable',
    'build002_readiness_authority_marker_graph_coherent'
  ]
  loop
    select count(*)::integer, min(p.oid)
      into v_match_count, v_function_oid
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n
        on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = v_function_name
       and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

    if v_match_count <> 1 then
      raise exception using
        errcode = 'P0001',
        message = 'BUILD002_R4_F1_TRIGGER_GUARD_IDENTITY_INVALID:' || v_function_name;
    end if;

    if not exists (
      select 1
        from pg_catalog.pg_proc p
       where p.oid = v_function_oid
         and p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
         and p.prosecdef
         and coalesce(p.proconfig, array[]::text[])
             @> array['search_path=pg_catalog, public']::text[]
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'BUILD002_R4_F1_TRIGGER_GUARD_STRUCTURE_INVALID:' || v_function_name;
    end if;

    if not exists (
      select 1
        from pg_catalog.pg_trigger t
       where t.tgfoid = v_function_oid
         and not t.tgisinternal
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'BUILD002_R4_F1_TRIGGER_GUARD_BINDING_MISSING:' || v_function_name;
    end if;
  end loop;
end
$build002_r4_f1_validate$;

revoke execute on function public.build002_delegability_admission_immutable()
from public, anon, authenticated, service_role;

revoke execute on function public.build002_execution_authority_immutable()
from public, anon, authenticated, service_role;

revoke execute on function public.build002_mutation_lease_immutable()
from public, anon, authenticated, service_role;

revoke execute on function public.build002_readiness_authority_commit_immutable()
from public, anon, authenticated, service_role;

revoke execute on function public.build002_readiness_authority_marker_graph_coherent()
from public, anon, authenticated, service_role;

do $build002_r4_f1_verify$
declare
  v_function_name text;
  v_function_oid oid;
  v_role_name text;
begin
  foreach v_function_name in array array[
    'build002_delegability_admission_immutable',
    'build002_execution_authority_immutable',
    'build002_mutation_lease_immutable',
    'build002_readiness_authority_commit_immutable',
    'build002_readiness_authority_marker_graph_coherent'
  ]
  loop
    select p.oid
      into strict v_function_oid
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n
        on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = v_function_name
       and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

    foreach v_role_name in array array['anon', 'authenticated', 'service_role']
    loop
      if pg_catalog.has_function_privilege(v_role_name, v_function_oid, 'EXECUTE') then
        raise exception using
          errcode = 'P0001',
          message = 'BUILD002_R4_F1_TRIGGER_GUARD_EXECUTE_STILL_GRANTED:'
                    || v_role_name || ':' || v_function_name;
      end if;
    end loop;
  end loop;
end
$build002_r4_f1_verify$;
