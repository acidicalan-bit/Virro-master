# BUILD 000 - Arquitectura actual

## Forma

```text
Next.js UI + Route Handlers
        |
Application services / use cases
        |
Domain schemas, policies, state machines
        |
Ports (models, executors, repositories, storage, compiler)
        |
OpenAI | Supabase | deterministic engines | in-memory adapters
```

Es un monolito modular. El dominio no depende de Next.js, Supabase u OpenAI; la composición server-side elige adaptadores.

## Flujos actuales

### Intent

```text
raw input + context
  -> human pragmatics
  -> IntentModel (heuristic/OpenAI)
  -> Zod IntentContract
  -> feedback / benchmark / blind evaluation
  -> deterministic ExecutionContract projection
```

### Kernel genérico

```text
Project -> Asset -> immutable AssetVersion
       -> OutcomeTransaction + PartialIntent + SemanticPatch + MutationLease
       -> ExecutorPort -> ExecutionRun + EvidenceReceipt
       -> VerificationRun
       -> explicit commit -> new AssetVersion + StateCommit
       -> rollback -> another immutable AssetVersion
```

El candidato del executor nunca es canon por sí mismo. El commit comprueba estado, evidencia, patch autorizado y head actual. La actualización del head y la creación de `StateCommit` aún no son una transacción PostgreSQL única.

### Spec-anchored / Precision Edit

```text
OutcomeBlueprint
  -> deterministic Precision Edit compiler
  -> hash-addressed TaskSpec
  -> role-bounded Spec Lenses
  -> image executor + preservation engine
  -> criterion evidence
  -> Same-Spec Gate
  -> human feedback / delivery (sin commit genérico en Field Beta)
```

`TaskSpec` y Same-Spec son genéricos en forma, pero la única compilación y verificación end-to-end profunda es Precision Edit.

## Límites de autoridad

- Principal: claims verificados de Supabase Auth.
- Tenant: membership activa sobre tenant activo.
- Contexto: `AuthorityContext`, congelado y derivado en servidor.
- Mutación: `MutationLease` por path y `capabilityGrant` por TaskSpec/lens.
- Canon: head actual de Asset + historial `AssetVersion`.
- Prueba: recibos de criterio ligados a tenant, transaction, execution, verification, TaskSpec ID/hash y artefactos.

La frontera no es todavía continua: core lineage y Field Beta son tenant-aware, mientras parte de execution/evidence/storage continúa en adaptadores privilegiados legacy.

## Proveedores y observabilidad

Los puertos `IntentModel`, `ExecutorPort`, `ImageEditExecutor` y `SpecCompilerPort` evitan acoplar dominio/UI a un SDK. Se guardan provider/model/versiones, latencia, uso y costo cuando están disponibles. El logger es JSON básico; no hay tracing distribuido, correlación general, SLOs ni pipeline de observabilidad.

## Precision Edit: core o capability

**Conclusión: capability.**

Evidencia a favor:

- `Project`, `AssetVersion`, `OutcomeTransaction`, evidence y state machine son independientes de media.
- Los puertos genéricos viven fuera de `outcome/media`.
- Blueprint, TaskSpec, lenses y Same-Spec modelan capacidades y criterios provider-neutral.
- La especialización está explícita en `precision-edit-blueprint.ts`, el compiler y servicios de media.

Contraevidencia/limitación:

- Precision Edit es la única prueba real profunda; todavía no existe un segundo dominio que demuestre portabilidad.
- Field Beta mezcla orquestación genérica y detalles de preservación, por lo que debe envolverse antes de reutilizarse.

## Evaluación de infraestructura futura

| Opción | Decisión | Razón / alternativa simple |
| --- | --- | --- |
| Microservices | REJECT | Monolito modular aún contiene la complejidad; no hay escala/equipos medidos. |
| Temporal/LangGraph | DEFER/REJECT ahora | Usar state machine + tablas Postgres; evaluar sólo con jobs largos/recovery medido. |
| Kafka/colas externas | REJECT ahora | Usar transacciones/outbox o job table cuando aparezca necesidad durable. |
| Graph DB | DEFER | Relaciones de producto/canon caben en Postgres. |
| Vector DB | DEFER | No hay caso de retrieval medido ni corpus operacional durable. |
| OpenFGA | DEFER | Membership + RLS + policy service son suficientes para el alcance actual. |

