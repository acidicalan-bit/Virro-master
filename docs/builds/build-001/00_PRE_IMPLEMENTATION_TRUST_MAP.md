# BUILD 001 - Pre-Implementation Trust Map

## Control del baseline

| Campo | Valor |
| --- | --- |
| Rama | `foundation/virro-vnext` |
| Commit aceptado | `094660fb75089294e34e33a52253c2ccfff940c9` |
| Padre canonico | `96e42e9f1d8f97b625a69fd85c9b835ea7ce4db7` |
| `origin/main` observado | `96e42e9f1d8f97b625a69fd85c9b835ea7ce4db7` |
| Divergencia | El baseline tiene un commit documental adicional; `origin/main` no ha avanzado. No se incorporo ningun cambio remoto. |
| Fecha de inspeccion | `2026-08-15` |
| Estado del gate | `MAP COMPLETE`; implementacion de aplicacion y migraciones no iniciada |

Este documento describe el comportamiento del commit aceptado. No afirma que las migraciones esten desplegadas en una instancia concreta de Supabase. La verificacion real de Auth/RLS/Storage del entorno actual permanece `UNKNOWN` mientras no se ejecute una prueba integrada contra ese entorno.

## Clasificacion

| Clase | Significado |
| --- | --- |
| `PROVEN` | El baseline contiene enforcement coherente en codigo y base de datos, con prueba negativa aplicable. |
| `PARTIAL` | Existe control, pero no cubre todas las capas, objetos o rutas que participan en la transicion. |
| `MISSING` | Falta un control necesario para sostener la transicion como limite de confianza. |
| `UNKNOWN` | El repositorio no permite determinar el estado real del componente o despliegue externo. |

`PROVEN` se limita a lo demostrable por el repositorio. Las pruebas estaticas o in-memory no prueban por si solas el estado de una base desplegada.

## Conclusion principal

No existe hoy un camino unico, continuo y probado de tenant a head canonico.

1. `/api/core-lineage` implementa el tramo autenticado `Tenant -> Project -> Asset -> AssetVersion -> OutcomeTransaction` con cliente user-scoped, `AuthorityContext`, RLS y triggers. Termina antes de Authority-to-Execution.
2. `/api/field-beta` exige Auth y membresia, ejecuta, conserva evidencia y registra aceptacion humana. Despues de resolver autoridad reduce el contexto a `tenantId` y `principalId`, usa service role para repositorios y Storage, y no ofrece un commit canonico.
3. `/api/precision-edit` y `/api/transaction-lab` contienen caminos de ejecucion/commit legacy con service role o memoria. No resuelven principal, tenant, membresia ni rol. Estan cerrados por defecto y siempre cerrados en produccion mediante `INTERNAL_LEGACY_ROUTES_ENABLED`, pero habilitar el flag en no-produccion no agrega autorizacion.

Por tanto, no es correcto conectar los servicios actuales y declarar BUILD 001 completo. El trabajo debe unir el limite de autoridad del primer camino, la evidencia exacta y aceptacion del segundo, y un nuevo commit atomico tenant-safe; no debe reactivar el tercero como camino canonico.

## Mapa de superficies actuales

| Superficie | Tenant y autoridad | Ejecucion/evidencia | Aceptacion | StateCommit/head | Estado |
| --- | --- | --- | --- | --- | --- |
| `/api/core-lineage` | Auth claim + membresia activa + tenant activo; `AuthorityContext`; user-scoped | No existe | No existe | Solo crea head inicial en tres escrituras | `PARTIAL` |
| `/api/field-beta` | Auth y membresia probadas en el borde; luego escalares server-derived | Si, mediante service role y provider/preservation adapters | `field_feedback`, actor y tenant derivados en servidor | Solo proyecta `ELIGIBLE`; no hay endpoint de commit | `PARTIAL` |
| `/api/precision-edit` | Ninguna; guard operativo legacy | Si, service role | Preferencia/aprobacion por identificador de transaccion | Si, secuencial y no atomico | `MISSING` como limite de confianza |
| `/api/transaction-lab` | Ninguna; guard operativo legacy | Fake executor + service role/memoria | No requerida por el commit generico | Si, secuencial y no atomico | `MISSING` como limite de confianza |

## Flujo real

