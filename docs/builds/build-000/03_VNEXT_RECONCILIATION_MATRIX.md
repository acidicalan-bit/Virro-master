# BUILD 000 - Matriz de reconciliación vNext

Las clasificaciones describen el código actual; las acciones describen la evolución recomendada.

| Concepto vNext | Estado actual | Primitiva actual | Acción | Decisión |
| --- | --- | --- | --- | --- |
| Intent | IMPLEMENTED | `IntentContract`, pragmatics, `IntentModel` | KEEP | Mantener schema/puerto; calibrar con datos. |
| Canon Grounding | PARTIAL | `AssetVersion`, head, `CustomerBusinessCanon` domain-only | ADAPT | Persistir Canon tenant-owned/versionado sin saltar transacción. |
| Signal Sufficiency | SEMANTICALLY_SIMILAR | confidence, ambiguities, critical `UNKNOWN`, spec linter | ADAPT | Crear evaluación explícita derivada, no otro motor. |
| Consequential Clarification | SEMANTICALLY_SIMILAR | `ASK`, clarification requirements, high-impact ambiguities | ADAPT | Formalizar sólo para bloqueos de alto impacto. |
| Immutable Work Contract | PARTIAL | `ExecutionContract` + Blueprint + hash-addressed TaskSpec | WRAP | Definir una proyección/aggregate durable que componga, no duplique. |
| WorkContractVersion | SEMANTICALLY_SIMILAR | version/hash/previousVersionHash en Blueprint/TaskSpec | ADAPT | Persistir chain y política de inmutabilidad. |
| Authority | PARTIAL | `AuthorityContext`, `MutationLease`, capability policy/lenses | ADAPT | Unificar identidad, resource scope y execution capabilities. |
| AuthorityLease | SEMANTICALLY_SIMILAR | `MutationLease` + capabilityGrant | WRAP | Extender a herramientas, repo paths, red, secretos, tiempo y costo. |
| Execution | IMPLEMENTED | `ExecutorPort`, image executor, `ExecutionRun` | KEEP/WRAP | Mantener puerto; añadir adapter específico sólo tras policy. |
| ExecutionAttempt | SEMANTICALLY_SIMILAR | `ExecutionRun` | ADAPT | Hacerlo contract-bound, tenant-bound e idempotente. |
| ExecutionFingerprint | SEMANTICALLY_SIMILAR | TaskSpec hash + provider/model/adapter/policy versions | ADAPT | Material canónico único y hash reproducible. |
| EvidenceItem | IMPLEMENTED | `EvidenceReceipt`, assertions, criterion evidence | KEEP | Generalizar tipos de evidencia sin degradar pruebas actuales. |
| EvidenceBundle | PARTIAL | conjuntos de criterion evidence + verification run | WRAP | Bundle exact-set ligado al mismo contrato/attempt. |
| Same-Contract Verification | IMPLEMENTED | Same-Spec Gate | KEEP/RENAME | Conservar semántica y conectar al commit genérico. |
| VerificationReceipt | PARTIAL | `VerificationRun` + criterion evidence | ADAPT | Recibo inmutable con policy/verifier/artifact bindings. |
| Human Acceptance | IMPLEMENTED | candidate preference, study acceptance, field feedback | KEEP/ADAPT | Crear contrato genérico con actor/tenant/scope. |
| RepairRequest | PARTIAL | `REPAIRING`, SemanticPatch, human correction, rollback | ADAPT | Entidad explícita ligada a contract version y failed criteria. |
| LearningObservation | SEMANTICALLY_SIMILAR | feedback, regression candidates, golden cases, studies | ADAPT | Append-only, provenance y uso offline; nunca autoridad inmediata. |
| ExecutorAdapter | IMPLEMENTED | generic/image executors and ports | KEEP | Conservar boundary provider-neutral. |
| CodexAdapter | MISSING | sólo copy/UI “Codex Execution Contract” | DEFER | Diseñar después de AuthorityLease y sandbox/capability policy. |

## Prueba de la hipótesis de evolución

**Hipótesis:** el engine actual puede evolucionar a Delegation Assurance sin reescritura total.

Intentos de falsificación:

1. **Dominio inseparable de imágenes:** falsado; kernel, contracts y ports son genéricos.
2. **Canon vive en chat/model context:** falsado; `AssetVersion`/head son persistentes e independientes.
3. **Executor muta canon directamente:** falsado por candidate/evidence/verification/commit.
4. **No existe identidad común entre ejecución y prueba:** falsado parcialmente por TaskSpec ID/hash y criterion receipts.
5. **No hay autoridad server-side:** falsado parcialmente por Auth/membership/RLS.
6. **Cambio incremental imposible por duplicidad de conceptos:** no demostrado; hay equivalentes semánticos suficientes para WRAP/ADAPT.

La hipótesis sobrevive. Lo que sí se falsó es que el sistema ya sea Delegation Assurance general: la persistencia de spec, el envelope tenant downstream, el fingerprint único, el contrato de reparación y un segundo dominio no-media faltan.

## REWRITE

**REWRITE REQUIRED? NO.** Sólo sería justificable si un segundo dominio demuestra que el kernel, TaskSpec o los puertos impiden capacidades necesarias, o si la atomicidad/tenancy no puede corregirse con migraciones compatibles. No existe esa evidencia.

