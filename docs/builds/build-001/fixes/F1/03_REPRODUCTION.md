# BUILD 001-F1 - Reproduccion original

## Entorno

- PostgreSQL `18.3` mediante PGlite `0.5.5` instalado en un directorio temporal externo;
- extension `pgcrypto` real;
- bootstrap minimo de roles `anon`, `authenticated`, `service_role`, schema `auth`, `auth.uid()` y `storage.buckets`;
- las 19 migraciones del repositorio aplicadas en orden, incluida `20260815030000_build_001_trust_foundation_atomic_commit.sql`;
- sin credenciales ni infraestructura de produccion.

## Fixture

La prueba `tests/integration/build001-f1-canonical-commit.integration.test.ts` crea tenant ACTIVE, OWNER ACTIVE, project, asset/base version/head, transaction VERIFIED, execution SUCCESS, raw/preserved candidates, strategy, Field Outcome con TaskSpec READY, verification PASSED, exact criterion evidence y Human Acceptance valida.

## Antes del parche

Comando:

```text
PGLITE_PACKAGE_ROOT=<pglite-package> pnpm vitest run tests/integration/build001-f1-canonical-commit.integration.test.ts
```

Resultado primario:

```text
FAIL completes the legitimate atomic commit and returns an idempotent retry
error: TRUST_STATE_COMMIT_IMMUTABLE
```

La excepcion ocurre en el RPC real al actualizar el candidate. PostgreSQL revierte la version, el movimiento de head y StateCommit de esa llamada. Las pruebas reales de stale head, ausencia de acceptance/verification y failure injection ya confirmaron rollback en la misma ejecucion.

Este resultado es el reproducer pre-patch requerido; no usa `TrustHarness`.
