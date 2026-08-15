# BUILD 000 - Índice de evidencia

## Baseline de comandos

| ID | Comando/evidencia | Resultado |
| --- | --- | --- |
| CMD-001 | `git rev-parse --show-toplevel` | `C:/Users/alan-/OneDrive/Documentos/virro solutions` |
| CMD-002 | `git status --short --branch` en checkout usuario | rama dirty preservada; no se modificó |
| CMD-003 | `git fetch --prune origin` + `git rev-parse origin/main` | `96e42e9f1d8f97b625a69fd85c9b835ea7ce4db7` a `2026-08-15T07:07:23.4741573Z` |
| CMD-004 | `git worktree add --detach ... <SHA>` | worktree limpio en SHA exacto |
| CMD-005 | `pnpm install --frozen-lockfile` | PASS, supply-chain policy PASS, lockfile unchanged |
| CMD-006 | `pnpm typecheck` | PASS |
| CMD-007 | `pnpm lint` | PASS |
| CMD-008 | unit suite acotada | 32 files / 285 tests PASS |
| CMD-009 | `pnpm exec vitest run tests/security` | 4 files / 7 tests PASS |
| CMD-010 | integration/smoke verbose | 3 deterministic PASS; 10 `SKIPPED_ENVIRONMENT` |
| CMD-011 | `pnpm test` | 295 PASS, 10 skipped |
| CMD-012 | `pnpm build` | PASS, 20 routes |
| CMD-013 | `pnpm audit --prod` | no known vulnerabilities |
| CMD-014 | `rg` de FastAPI/license/Privacy Shield en current main | componentes históricos ausentes |
| CMD-015 | búsqueda Linear `"BUILD 000" Virro` | sin resultados |
| CMD-016 | búsqueda GitHub issues repo + `"BUILD 000"` | sin resultados |
| CMD-017 | búsqueda Jira/Atlassian | UNKNOWN: app no instalada / 403 |

## Evidencia de repositorio

| Afirmación | Evidencia principal |
| --- | --- |
| Autoridad de spec y producto actual | `PROJECT_SPEC.md:1-51`, `PROJECT_SPEC.md:172-196` |
| Kernel e historial inmutable | `src/application/outcome/outcome-transaction-service.ts:122-372`; `src/domain/outcome/asset-version.ts:3`; `src/domain/outcome/outcome-transaction.ts:3-51` |
| Commit no atómico | `PROJECT_SPEC.md:223-237`; `outcome-transaction-service.ts:288-329` |
| Execution Contract | `src/domain/execution-contract.ts:5-61`; `app/api/execution-contract/route.ts:6-16` |
| TaskSpec version/hash/UNKNOWN | `src/domain/outcome/specification/task-spec.ts:9-114` |
| Blueprint inmutable in-memory | `src/domain/outcome/specification/outcome-blueprint.ts:69-206` |
| Same-Spec Gate | `src/application/outcome/specification/same-spec-gate.ts:13-80` |
| Role/capability lenses | `src/application/outcome/specification/spec-lens.ts:5-42` |
| Evidence durable por criterio | `supabase/migrations/20260813120000_v14_criterion_machine_evidence.sql`; `precision-edit-criterion-evidence.ts:5-109` |
| Generic ports/adapters | `src/application/ports/intent-model.ts:29`; `src/application/ports/outcome/executor-port.ts:20-23`; `src/application/ports/outcome/spec-compiler-port.ts:5-15` |
| Precision Edit como implementación estrecha | `PROJECT_SPEC.md:190-196`; `precision-edit-blueprint.ts:9-35`; `deterministic-spec-compiler.ts:15-126` |
| Canon domain-only | `PROJECT_SPEC.md:108-113`; `src/domain/marketplace/universal-marketplace.ts:145-173` |
| Auth/AuthorityContext | `src/domain/auth/authority.ts:3-55`; `tenant-authority-service.ts:7-38`; `authenticated-principal-resolver.ts:15-30` |
| Core lineage tenant-safe | `app/api/core-lineage/route.ts:14-52`; migrations `20260814203203` y `20260814221620` |
| Legacy guard | `src/server/legacy-route-guard.ts:3-13`; `tests/security/legacy-route-*.test.ts` |
| Riesgo service role/downstream | `SECURITY.md`; `docs/security/THREAT_MODEL.md:46-63,95-120`; `FOUNDATION_1_5_PHASE_B_BUILD_001.md:35-49` |
| Retención no automatizada | `docs/security/THREAT_MODEL.md:54`; `PEX_PRECISION_EDIT_BUYER_VALUE_PROTOCOL_V0_1.md:297-300` |
| Acceptance separada | `docs/governance/STATUS_SEMANTICS_CURRENT_MODEL.md:7-16`; `PROJECT_SPEC.md:259-263` |
| Sin CodexAdapter | sólo `src/ui/intent-lab.tsx:153,336`; no adapter/port de Codex |
| Infra distribuida rechazada/deferida | `PROJECT_SPEC.md:550-556`; Decision D-005 |
| Drift Auth en spec | `PROJECT_SPEC.md:327,331,406` contra Foundation 1.5 source/migrations |
| Current state volátil obsoleto | `docs/CURRENT_STATE.md:1-24` frente a CMD-003 |

## Evidencia de seguridad auxiliar

Ruta del scan histórico: `C:\Users\alan-\AppData\Local\Temp\codex-security-scans-Oi0iPB\virro-build000-main-411b626\unversioned_20260815T060246Z_1o7_0m_8`.

Estado observado: tres JSON existen; `scan-manifest.json` no tiene `sealedAt`, artifact count es 0, no existe `report.md`, findings count es 7. El target es un directory snapshot de `411b626`, no el baseline actual. Se usa sólo como evidencia histórica del fallo de workflow.

