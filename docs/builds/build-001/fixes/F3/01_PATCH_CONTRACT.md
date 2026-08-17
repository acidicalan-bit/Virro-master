# Contrato del parche F3

1. Mantener la inserción del StateCommit dentro de la transacción RPC canónica F1.
2. Rechazar UPDATE y DELETE en la base de datos para todos los roles soportados, incluido service-role y funciones SECURITY DEFINER.
3. Rechazar el borrado indirecto por cascada desde `outcome_transactions`.
4. Usar el error determinista `TRUST_STATE_COMMIT_IMMUTABLE`.
5. No añadir excepciones para service-role, no editar migraciones históricas y no cambiar F1/F4/F5/F6/F7.
6. Una corrección material debe crear nueva historia, no editar el registro existente.
