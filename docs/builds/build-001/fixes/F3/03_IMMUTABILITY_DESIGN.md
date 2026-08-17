# Diseño de inmutabilidad

La migración `20260817100000_build_001_f3_state_commit_immutability.sql` crea `enforce_state_commit_immutable()` y el trigger `state_commits_immutable_guard`:

```text
BEFORE UPDATE OR DELETE ON public.state_commits
→ TRUST_STATE_COMMIT_IMMUTABLE (42501)
```

El trigger corre por debajo de las convenciones de repositorio y no contiene una rama `service_role`. La inserción no queda cubierta por el trigger, por lo que el RPC canónico continúa creando el registro y el retry existente continúa devolviendo `idempotent: true`.

La FK histórica CASCADE se reemplaza por `state_commits_transaction_id_restrict_fkey` con `ON DELETE RESTRICT`. Las referencias a asset/version ya eran no-cascade. No se añadió firma, infraestructura ni modelo de event sourcing.
