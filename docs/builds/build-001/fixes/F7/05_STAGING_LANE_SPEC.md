# BUILD 001-F7 - Remote staging lane specification

## Propósito

Definir BUILD 001-R ejecutable posteriormente para controles que no pueden elevarse desde PGlite o mocks. F7 no ejecuta esta lane.

## Restricciones de seguridad

- Sólo proyecto Supabase aislado, desechable y no productivo.
- `VIRRO_STAGING_ASSURANCE_ACK=ISOLATED_NON_PRODUCTION` obligatorio.
- Nunca usar URL, claves, tenants, usuarios, buckets ni datos de producción.
- Aplicar migraciones desde cero y registrar hashes/orden.
- Usar prefijo único por run; limpiar incluso después de falla.
- Logs y artifacts sanitizados, sin JWTs, keys, URLs firmadas ni PII.
- Destruir el proyecto o fixtures al finalizar según política del entorno.

## Variables por nombre

Preflight actual:

- `RUN_BUILD001_TRUST_INTEGRATION`
- `VIRRO_STAGING_ASSURANCE_ACK`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Lane BUILD 001-R completa futura:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ASSURANCE_TENANT_A_OWNER_EMAIL`
- `ASSURANCE_TENANT_A_OWNER_PASSWORD`
- `ASSURANCE_TENANT_A_MEMBER_EMAIL`
- `ASSURANCE_TENANT_A_MEMBER_PASSWORD`
- `ASSURANCE_TENANT_B_OWNER_EMAIL`
- `ASSURANCE_TENANT_B_OWNER_PASSWORD`
- `ASSURANCE_STORAGE_BUCKET`
- `ASSURANCE_RUN_ID`

No se incluyen valores.

## Fixtures mínimos

- tenant A y B ACTIVE;
- OWNER A, MEMBER A y OWNER B con Auth real;
- membership revocada y tenant SUSPENDED;
- project/asset/base version por tenant;
- outcome/execution/evidence/verification/acceptance válidos y ataques cruzados;
- objetos Storage A/B con prefijo del run;
- dos transacciones sobre el mismo base para concurrency.

## Controles y evidencia esperada

| Control | Required | Evidencia |
|---|---|---|
| Supabase Auth y memberships | E4 | JWTs sanitizados por actor, resultados allow/deny |
| RLS A/B por tabla | E4 | query matrix y error/cero filas exactos |
| RPC ACL/owner/search_path | E4 | catálogo desplegado y llamadas anon/member/owner |
| Storage policies | E4 | list/read/sign/write matrix A/B |
| service-role Storage | E4 | operación privilegiada más comprobación de tenant binding |
| remote concurrency | E4 | barrera coordinada, resultados y snapshot final |

## Comando actual

```text
pnpm test:staging
```

Actualmente sólo prueba la negación anónima del RPC. Su receipt debe limitarse a ese criterio. Los demás controles permanecen `NOT_PROVEN`, `SKIPPED` o `UNKNOWN` hasta implementar y ejecutar BUILD 001-R.

## Cleanup

Eliminar en orden feedback/evidence/verifications/executions/candidates/transactions/versions/assets/projects/memberships/tenants, borrar objetos y prefijos Storage y eliminar usuarios Auth de fixture. Si una tabla append-only impide cleanup, usar un proyecto efímero destruible, no debilitar triggers.
