# Intent Lab v0.1.1

Laboratorio interno para transformar lenguaje humano natural, coloquial o incompleto en contratos estructurados y ejecutables para otras inteligencias artificiales.

## Requisitos

- Node.js 20 o superior
- pnpm 11
- Un proyecto de Supabase para persistencia real
- Una OpenAI API key para el proveedor real y la evaluación ciega

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
5. Completa preferencia, puntuaciones A/B y, cuando corresponda, “¿Qué habrías querido decir?”.

La identidad de A/B, telemetría y notas privadas se revelan solamente cuando toda la sesión está completa. Los sets son inmutables y se congelan con SHA-256. Consulta [el formato de importación](./docs/BLIND_EVALUATION_FORMAT.md).

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
- `/api/compile`, `/api/feedback`, `/api/execution-contract`, `/api/benchmarks`: frontera HTTP del monolito.
- `/api/blind-eval/*`: sets inmutables, sesiones, comparaciones y juicios.

## Seguridad y datos

- Las llamadas a Supabase viven en repositories del servidor.
- Las tablas tienen RLS habilitado y no crean políticas para `anon` ni `authenticated`.
- La service-role key no se importa en componentes cliente.
- No se guardan cadenas de razonamiento; solo el conteo de reasoning tokens cuando el proveedor lo informa.
- `.env*` permanece ignorado salvo `.env.example`.

Consulta [Arquitectura](./docs/ARCHITECTURE.md) para los límites del sistema y [Limitaciones](./docs/LIMITATIONS.md) para el alcance real de Build 001.
