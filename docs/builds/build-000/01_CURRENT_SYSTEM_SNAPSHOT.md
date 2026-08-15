# BUILD 000 - Snapshot del sistema actual

## Identidad de repositorio

| Campo | Valor |
| --- | --- |
| Top level verificado | `C:/Users/alan-/OneDrive/Documentos/virro solutions` |
| Remote | `https://github.com/acidicalan-bit/Virro-master.git` |
| Default branch | `main` |
| Commit canónico | `96e42e9f1d8f97b625a69fd85c9b835ea7ce4db7` |
| Worktree de auditoría | detached HEAD, limpio |
| Checkout excluido | `fix/virro-impulsa-experience-rebuild`, sucio y preservado |

## Producto actual

- Aplicación: `intent-lab` v0.1.1.
- Forma: laboratorio web interno, responsive.
- Categoría propuesta en el spec: Marketplace Digital Universal / Universal Digital Marketplace.
- Alcance ejecutable: Intent Lab, benchmark/blind eval, Outcome Transaction Kernel, Precision Edit, Preservation Study y Field Beta interno.
- No existen marketplace público, billing, catálogo, seller runtime, Codex executor, native app o API pública soportada.

## Stack

| Capa | Tecnología |
| --- | --- |
| Web/API | Next.js 16.3.0 App Router, React 19.2.4 |
| Dominio/validación | TypeScript 5.9.3, Zod 4.4.3 |
| Persistencia | Supabase Postgres, RLS, Storage privado; repositorios en memoria para test/dev |
| IA | OpenAI Responses para intención, OpenAI Images para edición, baseline heurístico |
| Calidad | ESLint 9.39.2, Vitest 4.1.10, Testing Library |
| Package manager | pnpm 11, lockfile congelado |

No hay directorio `.github`; CI/CD no está definido en este commit.

## Superficies

Páginas: `/`, `/auth`, `/benchmarks`, `/blind-eval`, `/field-beta`, `/precision-edit-lab`, `/preservation-study`, `/transaction-lab`.

API: auth/provision, compile, execution-contract, benchmarks, blind-eval, feedback, core-lineage, field-beta, precision-edit, preservation-study y transaction-lab. Las rutas legacy con persistencia privilegiada fallan cerradas por defecto y en producción.

## Datos

Existen 18 migraciones. Familias principales:

- Intent/evaluación: `intent_runs`, feedback, benchmarks y blind evaluation.
- Kernel: `projects`, `assets`, `asset_versions`, `outcome_transactions`, patches, leases, executions, evidence, verification, commits y costs.
- Media/preservation: media, snapshots, candidates, preservation runs/evidence/preferences y estudios.
- Field learning: policies, strategies, outcomes, feedback, regressions, golden cases y evaluation samples.
- Seguridad/tenancy: `tenants`, `tenant_memberships`, `owner_tenant_id`, triggers de consistencia y RLS.

`OutcomeBlueprint`, el registro general de `TaskSpec`, `MarketplaceProject` y `CustomerBusinessCanon` son pruebas de dominio/in-memory; no tienen persistencia general de producción.

## Autoridad y autenticación

Supabase Auth produce un principal. `TenantAuthorityService` exige tenant activo y membership activa, y congela `AuthorityContext`. Los roles disponibles son `OWNER` y `MEMBER`. `/api/core-lineage` usa cliente Supabase scoped al usuario. Field Beta también resuelve autoridad de tenant.

La cobertura es parcial: execution/evidence/storage/commit no están completamente migrados al envelope tenant-aware; service role sigue presente en compatibilidad legacy.

## IA y determinismo

- `IntentModel` separa el dominio de OpenAI.
- `OpenAIIntentModel` usa salida JSON schema, Zod y un único intento de reparación.
- El baseline heurístico es determinista y no sustituye silenciosamente al proveedor durante blind eval.
- `DeterministicPrecisionEditSpecCompiler`, el linter, Same-Spec y la evidencia de píxeles son deterministas.
- No existe `CodexAdapter`: la UI sólo genera y muestra un “Codex Execution Contract”.

## Clasificación de primitivas críticas

| Pregunta | Clasificación | Realidad |
| --- | --- | --- |
| Especificación/historial inmutable | PARTIAL | Historial de `AssetVersion` sí; Blueprint/TaskSpec general aún in-memory/parcialmente snapshot. |
| Execution Contract | IMPLEMENTED | Schema/generador ejecutable; no es todavía contrato durable de trabajo. |
| TaskSpec | IMPLEMENTED | Schema, hash, compiler y gates; runtime/persistencia general son parciales. |
| Execution lineage | PARTIAL | Kernel completo en modelo; tenant envelope termina antes de downstream completo. |
| Execution fingerprint | SEMANTICALLY_SIMILAR | Hash de TaskSpec + versiones provider/model/adapter/policy dispersas; no hay entidad única. |
| Evidence records | IMPLEMENTED | `EvidenceReceipt`, creative assertions y criterion evidence. |
| Machine verification | IMPLEMENTED | Verificación técnica y Same-Spec; profunda sólo para Precision Edit. |
| Tenant isolation | PARTIAL | Auth/RLS para core lineage/Field Beta; no para toda la cadena. |
| Server-side authority | PARTIAL | `AuthorityContext` y gates existen; legacy service role y roles gruesos permanecen. |
| Acceptance/approval | IMPLEMENTED | Preferencia, feedback y aceptación están separadas de machine verification. |
| Repair/version lineage | PARTIAL | Estado `REPAIRING`, semantic patches, rollback y version lineage; no `RepairRequest` genérico. |

