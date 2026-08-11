# Intent Lab v0.1.1

> **PROJECT SPEC / SOURCE OF ORIENTATION:** [PROJECT_SPEC.md](./PROJECT_SPEC.md)

Laboratorio interno para transformar lenguaje humano natural, coloquial o incompleto en contratos estructurados y ejecutables para otras inteligencias artificiales.

## Requisitos

- Node.js 20 o superior
- pnpm 11
- Un proyecto de Supabase para persistencia real
- Una OpenAI API key para el proveedor real y la evaluación ciega
- Una OpenAI image-capable project for the real Precision Edit smoke

## Ejecutar localmente

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Abre `http://localhost:3000`. Sin una OpenAI API key, el baseline heurístico sigue disponible para desarrollo, pero no se puede iniciar una sesión ciega. En producción, Supabase es obligatorio.

## Configurar Supabase

1. Crea o enlaza un proyecto Supabase.
2. Ejecuta las migraciones de `supabase/migrations` y el seed de `supabase/seed.sql` con Supabase CLI (`supabase db reset` en un entorno local enlazado, o `supabase db push` y después el seed en un proyecto remoto controlado).
3. Copia la URL y la service-role key a `.env.local`.
4. Mantén `SUPABASE_SERVICE_ROLE_KEY` únicamente en el servidor. Nunca uses el prefijo `NEXT_PUBLIC_` para esa clave.

Variables requeridas para persistencia:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Las variables publishable documentadas en `.env.example` quedan preparadas para futuras lecturas cliente con políticas RLS, pero Build 001 no las necesita.

## Proveedores de modelo

El baseline validado está congelado en el tag `intent-lab-heuristic-baseline-v0.1.0` y revisión `1d3353c`. No se modifica durante Build 001.1.

El proveedor real usa OpenAI Responses API con `gpt-5.6-luna`:

```text
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=...
OPENAI_INTENT_MODEL=gpt-5.6-luna
BLIND_EVAL_CANDIDATE_PROVIDER=openai
```

El adaptador usa el mismo JSON Schema generado desde `IntentContractSchema`, valida siempre con Zod y permite un único intento acotado de reparación. Un fallo de OpenAI se registra explícitamente; nunca activa fallback heurístico durante una evaluación.

## Evaluación ciega

1. Aplica las migraciones y el seed.
2. Configura `OPENAI_API_KEY` únicamente en el servidor.
3. Abre `/blind-eval`.
4. Usa el set marcado `DEMO` para validar el flujo o importa un JSON externo.
5. Antes de ver salidas, registra y bloquea el significado humano esperado, la próxima acción y las restricciones de preservación.
6. Califica `Output 1` y `Output 2` por separado; la segunda calificación no muestra la puntuación de la primera.
7. Con ambas calificaciones bloqueadas, compara las dos respuestas, registra una preferencia opcional y agrega una corrección cuando corresponda.

La identidad de A/B, telemetría, métricas y notas privadas se revelan solamente cuando toda la sesión está completa. Los sets son inmutables y se congelan con SHA-256. Cada sesión conserva su propia interpretación humana, incluso cuando otra sesión evalúa el mismo caso. Consulta [el formato de importación](./docs/BLIND_EVALUATION_FORMAT.md).

## Preservation & Verification v0.1

`/precision-edit-lab` ejecuta una única edición de imagen y conserva dos candidatos inmutables: `RAW_PROVIDER` y `PRESERVED`. El segundo se deriva localmente del primero; nunca se solicita una segunda generación para producirlo.

Configura únicamente en servidor:

```text
IMAGE_EDIT_PROVIDER=openai
OPENAI_IMAGE_EDIT_MODEL=gpt-image-2
OPENAI_API_KEY=...
```

Aplica `20260811120000_build_004_preservation_verification.sql` antes de ejecutar el laboratorio. La versión inicial acepta PNG de hasta 10 MB. Tras la verificación determinística, la preferencia `RAW/PRESERVED/TIE/BOTH_BAD` se registra por separado de la aprobación. Solo `APPROVE PRESERVED` puede crear la versión canónica siguiente.

Consulta [la arquitectura y semántica completa de BUILD 004](./docs/BUILD_004_PRESERVATION_VERIFICATION_V0_1.md).

## PRODUCT GATE 004 — Preservation Value Study

`/preservation-study` inscribe transacciones BUILD 004 existentes sin regenerarlas y ejecuta un protocolo append-only: expectativa humana, scoring ciego A/B aislado, preferencia pairwise, revelado y aceptación independiente de RAW/PRESERVED. La aceptación experimental nunca crea un commit canónico.

Aplica `20260811180000_product_gate_004_preservation_value_study.sql`. El plan inicial contiene 30 escenarios representativos con distribución 8 LOCAL_INDEPENDENT, 10 LOCAL_COUPLED, 8 STRUCTURAL y 4 GLOBAL/control.

Consulta [el protocolo, métricas e invariantes del Product Gate](./docs/PRODUCT_GATE_004_PRESERVATION_VALUE_STUDY_V0_1.md).

## Telemetría

Cada intent run conserva proveedor, modelo, versiones, instrucción de sistema, latencia total y del proveedor, tokens de entrada/caché/salida/razonamiento y total cuando OpenAI los informa. El costo es una estimación separada basada en una configuración versionada; nunca se inventa cuando faltan datos.

## Validar

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Rutas

- `/`: compilador, lectura visual, debug progresivo, feedback y Execution Contract.
- `/benchmarks`: fixtures, ejecución individual/conjunta y métricas deterministas.
- `/blind-eval`: importación y evaluación humana A/B con revelado diferido.
- `/precision-edit-lab`: comparación controlada RAW vs PRESERVED, métricas por zona, Creative Assertions y commit exclusivo de PRESERVED.
- `/preservation-study`: estudio ciego RAW vs PRESERVED, reanudable e inmutable, sin regeneración ni commit canónico.
- `/api/compile`, `/api/feedback`, `/api/execution-contract`, `/api/benchmarks`: frontera HTTP del monolito.
- `/api/blind-eval/*`: sets inmutables, sesiones, comparaciones y juicios.
- `/api/preservation-study`: casos, etapas bloqueadas, reporte agregado y media ciega opaca.

## Seguridad y datos

- Las llamadas a Supabase viven en repositories del servidor.
- Las tablas tienen RLS habilitado y no crean políticas para `anon` ni `authenticated`.
- La service-role key no se importa en componentes cliente.
- No se guardan cadenas de razonamiento; solo el conteo de reasoning tokens cuando el proveedor lo informa.
- `.env*` permanece ignorado salvo `.env.example`.

Consulta [Arquitectura](./docs/ARCHITECTURE.md) para los límites del sistema y [Limitaciones](./docs/LIMITATIONS.md) para el alcance real de Build 001.
