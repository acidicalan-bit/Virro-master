# BUILD 001-F1 - Patch Contract

## VULNERABLE/BROKEN PATH

OWNER autenticado -> proof y acceptance validos -> RPC -> version -> head -> StateCommit -> `candidate_assets.committed=true` -> trigger de inmutabilidad -> excepcion -> rollback. La contradiccion esta dentro de una unica transaccion y afecta toda llamada legitima.

## LEGITIMATE SUCCESS PATH

OWNER autenticado -> proof y acceptance validos -> RPC -> nueva `asset_versions` inmutable que referencia el candidate -> CAS de `assets.current_version_id` -> `state_commits` -> `outcome_transactions.status=COMMITTED` -> retorno. El candidate no se modifica.

## IMMUTABILITY INVARIANT

Una fila canonica de `candidate_assets` conserva sin cambios contenido, storage metadata, provider/model, hashes, dimensiones, ROI, instruction, transaction, execution, source version, raw candidate, preservation run, type, owner y el booleano legacy `committed`. La version canonica creada tambien permanece inmutable.

## ATOMICITY INVARIANT

Version, head, StateCommit y transaction status se confirman en la misma llamada PostgreSQL o todos se revierten. No se introduce otra operacion remota ni otro modelo de head.

## AUTHORITY INVARIANT

El argumento sigue siendo solo un locator. `auth.uid()`, tenant ACTIVE, membership OWNER ACTIVE, outcome/transaction/asset owner, acceptance y exact-set evidence continúan validados dentro del mismo SECURITY DEFINER. PUBLIC y anon siguen sin EXECUTE.

## DATA COMPATIBILITY REQUIREMENTS

No eliminar ni reinterpretar fisicamente la columna `candidate_assets.committed`; el codigo legacy y sus read-backs pueden seguir usandola para filas historicas/legacy. Para el camino canonico BUILD 001, la verdad de commit es `state_commits` + `assets.current_version_id` + `outcome_transactions.status` y la nueva version contiene `candidateId`.

## HISTORICAL RECORD IMPACT

Ninguna fila se reescribe ni se backfillea. Owner NULL conserva el comportamiento historico existente. Commits canonicos previos completos no existen bajo el RPC vulnerable; la migracion correctiva no inventa ninguno.

## MINIMUM ENFORCEMENT BOUNDARY

Una migracion aditiva reemplaza solo el cuerpo de `public.commit_accepted_field_outcome(uuid)` para retirar la mutacion redundante de candidate. Triggers, RLS, grants, revokes, owner, SECURITY DEFINER y `search_path=''` permanecen confinados. No se concede ningun UPDATE adicional.