```text
Supabase JWT/cookie
  -> verified claims.sub
  -> ACTIVE membership + ACTIVE tenant
  -> frozen AuthorityContext
       |
       +-> user-scoped core lineage + RLS
       |     -> Project -> Asset -> AssetVersion -> OutcomeTransaction
       |     -> STOP: no authenticated execution path
       |
       +-> Field Beta feature gate
             -> tenantId/principalId scalars
             -> service-role repositories + private Storage
             -> TaskSpec -> ExecutionRun -> Evidence -> Verification
             -> field_feedback -> derived commit eligibility
             -> STOP: no StateCommit endpoint

Legacy non-production flag
  -> unauthenticated service-role execution
  -> acceptance or generic verification
  -> create AssetVersion
  -> update Asset.current_version_id
  -> create StateCommit
  -> update OutcomeTransaction.status
```

## Transiciones de confianza

### T1. Tenant -> Project/resource

**Clasificacion: `PROVEN` para `/api/core-lineage`; `PARTIAL` para el sistema completo.**

- **Fuente de identidad tenant:** `claims.sub` verificado por Supabase Auth identifica al principal. El tenant elegido llega como locator por query/header, pero solo una membresia `ACTIVE` del principal sobre un tenant `ACTIVE` produce `AuthorityContext.tenantId`.
- **Fuente de identidad del recurso:** UUID generado por Postgres para creates; `projectId`, `assetId`, `baseVersionId` e `id` de lectura son locators controlados por cliente y validados con Zod.
- **Inputs controlados por cliente:** `tenantId`, IDs de recursos, nombre, descripcion, `initialState` y `rawRequest`.
- **Inputs derivados por servidor:** `principalId`, `membershipId`, rol, `owner_tenant_id`, estado inicial `DRAFT`, version inicial y timestamps.
- **Foreign keys:** membership -> tenant/Auth user; asset -> project; asset version -> asset/parent version; asset current head -> asset version; transaction -> project/asset/base version; cada `owner_tenant_id` -> tenant.
- **Constraints de base de datos:** owner requerido en inserts nuevos, owner inmutable una vez probado, trigger de igualdad de owner con padres y `unique(asset_id, version_number)`. Las FKs no prueban que `assets.current_version_id` pertenezca al mismo asset; esa relacion solo se valida en el repositorio tenant-scoped.
- **RLS:** lectura/insercion requieren `auth.uid()`, membership `ACTIVE`, tenant `ACTIVE` y owner coincidente. Solo `assets` tiene update autenticado. Filas historicas con owner NULL no son visibles por este camino.
- **Operaciones privilegiadas:** ninguna en `/api/core-lineage`; Field Beta y repositorios legacy crean los mismos recursos con service role.
- **Checks de autorizacion:** `resolveRequestAuthority`, busqueda user-scoped, owner filters y validacion de lineage en aplicacion; triggers agregan defensa de base.
- **Posibles referencias cross-tenant:** bloqueadas en el core autenticado por aplicacion, RLS y trigger. Siguen posibles desde service role si un adapter omite owner o usa filas historicas; el trigger limita inserts de core con owner, pero no convierte service role en autoridad de usuario.
- **Fallo actual:** denegacion 401/403/404 en el borde; errores genericos de persistencia. `createAsset` ejecuta asset, version y movimiento de head por separado, por lo que puede dejar escritura parcial.

### T2. Project/resource -> Authority

**Clasificacion: `PARTIAL`.**

