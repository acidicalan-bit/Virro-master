# Arquitectura — monolito modular actual

El repositorio conserva Intent Lab Build 001.1 como flujo histórico y ejecutable dentro de un monolito modular en Next.js App Router. El alcance actual también incluye el Outcome Transaction Kernel, Precision Edit, Preservation & Verification y la fundación Spec-Anchored. `PROJECT_SPEC.md` es la autoridad transversal; los documentos de cada Build siguen siendo evidencia de su versión congelada.

```text
UI / Route Handlers
        ↓
Application services
        ↓
Domain (Intent Contract, pragmática, benchmark scoring)
        ↓
Ports (IntentModel, repositories)
        ↓
Adapters (OpenAI Responses, baseline heurístico, Supabase, memoria)
```

## Límites

- `src/domain`: reglas puras y schemas Zod; no conoce Next.js, Supabase ni SDKs de modelos.
- `src/application`: orquesta compilación, persistencia, feedback y evaluación mediante interfaces.
- `src/infrastructure/models`: adaptadores reemplazables de IA.
- `src/infrastructure/persistence`: mappers y repositories. Supabase no aparece en componentes visuales.
- `src/ui`: experiencia cliente; consume solamente endpoints internos.
- `app/api`: validación de frontera y traducción a respuestas HTTP.

## Flujo de compilación

1. La frontera valida `rawInput` y `context`.
2. Human Pragmatics produce señales contextuales mínimas.
3. `IntentModel` genera un resultado estructurado.
4. Zod valida el Intent Contract completo.
5. Solo un contrato válido se persiste como `intent_run`.
6. La UI recibe contrato, ID del run y metadatos no sensibles.
7. El feedback se guarda por medio de `IntentFeedbackRepository`.

OpenAI y el baseline implementan el mismo `IntentModel`. La instrucción OpenAI vive en un módulo versionado independiente y el schema estructurado se deriva directamente del contrato Zod del dominio.

## Arquitectura canónica objetivo

```text
Outcome SKU → Outcome Blueprint → Signal Sufficiency → immutable Task Spec
            → Execution Policy/Fingerprint → Execution → Machine Evidence + criterion receipts
            → Machine Same-Spec → Human Review → Outcome Acceptance
            → Commit Eligibility → Delivery/Learning
```

La única prueba estrecha de estos primitives continúa siendo Precision Edit. La
verificación existente conserva sus assertions agregadas y ahora puede añadir
`verification_criterion_evidence` como modelo hijo durable. Cada receipt se
vincula a tenant, transacción, execution run, verification run, Task Spec
ID/hash, artefactos y verificador/version/policy. Machine Same-Spec exige set
equality entre criterios críticos machine-verificables y receipts válidos; el
histórico `same_spec_status` sigue siendo compatibilidad y no autoridad. El
commit canónico sigue fuera de Field Beta.

La capa Marketplace es provider-neutral y no ejecuta código de sellers. Los contratos mínimos para categoría, buyer audience, Project de planeación, Canon, relaciones y superficies cliente reducen costo de migración futura sin crear marketplace, recommendations, graph database, pagos o BUILD 006.

## Web y Mobile

Mobile es una superficie de producto first-class, no una autorización de app nativa. El objetivo M0 es web responsive/mobile-first sobre los mismos contratos y estado server-side. El cliente solicita configuración, revisión y delivery mediante identificadores versionados e idempotentes; nunca decide pago, verificación, evidencia, tenant o commit canónico.

## Persistencia y RLS

Supabase PostgreSQL es la fuente de verdad configurada. Todas las tablas tienen RLS habilitado y no son accesibles para roles públicos. Build 001.1 escribe desde el servidor con service role. Al añadir Auth deberán crearse políticas por propietario/tenant y reemplazar las escrituras elevadas donde corresponda.

El modo memoria existe solamente en desarrollo y test para permitir una instalación sin secretos. Producción falla de forma explícita si Supabase no está configurado.

## Evaluación

Las métricas se basan en coincidencias deterministas declaradas por cada fixture: modo exacto, conceptos esperados, preguntas prohibidas e interpretaciones prohibidas. Una ausencia de concepto activa `manualReview`; no se presenta como precisión semántica científica.

Métricas futuras como Intent Accuracy, Contextual Meaning Accuracy y Human Correction Rate requieren etiquetas humanas suficientes antes de ser útiles.

## Evaluación ciega

```text
set externo inmutable
        ↓
sesión con versiones congeladas
        ↓
baseline + OpenAI en paralelo
        ↓
mapeo A/B aleatorio persistido solo en servidor
        ↓
preferencia + ratings + corrección humana
        ↓
revelado al completar todos los casos
```

Las notas privadas y el comportamiento esperado no cruzan la frontera HTTP antes del cierre. Cada salida se enlaza a un `intent_run`; un fallo enlaza a `intent_model_failures` y no se sustituye por otro proveedor.

El contenido importado se identifica mediante SHA-256 y no existen operaciones de actualización. Una sesión compara su configuración actual contra las versiones congeladas antes de ejecutar cada caso para impedir mezclas de compiler, modelo o instrucción.
