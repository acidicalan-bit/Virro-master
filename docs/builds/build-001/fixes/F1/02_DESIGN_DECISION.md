# BUILD 001-F1 - Design Decision

## Clasificacion de `candidate_assets`

| Categoria | Campos |
| --- | --- |
| IMMUTABLE CONTENT | `storage_key`, `mime_type`, `width`, `height`, `byte_size`, `sha256`, `roi`, `instruction`, `provider`, `model`, `cost_usd`, `candidate_type` |
| IMMUTABLE LINEAGE | `owner_tenant_id`, `transaction_id`, `execution_run_id`, `source_version_id`, `raw_candidate_id`, `preservation_run_id` |
| MUTABLE WORKFLOW STATE | `committed` fue modelado originalmente como flag mutable legacy |
| HEAD POINTER / CURRENT STATE | ninguno; vive en `assets.current_version_id` |
| DERIVED METADATA | `committed` es derivable para canonical desde StateCommit/head/transaction; `created_at` es metadata inmutable |

La fila mezcla un flag legacy mutable con contenido y lineage que BUILD 001 protege como un artefacto inmutable. El kernel ya tiene una representacion separada y mas fuerte del estado canonico.

## Opciones evaluadas

### Opcion A

Mantener candidate totalmente inmutable y mover la transicion a otra relacion. Es correcta conceptualmente, pero no hace falta crear una relacion: el kernel ya posee version, head, StateCommit y transaction status.

### Opcion B

Permitir solo `committed: false -> true` en el trigger. Rechazada: agrega una excepcion privilegiada a una fila de artefacto, mantiene dos fuentes de verdad y aumenta la superficie de mutacion sin que el flag participe en la autoridad del commit.

### Opcion C - Seleccionada

Usar exclusivamente el mecanismo existente: `asset_versions` inmutable + `assets.current_version_id` + `state_commits` + transaction status. Retirar del RPC la escritura redundante de `candidate_assets.committed`.

## Consecuencias

- candidate canonico permanece totalmente inmutable;
- no se crea un segundo modelo de estado;
- no cambian privilegios ni triggers;
- un commit canonico se identifica por StateCommit/head/transaction, no por el flag legacy;
- legacy puede conservar su comportamiento actual fuera del alcance F1.

Esta decision se formaliza tambien en `ADR-004_CANONICAL_CANDIDATE_IMMUTABILITY.md`.