- **Fuente de identidad tenant:** el `AuthorityContext` ya fue derivado antes de resolver recursos; el orden logico del diagrama no implica que un recurso otorgue autoridad.
- **Fuente de identidad del recurso:** IDs de request, siempre tratados como locators.
- **Inputs controlados por cliente:** tenant locator y resource locators; ninguno debe conferir owner, principal o rol.
- **Inputs derivados por servidor:** contexto congelado con principal, tenant, membership, rol, session/AAL disponibles y timestamp de autorizacion.
- **Foreign keys:** la ownership durable vive en `owner_tenant_id`; no existe FK desde recursos a membership o principal porque la autorizacion es contextual.
- **Constraints de base de datos:** owner/parent triggers protegen la lineage tenant, no permisos por accion ni rol.
- **RLS:** prueba membresia y lifecycle en cada acceso user-scoped del core.
- **Operaciones privilegiadas:** Field Beta transforma el contexto completo en dos strings y crea un servicio cacheado por `tenantId:principalId`; desde ahi service role evita RLS.
- **Checks de autorizacion:** el core pasa `AuthorityContext` al port. Field Beta exige autoridad en route/page, pero no pasa membership, rol, session, assurance ni timestamp al servicio.
- **Posibles referencias cross-tenant:** un caller no puede sustituir el tenant en core. En adapters privilegiados, la seguridad depende de filtros `.eq(tenant_id, this.tenantId)` y no de RLS; un nuevo metodo sin filtro ampliaria el blast radius.
- **Fallo actual:** `OWNER` y `MEMBER` son equivalentes para ejecutar, aceptar, promover golden y otras acciones de Field Beta; `requireRole` existe pero no se usa en estas rutas.

### T3. Authority -> Execution

**Clasificacion: `PARTIAL`.**

- **Fuente de identidad tenant:** `/api/field-beta` obtiene `tenantId` de `AuthorityContext`; los caminos legacy no tienen tenant autorizado.
- **Fuente de identidad del recurso:** Field Beta crea project/asset/version/transaction server-side; en legacy, el cliente puede presentar `transactionId` y otros IDs.
- **Inputs controlados por cliente:** imagen PNG, instruccion, ROI, topology, task type, estrategia/override y, en legacy, IDs de transaccion/candidatos y leases.
- **Inputs derivados por servidor:** owner del core, Blueprint publicado, TaskSpec hash-addressed, capability profile, storage keys, provider/model adapter y execution metadata.
- **Foreign keys:** `execution_runs.transaction_id` -> transaction; patches/leases -> transaction. No hay `owner_tenant_id` en `execution_runs`, patches, leases, receipts, verification runs, candidates, commits o cost records.
- **Constraints de base de datos:** status enums y FKs basicas. No hay constraint que una execution run al owner del transaction ni que congele un fingerprint completo de tenant, contract, base head, capabilities, provider y artifacts.
- **RLS:** tablas downstream permanecen revocadas para anon/authenticated y disponibles a service role; no existe policy user-scoped de ejecucion.
- **Operaciones privilegiadas:** composicion Field Beta y Precision Edit usa service role para repositorios y Storage; provider calls ocurren server-side.
- **Checks de autorizacion:** TaskSpec valida hash, READY, transaction/source binding y capability allow/deny. No se reautoriza membership/tenant inmediatamente antes de llamar al provider y no existe permiso de rol/capability de negocio para `EXECUTE`.
- **Posibles referencias cross-tenant:** adapters downstream buscan por ID sin owner; una referencia cruzada introducida por codigo privilegiado o datos inconsistentes no es bloqueada por RLS. Las rutas legacy habilitadas aceptan IDs sin Auth.
- **Fallo actual:** el core tenant-safe no puede ejecutar; Field Beta ejecuta con autoridad parcial y blast radius de service role; el legacy puede ejecutar sin autoridad cuando el flag no-productivo esta activo.

### T4. Execution -> Evidence

**Clasificacion: `PARTIAL`.**

