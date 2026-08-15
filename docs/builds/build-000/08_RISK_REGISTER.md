# BUILD 000 - Registro de riesgos

| ID | Riesgo | Prob. | Impacto | Evidencia | Tratamiento |
| --- | --- | --- | --- | --- | --- |
| R-001 | Kernel genérico y spec/Field Beta divergen en dos caminos | Alta | Alto | Generic commit no está production-wired con Same-Spec | BUILD 001 vertical slice único. |
| R-002 | Tenant isolation termina antes de execution/evidence/storage/commit | Alta | Crítico al exponer | Foundation 1.5 Phase B limita alcance | Migrar envelope y pruebas negativas. |
| R-003 | Head update y StateCommit no atómicos | Media | Alto | `PROJECT_SPEC:235` y service multi-write | RPC/transacción DB con stale check. |
| R-004 | Duplicar Work Contract sobre TaskSpec/Blueprint | Alta | Alto | Equivalentes semánticos ya existen | WRAP + ADR, no nuevo motor. |
| R-005 | CodexAdapter amplía filesystem/network/secret authority | Media | Crítico | Sandbox/lease no existen | DEFER hasta policy/sandbox aprobado. |
| R-006 | Precision Edit se confunde con validación horizontal | Alta | Alto | Único dominio profundo | Segundo workflow no-media antes de claim general. |
| R-007 | Product thesis/marketplace sin evidencia comercial | Alta | Alto | PEX NOT_STARTED, no billing/catalog | Mantener como hypothesis; medir buyer value. |
| R-008 | Retention/deletion declarada sin enforcement | Media | Alto | Threat model y PEX manual | Lifecycle job + receipts + tests. |
| R-009 | Service role legacy comprometida | Media | Alto | Rutas/adapters privilegiados | Strangle por superficie, scoped RPC. |
| R-010 | Sin CI, una regresión local llega a main | Media | Alto | `.github` ausente | CI mínimo en BUILD 001. |
| R-011 | Docs contradicen Auth/tenant actual | Alta | Medio | DOC-001..005 | Reconciliación documental como gate. |
| R-012 | Real integrations permanecen sin revalidación | Media | Alto | 10 skips de entorno | Job controlado, sin credenciales prod. |
| R-013 | Provider/model change degrada resultados | Media | Medio | Model versions/cost captured parcialmente | Pin/versionar y replay regression. |
| R-014 | No rate/idempotency/cost guard público | Media | Alto al exponer | API governance lo exige | Implementar antes de public API. |
| R-015 | External side effects de BUILD 000 no se pueden probar exhaustivamente | Baja | Bajo | Jira no instalado; búsquedas parciales | Conservar UNKNOWN y receipts futuros. |

## Top 5

1. R-002 - aislamiento tenant incompleto.
2. R-001 - caminos de ejecución divergentes.
3. R-003 - commit no atómico.
4. R-005 - autoridad excesiva de un futuro CodexAdapter.
5. R-006 - generalización prematura desde Precision Edit.

