# Mapa de autoridad StateCommit

| Capacidad | Ruta actual | Clasificación |
|---|---|---|
| Crear el registro canónico | `commit_accepted_field_outcome` (`SECURITY DEFINER`) inserta tras OWNER, F1/F4, F5, F6 y evidencia válida | `CANONICAL_INSERT` |
| Crear desde repositorio Supabase | `SupabaseStateCommitRepository.create` usa INSERT; es una API heredada y no muta filas existentes | `CANONICAL_INSERT`/legacy insert-only |
| Leer | `findByTransactionId` y RPC de commit | `SUPPORTED_READ` |
| UPDATE directo | grants previos permitían service-role; desde F3 trigger BEFORE rechaza | `PROHIBITED_UPDATE` |
| DELETE directo | grants previos permitían service-role; desde F3 trigger BEFORE rechaza | `PROHIBITED_DELETE` |
| UPDATE/DELETE vía SECURITY DEFINER | no existe RPC de mutación; el trigger se ejecuta también dentro de funciones privilegiadas | `PROHIBITED_UPDATE`/`PROHIBITED_DELETE` |
| UPSERT | no hay operación productiva `upsert` sobre StateCommit; la unicidad por transacción no abre una ruta de conflicto | `PROHIBITED_UPDATE` |
| Borrado por padre | FK `state_commits_transaction_id_restrict_fkey` usa `ON DELETE RESTRICT` | `PROHIBITED_DELETE` |

Los grants/RLS siguen siendo defensa en profundidad. La garantía F3 no pretende resistir a un superusuario que deshabilite triggers o reescriba directamente el catálogo/base de datos.
