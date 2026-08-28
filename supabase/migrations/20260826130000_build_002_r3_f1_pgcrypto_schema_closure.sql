do $require_adapter$
begin
  if pg_catalog.to_regprocedure('public.build002_pgcrypto_sha256(bytea)') is null then
    raise exception 'BUILD002_R3_F1_PGCRYPTO_ADAPTER_MISSING';
  end if;
end
$require_adapter$;

create or replace function public.build002_canonical_sha256(p_value jsonb)
returns text
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select public.build002_pgcrypto_sha256(
    pg_catalog.convert_to(public.build002_canonical_json(p_value), 'UTF8')
  )
$$;

revoke all on function public.build002_canonical_sha256(jsonb) from public, anon, authenticated, service_role;

do $replace_hmac_callers$
declare
  v_pgcrypto_schema name;
begin
  select n.nspname
    into v_pgcrypto_schema
    from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pgcrypto';

  if v_pgcrypto_schema is null then
    raise exception 'BUILD002_R3_F1_PGCRYPTO_NOT_INSTALLED';
  end if;

  if pg_catalog.to_regprocedure('public.build002_002e_active_operation_valid()') is null
     and pg_catalog.to_regprocedure('public.build002_002e_enter(text,text,jsonb)') is null then
    null;
  elsif pg_catalog.to_regprocedure('public.build002_002e_active_operation_valid()') is null
        or pg_catalog.to_regprocedure('public.build002_002e_enter(text,text,jsonb)') is null then
    raise exception 'BUILD002_R3_F1_INCONSISTENT_002E_HMAC_CALLERS';
  else
    execute 'drop function public.build002_002e_active_operation_valid()';
    execute 'drop function public.build002_002e_enter(text,text,jsonb)';

    execute pg_catalog.format($ddl$
    create function public.build002_002e_active_operation_valid()
    returns boolean
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      v_marker text := nullif(current_setting('build002.udre_active_operation',true),'');
      v_operation text;
      v_supplied text;
      v_secret bytea;
      v_expected text;
    begin
      if v_marker is null or position('|' in v_marker)=0 then return false; end if;
      v_operation:=split_part(v_marker,'|',1);
      v_supplied:=split_part(v_marker,'|',2);
      select secret into strict v_secret from public.build002_002e_runtime_secret where singleton;
      v_expected:=encode(%I.hmac(convert_to(v_operation||'|'||pg_catalog.txid_current()::text||'|'||pg_catalog.pg_backend_pid()::text,'UTF8'),v_secret,'sha256'),'hex');
      return v_supplied=v_expected;
    exception when others then
      return false;
    end;
    $function$
    $ddl$, v_pgcrypto_schema);

    execute pg_catalog.format($ddl$
    create function public.build002_002e_enter(p_operation text, p_classification text, p_context jsonb)
    returns boolean
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      v_context jsonb;
      v_secret bytea;
      v_token text;
    begin
      if public.build002_002e_active_operation_valid() then
        return false;
      end if;
      v_context := public.build002_002e_authorize_route(p_operation,p_context);
      perform public.build002_002e_route(p_operation,p_classification,v_context);
      select secret into strict v_secret from public.build002_002e_runtime_secret where singleton;
      v_token:=encode(%I.hmac(convert_to(p_operation||'|'||pg_catalog.txid_current()::text||'|'||pg_catalog.pg_backend_pid()::text,'UTF8'),v_secret,'sha256'),'hex');
      perform set_config('build002.udre_active_operation',p_operation||'|'||v_token,true);
      return true;
    end;
    $function$
    $ddl$, v_pgcrypto_schema);

    revoke all on function public.build002_002e_active_operation_valid() from public, anon, authenticated, service_role;
    revoke all on function public.build002_002e_enter(text,text,jsonb) from public, anon, authenticated, service_role;
  end if;
end
$replace_hmac_callers$;

do $drop_temp_bridges$
declare
  v_identity text;
  v_oid oid;
  v_extension_owned boolean;
  v_marker text;
begin
  foreach v_identity in array array[
    'public.digest(bytea,text)',
    'public.digest(text,text)',
    'public.gen_random_bytes(integer)',
    'public.hmac(bytea,bytea,text)'
  ] loop
    v_oid := pg_catalog.to_regprocedure(v_identity);
    if v_oid is null then
      continue;
    end if;

    select exists (
      select 1
        from pg_catalog.pg_depend d
        join pg_catalog.pg_extension e on e.oid = d.refobjid
       where d.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
         and d.objid = v_oid
         and d.deptype = 'e'
         and e.extname = 'pgcrypto'
    ) into v_extension_owned;

    if v_extension_owned then
      continue;
    end if;

    v_marker := pg_catalog.obj_description(v_oid, 'pg_proc');
    if v_marker is distinct from 'BUILD002_R3_F1_TEMP_PGCRYPTO_BRIDGE' then
      raise exception 'BUILD002_R3_F1_UNSAFE_COMPATIBILITY_DROP: %', v_identity;
    end if;

    execute pg_catalog.format('drop function %s', v_identity);
  end loop;
end
$drop_temp_bridges$;
