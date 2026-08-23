# Provider Lock-in Register

This is an evidence-backed inventory, not a claim that replacement is already
implemented. Extraction means replacing the listed adapter while preserving
the application ports and domain semantics.

| Provider surface | Location | Purpose | Migration target | Extraction boundary | Current replacement port | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PostgreSQL schema/migrations | `supabase/migrations/` | Canonical persistence, constraints, triggers | Managed PostgreSQL | Migration runner and SQL compatibility review | Repository/RPC ports | PARTIALLY_PROVEN |
| RLS | `supabase/migrations/` | Tenant isolation at the database boundary | PostgreSQL RLS or equivalent policy layer | Policy and role contract | Supabase repository adapters | PARTIALLY_PROVEN |
| SECURITY DEFINER functions | `supabase/migrations/` | Privileged atomic boundaries | PostgreSQL functions or service boundary | RPC contract and grants | Persistence ports | PARTIALLY_PROVEN |
| Supabase Auth | `src/infrastructure/supabase/`, `src/infrastructure/persistence/auth/` | Session and identity resolution | Replaceable OIDC/Auth adapter | `AuthorityContext` and tenant authority repository | `authority-repositories.ts` | PARTIALLY_PROVEN |
| Supabase SSR cookies | `src/infrastructure/supabase/server-client.ts`, `proxy.ts` | Browser/server session transport | Framework-neutral session adapter | Server composition boundary | Server-only adapter | NOT_PROVEN |
| Supabase Storage | `src/infrastructure/storage/supabase-media-object-store.ts` | Media object persistence | S3-compatible object storage | `MediaObjectStore` port | `media-object-store-port.ts` | PARTIALLY_PROVEN |
| Supabase JS client | `src/infrastructure/**`, approved server adapters | Database, Auth, Storage and RPC calls | PostgreSQL/Auth/Object adapters | Infrastructure modules | Application ports | PARTIALLY_PROVEN |
| Supabase RPC | `src/infrastructure/persistence/**`, migrations | Server-owned writes and authority commits | SQL/function or service API | RPC repository adapters | Application repository ports | PARTIALLY_PROVEN |
| Provider environment variables | `.env.example`, `src/infrastructure/supabase/config.ts` | Runtime/build configuration | Deployment secret/config store | Environment contract | Configuration functions | PARTIALLY_PROVEN |
| OpenAI SDK/API | `src/infrastructure/models/`, `src/infrastructure/executors/` | Intent and image provider calls | Another model/provider adapter | `IntentModel` and executor ports | Application ports | PARTIALLY_PROVEN |
| Vercel runtime | `next.config.ts` build adapter and deployment metadata only | Hosting/build target | OCI process on another platform | Next native build on Vercel; Next standalone server elsewhere | None in domain/application | PROVEN |

The Vercel row is `PROVEN` only for the absence of a Vercel dependency in the
domain/application core; it does not prove full runtime parity.

PORTABILITY-000-COMPAT-001 keeps that boundary explicit. The framework-only
`next.config.ts` adapter reads the platform-provided `VERCEL=1` build marker:
Vercel uses native Next output, while non-Vercel builds retain `output:
"standalone"` for the OCI runtime. `VERCEL` is not application configuration,
is not added to the environment contract, and is not used by domain or
application code.

Known baseline provider debt: `src/application/outcome/media/image-edit-service.ts`
contains a concrete application-layer Supabase Storage coupling through an
existing `SupabaseClient` path. It is frozen baseline debt, unchanged by
PORTABILITY-000, and is the only allowlisted application Supabase dependency.
New application-level Supabase imports fail `pnpm portability:check`.
