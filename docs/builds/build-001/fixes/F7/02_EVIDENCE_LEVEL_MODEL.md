# BUILD 001-F7 - Canonical evidence levels

## Jerarquía

| Nivel | Frontera ejercida | Ejemplos | No implica |
|---|---|---|---|
| `E0_STATIC` | Inspección de source/schema/config | grep, AST, texto SQL, config | Ejecución ni semántica runtime |
| `E1_MODEL` | Modelo, harness, fake o mock | TrustHarness, repositorios in-memory | Aplicación real ni infraestructura |
| `E2_APPLICATION` | Componente, handler o servicio real | handler Next exportado, servicio con puerto sustituido | DB/Storage/Auth externos reales |
| `E3_LOCAL_REAL_BOUNDARY` | Infraestructura relevante real ejecutada localmente | PostgreSQL/PGlite con migraciones, filesystem real | Plataforma remota o despliegue |
| `E4_REMOTE_STAGING` | Plataforma externa real y aislada | Supabase Auth/RLS/RPC/Storage, service-role, concurrency | Flujo desplegado completo de producto |
| `E5_DEPLOYED_E2E` | Workflow soportado integrado en condiciones production-equivalent/safe | ruta, Auth, DB, Storage y aceptación de extremo a extremo | No es requerido para todo claim |

Desde R1, el orden sólo aplica como restricción mínima después de validar identidad semántica. No es un confidence score, no combina dimensiones mediante promedio y nunca permite que E5 sustituya una frontera o control E4 distinto. Un entorno superior sólo es compatible cuando el criterio lo admite explícitamente y el receipt conserva exactamente sujeto, control y frontera requeridos.

## Regla de asignación

Se etiqueta la frontera que realmente recibió la operación que prueba el control:

- comprobar un fragmento `CREATE POLICY` es E0;
- negar una lectura en TrustHarness es E1;
- invocar un handler real con un Supabase mock es E2;
- aplicar migraciones y ejecutar el RPC sobre PostgreSQL es E3;
- usar JWT A/B contra RLS desplegado es E4;
- completar el workflow soportado desplegado es E5.

Un test puede tocar varias capas. Su receipt debe nombrar el límite concreto del claim, no el componente más prestigioso presente en el proceso.

## Development Evidence Receipt

`src/assurance/development-evidence.mts` define un recibo separado de `src/domain/outcome/evidence-receipt.ts`. El primero gobierna evidencia de desarrollo; el segundo sigue siendo evidencia runtime del producto.

Campos obligatorios:

- `evidenceId`, `buildId`, `specId`, `criterionId`;
- `criterionVersion`, `criterionDefinitionHash`;
- `subjectId`, `controlId`, `boundaryId`, `environmentClass`;
- `subject`, `control`, `boundaryTested`, `environment` como metadata humana;
- `actualEvidenceLevel`;
- display `executor`/`verifier`, non-authoritative `declaredIndependence`, and typed `participantBindings` (R1.1);
- `provenance`, `commandTestIdentifier`;
- `result`, `limitations`, `skippedReason`, `artifactRefs`;
- `baselineSha`, `resultSha`, `timestamp`.

Un skip sin razón es schema-invalid. Build/spec/criterion forman la identidad inicial; versión/hash, sujeto, control, frontera, entorno, nivel e independencia determinan compatibilidad. Los detalles vigentes están en `R1/02_SEMANTIC_MATCH_MODEL.md`.

## TrustHarness

TrustHarness permanece por velocidad, cobertura, property exploration y fault injection. Su máximo probatorio es `E1_MODEL`; nunca satisface por sí solo E3 o E4.
