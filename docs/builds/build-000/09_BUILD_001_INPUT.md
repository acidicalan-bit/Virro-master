# BUILD 000 - Input recomendado para BUILD 001

## Nombre

**BUILD 001 - Durable Work Contract & Authority Integration**

## Objetivo

Demostrar un único camino tenant-safe y provider-neutral:

```text
Intent -> Work Contract version
-> Authority lease -> ExecutionAttempt
-> exact-set Evidence -> Same-Contract Verification
-> Human Acceptance -> commit eligibility
```

Debe reutilizar `OutcomeBlueprint`, `TaskSpec`, `OutcomeTransaction`, `AuthorityContext`, leases, receipts y Same-Spec. No se autoriza otro engine paralelo.

## Gate de gobernanza

1. Corregir DOC-001..005.
2. Congelar el mapa de ownership y nombres de dominio.
3. Añadir CI mínimo y mantener integration skips visibles.
4. Establecer SPEC DELTA y ADR de “WorkContract wraps TaskSpec/Blueprint”.

## Alcance ejecutable

- Persistencia durable/version chain para Blueprint/TaskSpec bajo una proyección Work Contract.
- Fingerprint canónico que incluya contract ID/hash, base head, authority policy, adapter/provider/model/policy versions y artifacts de entrada.
- Tenant envelope para ExecutionRun, EvidenceReceipt, verification y commit eligibility.
- Commit atómico o RPC con stale-head check.
- RepairRequest mínimo ligado a failed criteria y nueva contract version/patch.
- Un workflow no-media determinista/fake que pruebe portabilidad sin proveedor real.
- Mantener Precision Edit como adapter de referencia y regression suite.

## Fuera de alcance

- CodexAdapter real, ejecución arbitraria de repositorios o seller code.
- Marketplace, catálogo, pagos, wallet, recomendaciones.
- Temporal, LangGraph, Kafka, microservices, graph/vector DB.
- Mobile native, public API o nuevos proveedores.
- Rediseño UI amplio.

## Criterios de aceptación

1. No existe duplicidad autoritativa entre Work Contract y TaskSpec.
2. Published/READY versions son inmutables y hash-verificables en Postgres.
3. Un tenant no puede leer/escribir contratos, attempts, evidence o acceptance de otro.
4. Cliente/executor no puede declarar tenant, verified, accepted, paid o committed.
5. Result, evidence y verification comparten contract ID/hash y fingerprint.
6. Critical UNKNOWN, capability escalation, stale spec/head o evidence mismatch fallan cerrados.
7. Machine verification, human acceptance y commit eligibility permanecen separados.
8. Head movement + StateCommit son atómicos o se demuestra un mecanismo equivalente.
9. Repair crea nueva lineage; no muta contrato/asset histórico.
10. Unit, security, migration, RLS negative, recovery y build pasan en CI.
11. Pruebas reales son separadas y nunca convierten skip en pass.
12. PROJECT_SPEC/architecture/threat model/current state quedan reconciliados.

## Decisión de scope

BUILD 001 no debe permanecer como build exclusivamente de repository governance. La gobernanza es un prerrequisito corto; el valor técnico es cerrar la integración que ya está diseñada pero fragmentada. Un build sólo documental pospondría el mayor riesgo real sin generar evidencia nueva.