- **Fuente de identidad tenant:** Field Beta inyecta su tenant en criterion evidence y tablas Field; el receipt generico y execution run no lo almacenan.
- **Fuente de identidad del recurso:** transaction/execution/source/candidate IDs producidos durante la ejecucion; hashes se calculan server-side sobre bytes.
- **Inputs controlados por cliente:** source bytes, instruccion y ROI influyen en artifacts; output del provider/executor se considera no confiable.
- **Inputs derivados por servidor:** hashes, dimensiones decodificadas, storage keys, timestamps, costo observado, evidence refs, verifier identity y bindings de TaskSpec.
- **Foreign keys:** receipt -> transaction/execution/base version; criterion evidence -> transaction/verification/execution; candidate -> transaction/execution/source version; image evidence -> receipt.
- **Constraints de base de datos:** receipt tiene execution unique; criterion evidence es unique por `(tenant_id, verification_run_id, criterion_id)`. No hay constraint que pruebe que las FKs de una fila pertenecen a la misma transaction, tenant, asset o TaskSpec. `tenant_id` historico text y `owner_tenant_id` UUID pueden divergir.
- **RLS:** evidencia y artifacts legacy son service-role-only. Criterion evidence tiene policy tenant select declarada, pero authenticated no recupera grants de tabla en las migraciones inspeccionadas; Field Beta la lee/escribe con service role.
- **Operaciones privilegiadas:** todas las escrituras de evidencia/storage activas usan service role.
- **Checks de autorizacion:** validacion de bytes/hash/geometria, binding TaskSpec y read-back exact-set en Field Beta. El receipt generico confia en la forma validada del resultado del executor.
- **Posibles referencias cross-tenant:** IDs downstream no llevan envelope tenant; tablas Field pueden apuntar por FK a transaction/execution/candidate de otro tenant si una operacion privilegiada se equivoca o es comprometida. Storage usa prefijos `sources/{projectId}` y `candidates/{transactionId}`, no un prefijo tenant obligatorio.
- **Fallo actual:** fallos entre upload y persistencia dejan objetos o filas parciales; no existe transaccion que abarque provider, Storage y Postgres. La recuperacion es especifica y no reemplaza aislamiento tenant verificable.

### T5. Evidence -> Verification

**Clasificacion: `PARTIAL`.**

- **Fuente de identidad tenant:** solo el camino Field Beta incluye tenant en el conjunto de criterion evidence; `verification_runs` no tiene owner.
- **Fuente de identidad del recurso:** transaction, execution, verification, TaskSpec ID/hash y artifact IDs del servidor.
- **Inputs controlados por cliente:** no puede enviar directamente el status por las rutas activas; si controla datos base puede influir en checks. Las rutas legacy permiten iniciar verificacion por `transactionId`.
- **Inputs derivados por servidor:** checks de hashes/metrica, Same-Spec exact-set y status PASSED/FAILED/INCOMPLETE.
- **Foreign keys:** verification -> transaction/execution; criterion evidence -> verification/execution/transaction. TaskSpec ID/hash y artifact bindings son columnas/JSON, no FKs a una version durable de Work Contract.
- **Constraints de base de datos:** no existe constraint cross-table de igualdad transaction/execution/verification/tenant/TaskSpec. Aggregate verification puede coexistir con evidence incompleta.
- **RLS:** verification generica es service-role-only; criterion evidence se consume con service role en el flujo activo.
- **Operaciones privilegiadas:** el verifier y la persistencia corren bajo proceso servidor/service role.
- **Checks de autorizacion:** Field Beta deriva Machine Same-Spec desde el set exacto de receipts y falla `INCOMPLETE` ante faltantes/conflictos. El kernel generico solo exige evidencia presente, executions exitosas, base version y leases; no liga verification a Work Contract/TaskSpec ni a tenant.
- **Posibles referencias cross-tenant:** una verification run o criterion receipt mal enlazada puede cruzar tenants a nivel DB; el read model Field Beta compara tenant e IDs, pero el esquema no impide crear la fila incoherente con privilegios.
- **Fallo actual:** status agregado o hashes no bastan para autoridad; el camino generico aun podria declarar `VERIFIED` sin exact-set Same-Contract. El estado desplegado de policies y receipts reales es `UNKNOWN` sin entorno integrado.

### T6. Verification -> Human Acceptance

**Clasificacion: `PARTIAL`.**

