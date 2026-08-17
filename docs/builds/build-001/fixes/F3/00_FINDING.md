# BUILD 001-F3: hallazgo

**Outcome:** FIXED

## Baseline

- Baseline SHA: `de1d36fbebee7d0d3b04b505ceef12e3585aafa2`
- Rama: `codex/build001-f3`
- Worktree independiente, limpio antes de editar.
- Ancestro directo verificado: `6454b7a30ada30800b2836298b2b04f8f25cf324`.

## Causa raíz

`state_commits` concedía `UPDATE` y `DELETE` a `service_role`, no tenía una protección BEFORE para esas operaciones y enlazaba `transaction_id` con `ON DELETE CASCADE`. Un actor privilegiado podía reescribir o borrar historia después de un commit válido; RLS no era suficiente porque service-role puede omitirlo.

La reproducción previa se ejecutó en PGlite, el límite SQL local repository-supported del proyecto: sin la migración F3 se sembró un StateCommit válido y `service_role` consiguió actualizarlo y eliminarlo.
