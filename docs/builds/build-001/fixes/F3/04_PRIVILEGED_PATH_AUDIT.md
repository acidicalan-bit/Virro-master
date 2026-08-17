# Auditoría de rutas privilegiadas

## Resultado

- `INSERT`: solo la ruta canónica F1 produce el commit en la transacción RPC; las APIs heredadas de repositorio solo exponen creación y no mutación posterior.
- `UPDATE`: no hay `update()` de StateCommit en repositorio, no hay RPC de actualización y el trigger bloquea SQL directo.
- `DELETE`: no hay `delete()` de StateCommit, no hay cleanup productivo y el trigger bloquea SQL directo.
- `UPSERT`: no se encontró `upsert` sobre StateCommit.
- `SECURITY DEFINER`: el RPC canónico inserta; no expone UPDATE/DELETE. El trigger permanece activo dentro de esa función.
- `service_role`: conserva grants históricos necesarios para el camino de inserción/lectura, pero no recibe bypass de inmutabilidad.

Los servicios heredados `OutcomeTransactionService` y `PreservationVerificationService` construyen commits mediante INSERT después de sus propias comprobaciones. F3 no introduce una autoridad de creación nueva ni usa esos caminos para modificar una fila existente.

## Cascada

El parent delete quedó bloqueado por la nueva FK RESTRICT. La prueba SQL también confirmó que una fila StateCommit permanece tras un intento de borrar el transaction padre.
