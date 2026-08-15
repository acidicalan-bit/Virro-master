# BUILD 001-F7 - Fix evidence

## Baseline

- Baseline SHA: `33556d8dcb4f1542cb80706f10068aa77fef1006`.
- Rama: `foundation/virro-vnext`.
- No merge/rebase de `origin/main`.
- Documentación F1-V no rastreada preexistente fue preservada y excluida del cambio.

## Implementación

- schema tipado `DevelopmentEvidenceReceipt` separado del dominio runtime;
- niveles E0-E5 y resultados PASS/FAIL/SKIPPED_ENVIRONMENT/NOT_RUN/UNKNOWN;
- evaluador determinista PROVEN/FAILED/NOT_PROVEN/SKIPPED/UNKNOWN;
- identidad exacta build/spec/criterion;
- limitations, skipped reasons, verifier e independence preservados;
- fuente BUILD 001 tipada y manifest JSON generado;
- registro machine-readable de lanes environment-dependent;
- comandos explícitos model/application/sql/security/integration/staging;
- PGlite 0.5.5 incorporado y F1 SQL convertido en gate obligatorio;
- workflow GitHub Actions con job determinista y muestra E4 manual;
- governance actualizado sin modificar producto.

## Ejemplo histórico F1

El manifest produce:

```text
BUILD-001-F1-BEFORE / atomic-commit: FAILED
  E1_MODEL PASS
  E3_LOCAL_REAL_BOUNDARY FAIL

BUILD-001 / atomic-commit: PROVEN
  E1_MODEL PASS
  E3_LOCAL_REAL_BOUNDARY PASS
```

## Ejemplo F2 mixto

```text
legacy-route-isolation: PROVEN at E2
f1-sql-regression: PROVEN at E3
deployed-cache-retirement: UNKNOWN, requires E4
```

## Verificación final

- Assurance unit/manifest: 18/18 PASS.
- Model lane: 30/30 PASS, clasificados por receipt y no como SQL proof.
- F1 SQL obligatorio: 7/7 PASS sin `PGLITE_PACKAGE_ROOT`.
- Integration lane: 7 PASS E3, 9 SKIPPED_ENVIRONMENT E4.
- F2 handler: 9/9 PASS.
- Security + assurance: 65/65 PASS.
- Vitest completo: 42 archivos PASS, 5 SKIPPED; 360 PASS, 11 SKIPPED_ENVIRONMENT.
- TypeScript: PASS.
- ESLint: PASS, cero warnings.
- Next.js production build: PASS.
- Manifest freshness: PASS.
- Environment report: cinco lanes visibles como `SKIPPED_ENVIRONMENT` en este entorno.
- Staging preflight sin credenciales: `NOT_PROVEN` y salida no-cero antes de Vitest, con seis familias de controles pendientes visibles.

## Fuera de alcance preservado

No se modificaron F3-F6, migraciones, RLS, Auth, Storage, product EvidenceReceipt, UI ni dominio de producto.
