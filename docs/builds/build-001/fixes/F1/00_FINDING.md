# BUILD 001-F1 - Finding

## Baseline

`7cc0e3b9951f276dbaf4f74f73662e430b9960c9`

## Finding

`commit_accepted_field_outcome(uuid)` crea la nueva `asset_version`, mueve `assets.current_version_id`, inserta `state_commits` y despues ejecuta:

```sql
update public.candidate_assets
set committed = true
where id = candidate.id and owner_tenant_id = outcome.owner_tenant_id;
```

La fila canonica tiene `owner_tenant_id` no NULL. Su trigger AFTER UPDATE `candidate_assets_trust_lineage_guard` invoca `enforce_execution_reference_lineage()`, que rechaza incondicionalmente todo UPDATE canonico con `TRUST_STATE_COMMIT_IMMUTABLE`. Al no existir exception handler, PostgreSQL revierte la llamada completa.

## Severidad

`CRITICAL`: el success path canonico es imposible.

## Evidencia primaria

- migracion BUILD 001, lineas 93-108: prohibicion de UPDATE;
- lineas 177-179: trigger sobre `candidate_assets`;
- lineas 805-841: transicion canonica y UPDATE incompatible;
- reproduccion PostgreSQL 18/PGlite: la llamada real al RPC termina con `TRUST_STATE_COMMIT_IMMUTABLE`.

## Alcance F1

Corregir exclusivamente esta contradiccion sin ampliar privilegios, relajar la inmutabilidad del candidato ni cambiar los controles de autoridad/evidencia/acceptance.