- **Fuente de identidad tenant:** route Field Beta deriva tenant y principal de `AuthorityContext`; el servicio recupera el outcome filtrado por tenant.
- **Fuente de identidad del recurso:** `fieldOutcomeId` es locator del cliente; transaction/candidate/spec se derivan del outcome tenant-filtered.
- **Inputs controlados por cliente:** `humanAccepted`, failure tags, correction y el locator de outcome. La preferencia legacy acepta transaction/candidate IDs.
- **Inputs derivados por servidor:** `tenantId`, `owner_tenant_id`, `recorded_by_principal_id`, `acceptance_source=HUMAN_EVALUATOR` y `recordedBy`.
- **Foreign keys:** feedback -> field outcome; recorded principal -> Auth user; owner -> tenant. No hay FK/constraint que exija que feedback.owner, feedback.tenant_id y outcome.owner/tenant_id sean iguales.
- **Constraints de base de datos:** un feedback por outcome; acceptance source limitada. Inmutabilidad efectiva depende de insert-only grants/service code, no de trigger que prohiba update/delete a service role.
- **RLS:** Field tables son escritas por service role; repositorio aplica tenant filter y valida que el outcome pertenezca al tenant antes de insertar.
- **Operaciones privilegiadas:** persistencia de acceptance usa service role.
- **Checks de autorizacion:** Auth + membership activa; evidence foranea o recorder no servidor proyecta acceptance `PENDING`. No hay check de rol, AAL reciente, session freshness ni capability `ACCEPT`.
- **Posibles referencias cross-tenant:** el API normal bloquea un `fieldOutcomeId` foraneo mediante filtro tenant. La base permite incoherencia tenant entre feedback y outcome bajo service role. El camino Precision Edit legacy registra preferencia/aprobacion sin Auth.
- **Fallo actual:** cualquier `MEMBER` activo puede aceptar y promover; la aceptacion Field Beta solo cambia una proyeccion de eligibility, no la transaccion ni canon.

### T7. Human Acceptance -> StateCommit

**Clasificacion: `MISSING`.**

- **Fuente de identidad tenant:** no existe en `state_commits`; Field Beta no tiene endpoint de commit. El commit legacy no recibe `AuthorityContext`.
- **Fuente de identidad del recurso:** `transactionId` controlado por cliente en legacy; transaction, asset, base version y candidate se cargan por ID con service role.
- **Inputs controlados por cliente:** decision `approvePreserved`/`reject`, transaction locator y preferencia/candidate IDs previos.
- **Inputs derivados por servidor:** stale-head comparison, candidate provenance, new version number/state, commit IDs y timestamps.
- **Foreign keys:** StateCommit -> transaction/asset/new version/previous version; unique transaction. No hay owner tenant, actor, acceptance ID, verification ID, TaskSpec ID/hash o fingerprint en StateCommit.
- **Constraints de base de datos:** las FKs prueban existencia, no coherencia del tuple ni eligibility. No hay RPC/transaction que bloquee head y valide todo el proof set.
- **RLS:** `state_commits` es service-role-only; no existe policy de commit tenant-safe.
- **Operaciones privilegiadas:** todo el commit actual usa service role.
- **Checks de autorizacion:** `approvePreserved` exige preference, machine verification PASSED, preservation provenance, head no stale y ausencia de commit. El commit generico exige VERIFIED/evidence pero no aceptacion humana. Ninguno exige tenant, membership/role o exact-set Work Contract al momento de commit.
- **Posibles referencias cross-tenant:** lookup por transaction ID y repositorios sin owner permiten que un caller legacy habilitado alcance una transaccion ajena; las FKs no bloquean mezclar asset/version/transaction de owners distintos bajo service role.
- **Fallo actual:** el camino activo se detiene en `ELIGIBLE`; los caminos que crean StateCommit no son autorizables para multi-tenant. No Proof, No Commit no esta cerrado de extremo a extremo.

### T8. StateCommit -> Current/head state

**Clasificacion: `MISSING`.**

- **Fuente de identidad tenant:** solo puede inferirse transitivamente desde asset/transaction; StateCommit no la conserva.
- **Fuente de identidad del recurso:** asset y base head cargados antes de escribir; new version y commit IDs se generan por escritura.
- **Inputs controlados por cliente:** transaction locator que selecciona la operacion legacy; el nuevo head no debe ser controlado directamente.
- **Inputs derivados por servidor:** contenido de version, parent, version number, `current_version_id`, commit receipt y status COMMITTED.
- **Foreign keys:** asset.current -> version; version.parent -> version; StateCommit -> transaction/asset/versions.
- **Constraints de base de datos:** no hay compare-and-swap, row lock, constraint de same-asset para current/parent/commit ni funcion atomica. `unique(asset_id, version_number)` detecta algunas carreras despues de ocurridas.
- **RLS:** asset update user-scoped existe, pero los servicios de commit usan service role y no una policy/RPC de commit.
- **Operaciones privilegiadas:** create version, update head, create StateCommit, mark candidate y update transaction son llamadas separadas.
- **Checks de autorizacion:** stale-head se compara antes de la primera escritura; no se vuelve a comprobar bajo lock al mover el head.
- **Posibles referencias cross-tenant:** service role puede escribir tuples incoherentes; trigger core solo comprueba owner del asset version contra asset, no que `assets.current_version_id` apunte a una version de ese mismo asset ni que StateCommit tenga una lineage coherente.
- **Fallo actual:** carrera TOCTOU y fallos intermedios pueden producir version huerfana, head movido sin StateCommit, StateCommit sin status COMMITTED, candidate marcado parcialmente o dos intentos competidores. El read-back no puede probar atomicidad que no existe.

