# BUILD 001-F7 - Claim satisfaction rules

## Regla determinista

Para cada claim se filtran receipts por coincidencia exacta de:

```text
buildId + specId + criterionId
```

R1 exige además compatibilidad exacta de:

```text
criterionVersion + criterionDefinitionHash
subjectId + controlId + boundaryId
accepted environmentClass
minimumEvidenceLevel
independenceRequirement
```

Luego se evalúa sin score:

1. Un `FAIL` semánticamente compatible produce `FAILED`.
2. Un `PASS` semánticamente compatible produce `PROVEN`.
3. Un `PASS` o `FAIL` incompatible produce `NOT_PROVEN`; no ejerció el control requerido.
4. Sin PASS suficiente, `SKIPPED_ENVIRONMENT` produce `SKIPPED`.
5. `UNKNOWN` o `NOT_RUN` producen `UNKNOWN`.
6. Sin evidencia coincidente, el claim es `NOT_PROVEN`.

El nivel es una condición necesaria, nunca suficiente. Un receipt no declara su propio requisito: queda ligado al hash de la definición autoritativa del criterio.

## Ejemplos

| Claim | Required | Evidencia | Resultado |
|---|---|---|---|
| Trigger de inmutabilidad | E3 | TrustHarness E1 PASS | NOT_PROVEN |
| RLS desplegado A/B | E4 | PGlite E3 PASS | NOT_PROVEN |
| Atomicidad local RPC | E3 | PGlite E3 PASS | PROVEN |
| Atomicidad local RPC | E3 | workflow E5 ajeno | NOT_PROVEN |
| Atomicidad local RPC | E3 | entorno admitido y misma frontera/control E5 | PROVEN |
| RPC | E4 | E0 FAIL documentado | FAILED |
| Storage remoto | E4 | test omitido por credenciales | SKIPPED |
| CDN desplegado | E4 | no ejecutado | UNKNOWN |

## Output preservado

Cada evaluación conserva:

- nivel requerido;
- mayor nivel PASS observado;
- IDs de evidencia considerada;
- limitations y skipped reasons;
- receipts completos, incluidos participantes tipados; desde R1.1 la independencia se deriva y la declaracion no otorga autoridad.

`allCurrentCriteriaProven` sólo es true si todos los criterios actuales son `PROVEN`. Los resultados históricos se cuentan por separado para que el fallo pre-F1 permanezca visible sin presentarse como fallo del candidato actual. No existe promedio ni estado agregado que oculte gaps.

## Evidencia equivocada

Un PASS de otro criterion, build o spec no entra al conjunto considerado. Conservar el ID de criterio tampoco basta: cambio de versión/hash, sujeto, control, frontera o entorno invalida el receipt. La suite F7-R1 contiene negativos explícitos para estas sustituciones.
