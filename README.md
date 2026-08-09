# Intent Lab v0.1

Laboratorio interno para transformar lenguaje humano natural, coloquial o incompleto en contratos estructurados y ejecutables para otras inteligencias artificiales.

## Requisitos

- Node.js 20 o superior
- pnpm 11
- Un proyecto de Supabase para persistencia real
- Opcional: un proveedor compatible con `chat/completions` y structured output

## Ejecutar localmente

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Abre `http://localhost:3000`. Sin credenciales, el entorno de desarrollo usa un compilador heurístico y repositorios en memoria de forma explícita. En producción, Supabase es obligatorio.

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

## Proveedor de modelo

El valor por defecto es `LLM_PROVIDER=heuristic`, útil para desarrollo reproducible. Para un proveedor remoto:

```text
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=...
LLM_MODEL=...
```

El adaptador solicita salida limitada por JSON Schema, valida siempre con Zod y realiza un intento de reparación antes de rechazar una salida inválida.

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
- `/api/compile`, `/api/feedback`, `/api/execution-contract`, `/api/benchmarks`: frontera HTTP del monolito.

## Seguridad y datos

- Las llamadas a Supabase viven en repositories del servidor.
- Las tablas tienen RLS habilitado y no crean políticas para `anon` ni `authenticated`.
- La service-role key no se importa en componentes cliente.
- No se guardan cadenas de razonamiento; solo contratos validados, feedback y metadatos operativos.
- `.env*` permanece ignorado salvo `.env.example`.

Consulta [Arquitectura](./docs/ARCHITECTURE.md) para los límites del sistema y [Limitaciones](./docs/LIMITATIONS.md) para el alcance real de Build 001.