## Inventario de enforcement por objeto

| Objeto | Tenant durable | RLS/grants efectivos por diseño | Consistencia relevante | Clasificacion |
| --- | --- | --- | --- | --- |
| `tenants` | `id` | authenticated select de tenant activo visible por membership; service role CRUD | Auth owner y lifecycle | `PROVEN` en baseline, despliegue `UNKNOWN` |
| `tenant_memberships` | `tenant_id`, `principal_id` | self-select; service role CRUD/RPC | unique tenant+principal, status/role checks | `PROVEN` en baseline, despliegue `UNKNOWN` |
| `projects` | `owner_tenant_id` | authenticated select/insert + RLS; service role | owner requerido/inmutable | `PROVEN` para core nuevo |
| `assets` | `owner_tenant_id` | authenticated select/insert/update + RLS; service role | parent owner; current version same-asset no DB | `PARTIAL` |
| `asset_versions` | `owner_tenant_id` | authenticated select/insert + RLS; service role | parent asset owner; parent version same-asset no DB | `PARTIAL` |
| `outcome_transactions` | `owner_tenant_id` | authenticated select/insert + RLS; service role | owners de referencias, pero no relaciones project-asset-version completas en DB | `PARTIAL` |
| patches/leases | Ninguno | service-role-only | FK a transaction | `MISSING` envelope |
| `execution_runs` | Ninguno | service-role-only | FK a transaction | `MISSING` envelope |
| receipts/verification/cost | Criterion receipt tiene tenant; otros no | service-role-only en caminos activos | FKs sin same-tenant tuple constraints | `PARTIAL` |
| candidates/media/storage metadata | Ninguno | service-role-only | FKs a core; objetos privados | `MISSING` envelope/storage policy |
| tablas Field Beta | `tenant_id` text + `owner_tenant_id` UUID | service-role writes; app tenant filters; select policies declaradas | no constraint de igualdad tenant con referencias downstream | `PARTIAL` |
| human acceptance | Field feedback tiene tenant/owner/principal | service-role insert via app | un feedback por outcome; sin permiso de rol | `PARTIAL` |
| `state_commits` | Ninguno | service-role-only | FKs + unique transaction; sin proof/tenant/actor/fingerprint | `MISSING` |

## Rutas cross-tenant que BUILD 001 debe cerrar

1. Repositorios service-role downstream hacen consultas por ID/transaction sin owner tenant.
2. Execution, generic evidence, verification, candidate, cost y StateCommit no tienen envelope tenant explicito.
3. Las tablas Field Beta pueden referenciar transaction/execution/candidates de otro owner porque sus FKs no comparan tenant.
4. Storage keys no incluyen tenant obligatorio y las signed read URLs se crean con cliente privilegiado.
5. El servicio generico acepta `ownerTenantId` opcional y no recibe `AuthorityContext`; las filas historicas NULL siguen accesibles a service role.
6. Las rutas legacy, si se habilitan fuera de produccion, aceptan locators sin autenticar y pueden leer, ejecutar, aceptar o hacer commit.
7. `MEMBER` puede ejecutar/aceptar/promover porque el rol resuelto no se aplica a acciones.
8. Head, StateCommit, candidate flag y transaction status se escriben sin una transaccion atomica.

## Fallos cerrados ya presentes

- JWT invalido, ausencia de membership, tenant inactivo o locator foraneo no producen `AuthorityContext`.
- Critical UNKNOWN y capability escalation fallan en el compiler/Same-Spec.
- Field Beta exige TaskSpec hash valido y binding a transaction/source.
- Evidence exact-set faltante o conflictiva proyecta `INCOMPLETE`, no PASS.
- Acceptance foranea o con recorder no servidor proyecta `PENDING`.
- Head stale, ausencia de verification/evidence y commit duplicado son rechazados por los servicios legacy antes de escribir.
- Rutas legacy devuelven 404 por defecto y siempre en produccion.

