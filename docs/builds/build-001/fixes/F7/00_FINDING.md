# BUILD 001-F7 - Real-boundary assurance and evidence classification

## Hallazgo validado

BUILD 001 podía presentar una baseline determinista saludable aunque el control SQL de producción estuviera roto. La suite reportó 325 PASS mientras el success path del RPC canónico abortaba con `TRUST_STATE_COMMIT_IMMUTABLE`.

La contradicción era posible porque el reporte mezclaba evidencias que ejercían fronteras distintas:

- inspección textual de migraciones;
- `TrustHarness` implementado dentro de la prueba;
- servicios con repositorios sustituidos;
- PostgreSQL/PGlite real, pero condicionado por una variable y por un paquete externo;
- Supabase remoto omitido por entorno.

La etiqueta de directorio `security` o `integration` se trataba como si describiera la fuerza de la evidencia. No la describe.

## Causa raíz

No existía un contrato ejecutable que uniera cada claim con:

- la frontera realmente ejercida;
- el nivel mínimo requerido;
- el nivel realmente obtenido;
- el resultado y las limitaciones;
- build, spec y SHA exactos;
- executor, verifier e independencia;
- la razón visible de cualquier skip.

Por eso un PASS E1 podía aparecer junto a una afirmación que requería E3 o E4 sin que el sistema produjera `NOT_PROVEN`.

## Patrón decisivo F1

Antes de F1:

| Evidencia | Nivel | Resultado |
|---|---|---|
| TrustHarness atomicidad/idempotencia | E1_MODEL | PASS |
| RPC y migraciones sobre PostgreSQL/PGlite | E3_LOCAL_REAL_BOUNDARY | FAIL |

Después de F1:

| Evidencia | Nivel | Resultado |
|---|---|---|
| TrustHarness | E1_MODEL | PASS |
| RPC y migraciones sobre PostgreSQL/PGlite | E3_LOCAL_REAL_BOUNDARY | PASS |

No hay contradicción cuando el nivel se conserva. El primer estado es `FAILED` para un claim E3; el segundo es `PROVEN`.

## Alcance

F7 corrige la arquitectura de assurance y reporting. No modifica migraciones, RLS, Storage, Auth, RPC de producto ni controles F3-F6. Tampoco ejecuta BUILD 001-R.
