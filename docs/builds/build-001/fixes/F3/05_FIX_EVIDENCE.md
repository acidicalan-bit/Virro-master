# Evidencia de corrección

## Límite real ejercitado

PGlite (`@electric-sql/pglite`) ejecutó las migraciones y SQL PostgreSQL del repositorio en un fixture desechable. No hay PostgreSQL nativo ni Supabase remoto configurado en este entorno; por tanto esto es evidencia local E3/narrow-boundary, no E4 remoto.

## Matriz post-fix

- INSERT canónico: PASS.
- Retry idempotente: PASS (`idempotent: true`).
- UPDATE con rol `authenticated`: DENIED por permisos.
- DELETE con rol `authenticated`: DENIED por permisos.
- UPDATE de owner, transaction, asset, new/previous version y timestamp con `service_role`: DENIED por `TRUST_STATE_COMMIT_IMMUTABLE`.
- DELETE con `service_role`: DENIED por `TRUST_STATE_COMMIT_IMMUTABLE`.
- Fila tras intentos fallidos: idéntica byte/materialmente.
- Borrado del padre: bloqueado; FK reporta RESTRICT y la fila permanece.
- Rollback de transición: PASS; no queda versión, head ni StateCommit parcial.

Regresión focal F3/F1 SQL: **15/15 PASS**.
