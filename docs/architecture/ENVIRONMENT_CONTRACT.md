# Environment Contract

This contract records variable names only. Values are runtime deployment
configuration and are never committed.

| Name | Classification | Portability note |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `BUILD_TIME_PUBLIC` | Embedded by Next when referenced by browser code. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `BUILD_TIME_PUBLIC` | Public client key; embedded by Next. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `BUILD_TIME_PUBLIC` | Legacy public compatibility name; not present in the preferred template. |
| `SUPABASE_URL` | `RUNTIME_SERVER_CONFIG` | Server-side compatibility configuration. |
| `SUPABASE_ANON_KEY` | `RUNTIME_PUBLIC` | Legacy public compatibility configuration. |
| `SUPABASE_SECRET_KEY` | `RUNTIME_SECRET` | Runtime-injected privileged credential. |
| `SUPABASE_SERVICE_ROLE_KEY` | `RUNTIME_SECRET` | Legacy runtime-injected privileged credential. |
| `LLM_PROVIDER` | `RUNTIME_SERVER_CONFIG` | Provider selection; no fallback is implied. |
| `LLM_BASE_URL` | `RUNTIME_SERVER_CONFIG` | Server-side provider endpoint. |
| `OPENAI_API_KEY` | `RUNTIME_SECRET` | Runtime-injected; never a `NEXT_PUBLIC_*` variable. |
| `OPENAI_INTENT_MODEL` | `RUNTIME_SERVER_CONFIG` | Server-side model selection. |
| `LLM_MODEL_VERSION` | `RUNTIME_SERVER_CONFIG` | Server-side metadata. |
| `IMAGE_EDIT_PROVIDER` | `RUNTIME_SERVER_CONFIG` | Server-side provider selection. |
| `OPENAI_IMAGE_EDIT_MODEL` | `RUNTIME_SERVER_CONFIG` | Server-side model selection. |
| `BLIND_EVAL_CANDIDATE_PROVIDER` | `RUNTIME_SERVER_CONFIG` | Server-side evaluation configuration. |
| `INTENT_COMPILER_VERSION` | `RUNTIME_SERVER_CONFIG` | Server-side compiler metadata. |
| `FIELD_BETA_CONTROLLED_EXECUTOR` | `TEST_ONLY` | Controlled test harness switch. |
| `FIELD_BETA_INTERNAL_ENABLED` | `RUNTIME_SERVER_CONFIG` | Internal feature gate, disabled by default. |
| `FIELD_EVAL_SAMPLING_RATE` | `RUNTIME_SERVER_CONFIG` | Internal sampling configuration. |
| `INTERNAL_LEGACY_ROUTES_ENABLED` | `RUNTIME_SERVER_CONFIG` | Internal migration switch, disabled by default. |

`NEXT_PUBLIC_*` values are build-time coupled. A single OCI image can therefore
not yet be promoted unchanged between environments when those public values
differ: `SINGLE_IMAGE_MULTI_ENV=NOT_YET_PROVEN`.
