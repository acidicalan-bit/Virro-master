do $bridge$
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

  if pg_catalog.to_regprocedure('public.build002_pgcrypto_sha256(bytea)') is not null then
    raise exception 'BUILD002_R3_F1_PGCRYPTO_ADAPTER_ALREADY_EXISTS';
  end if;

  execute pg_catalog.format($ddl$
    create function public.build002_pgcrypto_sha256(p_value bytea)
    returns text
    language sql
    immutable
    strict
    parallel safe
    security invoker
    set search_path = pg_catalog
    as $function$
      select pg_catalog.encode(%I.digest(p_value, 'sha256'::text), 'hex'::text)
    $function$
  $ddl$, v_pgcrypto_schema);

  if v_pgcrypto_schema <> 'public' then
    if pg_catalog.to_regprocedure('public.digest(bytea,text)') is not null
       or pg_catalog.to_regprocedure('public.digest(text,text)') is not null
       or pg_catalog.to_regprocedure('public.gen_random_bytes(integer)') is not null
       or pg_catalog.to_regprocedure('public.hmac(bytea,bytea,text)') is not null then
      raise exception 'BUILD002_R3_F1_PUBLIC_PGCRYPTO_SIGNATURE_OCCUPIED';
    end if;

    execute pg_catalog.format($ddl$
      create function public.digest(p_data bytea, p_type text)
      returns bytea
      language sql
      immutable
      strict
      parallel safe
      security invoker
      set search_path = pg_catalog
      as $function$
        select %I.digest(p_data, p_type)
      $function$
    $ddl$, v_pgcrypto_schema);

    execute pg_catalog.format($ddl$
      create function public.digest(p_data text, p_type text)
      returns bytea
      language sql
      immutable
      strict
      parallel safe
      security invoker
      set search_path = pg_catalog
      as $function$
        select %I.digest(p_data, p_type)
      $function$
    $ddl$, v_pgcrypto_schema);

    execute pg_catalog.format($ddl$
      create function public.gen_random_bytes(p_count integer)
      returns bytea
      language sql
      volatile
      strict
      parallel safe
      security invoker
      set search_path = pg_catalog
      as $function$
        select %I.gen_random_bytes(p_count)
      $function$
    $ddl$, v_pgcrypto_schema);

    execute pg_catalog.format($ddl$
      create function public.hmac(p_data bytea, p_key bytea, p_type text)
      returns bytea
      language sql
      immutable
      strict
      parallel safe
      security invoker
      set search_path = pg_catalog
      as $function$
        select %I.hmac(p_data, p_key, p_type)
      $function$
    $ddl$, v_pgcrypto_schema);

    comment on function public.digest(bytea,text) is 'BUILD002_R3_F1_TEMP_PGCRYPTO_BRIDGE';
    comment on function public.digest(text,text) is 'BUILD002_R3_F1_TEMP_PGCRYPTO_BRIDGE';
    comment on function public.gen_random_bytes(integer) is 'BUILD002_R3_F1_TEMP_PGCRYPTO_BRIDGE';
    comment on function public.hmac(bytea,bytea,text) is 'BUILD002_R3_F1_TEMP_PGCRYPTO_BRIDGE';

    revoke all on function public.digest(bytea,text) from public, anon, authenticated, service_role;
    revoke all on function public.digest(text,text) from public, anon, authenticated, service_role;
    revoke all on function public.gen_random_bytes(integer) from public, anon, authenticated, service_role;
    revoke all on function public.hmac(bytea,bytea,text) from public, anon, authenticated, service_role;
  end if;
end
$bridge$;

revoke all on function public.build002_pgcrypto_sha256(bytea) from public, anon, authenticated, service_role;
