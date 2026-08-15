# BUILD 000 - Mapa de migración de dominio

## Conceptos del engine actual

| Actual | Destino vNext | Acción | Nota |
| --- | --- | --- | --- |
| `IntentContract` | Intent | KEEP | Fuente estructurada de interpretación, no autoridad de ejecución. |
| `ExecutionContract` | Work Contract view | WRAP | Vista humana útil; no crear un contrato paralelo sin hash/persistencia. |
| `OutcomeBlueprint` | Work Contract template/policy | KEEP | Mantener allow/deny, variables, criteria, budget y version chain. |
| `TaskSpec` | WorkContractVersion / execution instruction | ADAPT | Es el mejor núcleo existente para contrato inmutable. |
| `Project/Asset/AssetVersion` | Operational Canon + Canon Snapshot | KEEP/ADAPT | Preservar identidad mutable e historial inmutable. |
| `OutcomeTransaction` | Delegated Work lifecycle | KEEP | Extender, no reemplazar, la state machine. |
| `PartialIntent` | Work Intent delta | KEEP | Evita inventar estado no solicitado. |
| `SemanticPatch` | Authorized Delta / Repair Patch | KEEP/ADAPT | Ligar a contract version y criterios fallidos. |
| `MutationLease` | AuthorityLease | ADAPT | Añadir herramientas, red, filesystem, secretos, tiempo y costo. |
| `ExecutionRun` | ExecutionAttempt | ADAPT | Añadir fingerprint, idempotency y tenant lineage completa. |
| `EvidenceReceipt` | EvidenceItem | KEEP | Mantener procedencia y binding a ejecución/base. |
| `verification_criterion_evidence` | EvidenceBundle members | KEEP | Base correcta para exact-set proof. |
| `VerificationRun`/Same-Spec | VerificationReceipt/Same-Contract | ADAPT | Unificar recibo durable y commit gate. |
| candidate preference/field feedback | HumanAcceptance | ADAPT | Actor/tenant/scope/version explícitos. |
| regressions/golden cases | LearningObservation | ADAPT | Offline, append-only y sin promoción automática a canon. |

## Conceptos históricos no canónicos

Los siguientes pertenecen al snapshot FastAPI/enterprise anterior y no existen como arquitectura actual en `96e42e9`:

| Histórico | Estado | Recomendación |
| --- | --- | --- |
| Understanding Event | DEAD/HISTORICAL | No reintroducir; mapear necesidades reales a Intent/transaction evidence. |
| Meaning Loss / Understanding Debt | DOCUMENTED_ONLY/HISTORICAL | Tratar como métricas hipotéticas, no entidades core. |
| Degree of Understanding / Virro Score | HISTORICAL | No migrar sin definición y evidencia de decisión. |
| Handoff / Context Packs / Analysis Packs | HISTORICAL | Sólo rescatar casos de uso medidos como Blueprint/Project context. |
| Project Memory / Operational Glossary | HISTORICAL | Evaluar dentro de Canon con provenance/approval. |
| Role Translator / Token Optimizer | HISTORICAL | No migrar; no son límites de autoridad. |
| Clarification Engine | SEMANTICALLY_REPLACED | Intent pragmatics + ASK + critical UNKNOWN ya cubren el núcleo. |
| Output Contracts | SEMANTICALLY_REPLACED | ExecutionContract/Blueprint/TaskSpec. |
| Decision Log | DOCUMENTED_ONLY | `PROJECT_SPEC` Decision Registry; persistencia runtime no justificada. |

## Secuencia de migración

1. Congelar vocabulario y ownership de cada concepto.
2. Corregir spec/docs que contradicen Auth/tenant actual.
3. Persistir Blueprint/TaskSpec como Work Contract versionado, reutilizando hashes.
4. Conectar `AuthorityContext`, lease y capability policy a un intento genérico.
5. Crear fingerprint canónico y receipts exact-set.
6. Hacer tenant-aware execution/evidence/storage/commit y atomicidad de commit.
7. Probar un segundo workflow no-media con fake executor.
8. Diseñar CodexAdapter después de definir sandbox y capability lease.

## Estrategia de coexistencia

- Mantener APIs/servicios Precision Edit como adapter vertical.
- Envolver Field Beta detrás del nuevo contrato sin reescribir algoritmos de preservación.
- Migrar lecturas/escrituras de service role a user-scoped/RPC por agregado.
- Strangle únicamente rutas legacy una vez que su equivalente tenant-safe tenga pruebas negativas.

