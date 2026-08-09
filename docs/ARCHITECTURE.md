# Arquitectura — Build 001

Intent Lab es un monolito modular en Next.js App Router.

```text
UI / Route Handlers
        ↓
Application services
        ↓
Domain (Intent Contract, pragmática, benchmark scoring)
        ↓
Ports (IntentModel, repositories)
        ↓
Adapters (HTTP structured model, heurístico, Supabase, memoria)
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

## Persistencia y RLS

Supabase PostgreSQL es la fuente de verdad configurada. Las cuatro tablas tienen RLS habilitado y no son accesibles para roles públicos. Build 001 escribe desde el servidor con service role. Al añadir Auth deberán crearse políticas por propietario/tenant y reemplazar las escrituras elevadas donde corresponda.

El modo memoria existe solamente en desarrollo y test para permitir una instalación sin secretos. Producción falla de forma explícita si Supabase no está configurado.

## Evaluación

Las métricas se basan en coincidencias deterministas declaradas por cada fixture: modo exacto, conceptos esperados, preguntas prohibidas e interpretaciones prohibidas. Una ausencia de concepto activa `manualReview`; no se presenta como precisión semántica científica.

Métricas futuras como Intent Accuracy, Contextual Meaning Accuracy y Human Correction Rate requieren etiquetas humanas suficientes antes de ser útiles.
