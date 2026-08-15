# BUILD 001-F7 - Reverification input

## Objetivo adversarial

Intentar que el sistema produzca `PROVEN` usando evidencia de una frontera inferior, equivocada, omitida o no ejecutada.

## Baseline esperado

El result commit debe descender directamente de `33556d8dcb4f1542cb80706f10068aa77fef1006` sin cambios de producto ajenos a F7.

## Pruebas requeridas

1. E1 PASS no satisface claim E3.
2. E3 PASS no satisface claim E4.
3. Igual o mayor nivel PASS sí satisface.
4. FAIL domina cualquier tier.
5. SKIPPED_ENVIRONMENT nunca es PASS y exige razón.
6. UNKNOWN y NOT_RUN nunca son PASS.
7. Otro criterion no satisface.
8. Otro build o spec no satisface.
9. Verifier/independence sobreviven al output.
10. Limitations y skipped reasons permanecen visibles.
11. Un manifest stale hace fallar `pnpm assurance:check`.
12. `allCurrentCriteriaProven` es false con gaps E4 y los fallos históricos se reportan aparte.

## Carriles

```text
pnpm install --frozen-lockfile
pnpm assurance:check
pnpm assurance:environment
pnpm test:assurance
pnpm test:model
pnpm test:application
pnpm test:sql
pnpm test:security
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm test:staging` debe retornar preflight `NOT_PROVEN` sin el acknowledgement y credenciales staging. No usar producción para reverificar.

## Ataques de calidad

- Renombrar un test mock a integration no debe elevar su receipt.
- Cambiar sólo `requiredEvidenceLevel` del receipt no debe rebajar el claim.
- Un PASS de otro SHA puede permanecer como provenance histórica, pero no debe describirse como ejecución del result SHA.
- Quitar skipped reason debe invalidar schema.
- Editar source sin regenerar JSON debe fallar freshness.
- Ejecutar sólo `test:model` no debe permitir un resumen general de seguridad PASS.

## Criterio de cierre F7

F7 puede verificarse si la clasificación y la regla son ejecutables, F1 E3 es obligatoria, los skips permanecen visibles y los reportes no colapsan gaps remotos. Esto no declara BUILD 001 PASS ni resuelve F3-F6.
