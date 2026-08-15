# BUILD 001-F7 - Claim satisfaction rules

## Regla determinista

Para cada claim se filtran receipts por coincidencia exacta de:

```text
buildId + specId + criterionId
```

Luego se evalúa sin score:

1. Un `FAIL` coincidente produce `FAILED`, sin importar el tier.
2. Un `PASS` con nivel actual igual o superior al requerido produce `PROVEN`.
3. Un `PASS` por debajo del requerido produce `NOT_PROVEN`.
4. Sin PASS suficiente, `SKIPPED_ENVIRONMENT` produce `SKIPPED`.
5. `UNKNOWN` o `NOT_RUN` producen `UNKNOWN`.
6. Sin evidencia coincidente, el claim es `NOT_PROVEN`.

Un receipt sólo califica si también declara el mismo `requiredEvidenceLevel` del claim. Esto evita que evidencia autoclasificada con un requisito menor rebaje silenciosamente el control.

## Ejemplos

| Claim | Required | Evidencia | Resultado |
|---|---|---|---|
| Trigger de inmutabilidad | E3 | TrustHarness E1 PASS | NOT_PROVEN |
| RLS desplegado A/B | E4 | PGlite E3 PASS | NOT_PROVEN |
| Atomicidad local RPC | E3 | PGlite E3 PASS | PROVEN |
| Atomicidad local RPC | E3 | staging E4 PASS | PROVEN |
| RPC | E4 | E0 FAIL documentado | FAILED |
| Storage remoto | E4 | test omitido por credenciales | SKIPPED |
| CDN desplegado | E4 | no ejecutado | UNKNOWN |

## Output preservado

Cada evaluación conserva:

- nivel requerido;
- mayor nivel PASS observado;
- IDs de evidencia considerada;
- limitations y skipped reasons;
- receipts completos, incluido verifier e independence.

`allCurrentCriteriaProven` sólo es true si todos los criterios actuales son `PROVEN`. Los resultados históricos se cuentan por separado para que el fallo pre-F1 permanezca visible sin presentarse como fallo del candidato actual. No existe promedio ni estado agregado que oculte gaps.

## Evidencia equivocada

Un PASS de otro criterion, build o spec no entra al conjunto considerado. La suite F7 contiene negativos explícitos para los tres casos.