Estos controles no compensan los limites `MISSING` descritos arriba.

## Cambio de diseno despues del mapeo

**Estado: `REFINED; NO MATERIAL DEPARTURE FROM BUILD 000`.**

El mapa confirma el objetivo de BUILD 000, pero fija restricciones de implementacion que antes estaban dispersas:

1. El nuevo camino no puede invocar `OutcomeTransactionService.commitTransaction` ni `approvePreserved` sin envolverlos o reemplazar su persistencia de commit.
2. `AuthorityContext` debe llegar completo a execution, evidence, acceptance y commit; no debe reducirse prematuramente a strings ni reconstruirse desde payload.
3. El commit debe ser una sola operacion PostgreSQL con lock/CAS del head, reautorizacion, exact proof set, acceptance autorizada, creacion de version, movimiento de head, StateCommit y status final.
4. La operacion atomica debe derivar tenant/actor del contexto autenticado o de una RPC estrecha, no aceptar claims de owner, verified, accepted o committed.
5. Todos los objetos downstream deben tener envelope tenant verificable o una constraint/policy transitiva demostrable desde una transaction tenant-owned; solo una FK de existencia no basta.
6. Debe existir permiso explicito para `EXECUTE`, `ACCEPT` y `COMMIT`, aunque inicialmente se proyecte desde `OWNER/MEMBER`; el codigo debe hacer la decision visible y testeable.
7. Storage debe ligar objetos a tenant + transaction + artifact digest y validar esa lineage antes de emitir read URLs.

No se propone un engine paralelo: Blueprint, TaskSpec, OutcomeTransaction, receipts, Same-Spec, AssetVersion y StateCommit siguen siendo los nucleos a adaptar.

## Gate de implementacion

El mapa requerido esta completo para el baseline aceptado. La implementacion de aplicacion y migraciones permanece sin iniciar en este cambio documental.

Antes del primer cambio de runtime, el plan tecnico debe demostrar:

- esquema tenant para Work Contract/Execution/Evidence/Acceptance/StateCommit;
- RPC atomica y su modelo de errores/reintentos;
- politica de rol/capability por accion;
- estrategia user-scoped versus RPC `security definer` con privilegios minimos;
- constraints de same-tenant y same-lineage;
- Storage ownership y read authorization;
- pruebas negativas de dos tenants, stale race, replay/idempotency, evidence mismatch, revoked membership y partial-failure rollback;
- prueba real separada de los tests estaticos/in-memory, sin convertir `SKIPPED_ENVIRONMENT` en PASS.

## Evidencia principal

- Auth y autoridad: `src/server/authenticated-principal-resolver.ts`, `src/server/tenant-authority.ts`, `src/application/auth/tenant-authority-service.ts`.
- Core lineage tenant-scoped: `app/api/core-lineage/route.ts`, `src/infrastructure/persistence/outcome/supabase-tenant-core-lineage-repository.ts`.
- Identity/RLS/triggers: migraciones `20260814090000`, `20260814203203`, `20260814221620`.
- Kernel y commit no atomico: `src/application/outcome/outcome-transaction-service.ts`.
- Precision Edit acceptance/commit legacy: `src/application/outcome/media/preservation-verification-service.ts`, `app/api/precision-edit/route.ts`.
- Field Beta authority/evidence/acceptance: `app/api/field-beta/route.ts`, `src/server/field-beta-services.ts`, `src/application/outcome/media/field-beta-service.ts`.
- Persistencia privilegiada: `src/infrastructure/persistence/outcome/supabase-outcome-repositories.ts`, `src/infrastructure/persistence/outcome/supabase-field-beta-repository.ts`.
- Status semantics: `src/domain/outcome/media/field-beta.ts`, `docs/governance/STATUS_SEMANTICS_CURRENT_MODEL.md`.
- Politica y riesgos aceptados: `SECURITY.md`, `docs/security/THREAT_MODEL.md`, `docs/builds/build-000/05_SECURITY_GAP_ANALYSIS.md`.
