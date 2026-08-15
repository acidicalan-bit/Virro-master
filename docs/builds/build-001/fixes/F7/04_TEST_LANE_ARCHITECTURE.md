# BUILD 001-F7 - Test lane architecture

## Comandos

| Comando | Clase máxima intencional | Uso |
|---|---|---|
| `pnpm test:model` | E1_MODEL | TrustHarness y modelo BUILD 001. El archivo mixto se clasifica conservadoramente E1 para claims SQL. |
| `pnpm test:application` | E2_APPLICATION | Handler real de retiro F2 con infraestructura instrumentada. |
| `pnpm test:sql` | E3_LOCAL_REAL_BOUNDARY | PGlite/PostgreSQL, pgcrypto, todas las migraciones y RPC real. Gate obligatorio. |
| `pnpm test:security` | Mixto E0-E2 | Agrupación operativa; no otorga un tier agregado. |
| `pnpm test:integration` | Mixto E3/E4 | E3 se ejecuta; E4 puede mostrarse como skip. |
| `pnpm test:staging` | E4_REMOTE_STAGING acotado | Preflight de seguridad y muestra RPC anónima. No certifica toda la lane E4. |
| `pnpm test:assurance` | Meta-control | Esquema, evaluator, manifest y skips. |
| `pnpm assurance:manifest` | N/A | Regenera JSON determinista desde la fuente tipada. |
| `pnpm assurance:check` | N/A | Falla si el manifest está stale. |
| `pnpm assurance:environment` | N/A | Emite skips, razones y controles no probados. |

## Carril SQL requerido

`@electric-sql/pglite` 0.5.5 es dependencia de desarrollo. F1 ya no usa `PGLITE_PACKAGE_ROOT` ni `describe.skipIf`. Un checkout con lockfile puede ejecutar E3 con:

```text
pnpm install --frozen-lockfile
pnpm test:sql
```

La suite reutiliza el bootstrap existente, aplica todas las migraciones y prueba el RPC real, triggers, inmutabilidad, rollback, stale head e idempotencia.

## CI

`.github/workflows/assurance.yml` define:

- job requerido `deterministic`: manifest, gaps de entorno, assurance, model, application, SQL E3, typecheck, lint, suite completa y build;
- job manual `staging-rpc-sample`: sólo se habilita por `workflow_dispatch`, environment protegido y secrets staging.

Los nombres de steps indican el tier. El job E4 no se ejecuta en pull requests ordinarios y su muestra no se presenta como assurance remota completa.

## Política de reportes

Un reporte correcto puede decir:

```text
Executed deterministic tests: PASS
E3 local SQL: PASS
E4 deployed RLS: SKIPPED / NOT_PROVEN
Overall remote assurance: NOT_PROVEN
```

No puede decir `Security: PASS` sin listar la satisfacción por criterio.
