# BUILD 000 - Baseline de pruebas y calidad

## Entorno

- Commit: `96e42e9f1d8f97b625a69fd85c9b835ea7ce4db7`
- Worktree limpio y detached.
- Instalación: `pnpm install --frozen-lockfile` PASS; 455 paquetes, lockfile sin cambio.

## Resultados

| Categoría | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm typecheck` | PASS |
| Lint | `pnpm lint` | PASS |
| Unit/component/domain | `pnpm exec vitest run --exclude 'tests/security/**' --exclude 'tests/integration/**' --exclude 'tests/smoke/**'` | 32 files, 285 tests PASS |
| Security tests | `pnpm exec vitest run tests/security` | 4 files, 7 tests PASS |
| Integration/smoke static | `pnpm exec vitest run tests/integration tests/smoke --reporter=verbose` | 1 file, 3 deterministic pixel tests PASS |
| Environment integration | mismo comando | 4 files, 10 tests `SKIPPED_ENVIRONMENT` |
| Full suite | `pnpm test` | 37 files PASS, 4 skipped; 295 tests PASS, 10 skipped |
| Production build | `pnpm build` | PASS; 20 routes, compile y TypeScript PASS |
| Dependency audit | `pnpm audit --prod` | PASS; no known vulnerabilities reported |

## Pruebas omitidas

| Archivo / casos | Motivo | No demostrado |
| --- | --- | --- |
| `tests/smoke/build-004-readback.test.ts` (1) | `RUN_REAL_BUILD_004_READBACK` no habilitado | Readback real, commit v2, hashes Storage e historial remoto. |
| `tests/smoke/build-004-real-smoke.test.ts` (1) | `RUN_REAL_BUILD_004_SMOKE` no habilitado | Una llamada real OpenAI + persistencia Supabase. |
| `tests/integration/build005b-db.integration.test.ts` (6) | `RUN_BUILD005_DB_INTEGRATION` y credenciales ausentes | RLS real, cross-tenant, snapshots y recovery en Supabase. |
| `tests/integration/build005b-stabilization.integration.test.ts` (2) | `RUN_BUILD005B_STABILIZATION_INTEGRATION` y execution ID ausentes | Redrive fresh-process contra estado remoto persistido. |

Clasificación: `SKIPPED_ENVIRONMENT`, nunca PASS.

## Riesgos de calidad

- No hay CI en el commit canónico.
- No hay threshold de coverage.
- El test suite es fuerte en lógica determinista, invariantes y UI, pero el estado remoto real se apoya en evidencia histórica no revalidada.
- `PROJECT_SPEC` y algunos documentos de seguridad contradicen la implementación actual de Auth/tenant.
- El build no modificó archivos rastreados; no fue necesaria reversión de generated files.

## Gate recomendado

BUILD 001 debe añadir CI mínimo para install frozen, typecheck, lint, unit, security y build. Las pruebas reales deben ser un job separado, explícito y con entorno aprobado; un skip debe permanecer visible.

