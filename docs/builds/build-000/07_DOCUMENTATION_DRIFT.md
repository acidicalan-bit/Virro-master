# BUILD 000 - Drift documental

## Drift material

| ID | Documento | Drift | Acción |
| --- | --- | --- | --- |
| DOC-001 | `PROJECT_SPEC.md:327,331,406` | Afirma que no existen user auth/tenant ownership/RLS; Foundation 1.5 sí implementa principal, membership, owner y RLS para core/Field Beta. | Corregir en BUILD 001 con alcance parcial exacto. |
| DOC-002 | `docs/ARCHITECTURE.md:64` | Describe service-role Build 001.1 y Auth como futuro. | Reescribir sección de persistencia/autoridad; preservar nota histórica. |
| DOC-003 | `docs/security/THREAT_MODEL.md:58` | Residual T-13 dice que ownership/RLS no está implementado, contradiciendo su propio delta Phase B. | Separar MarketplaceProject/Canon (no persistidos) de core lineage (implementado parcial). |
| DOC-004 | `docs/security/STANDARDS_MAPPING.md:11` | Dice tenant ownership no implementado. | Marcar core lineage/Field Beta parcial y downstream pendiente. |
| DOC-005 | `docs/CURRENT_STATE.md:6` | Snapshot volátil fija `1ee75e1`, no HEAD `96e42e9`. | Actualizar timestamp/commit o automatizar el dato. |
| DOC-006 | package/metadata | `intent-lab@0.1.1` es más estrecho que el alcance actual. | Decidir rename sólo en build separado; no es blocker técnico. |

## Drift histórico excluido

- FastAPI/Virro Core enterprise, Privacy Shield, licenses, old rate limiter y los conceptos Understanding Event/Meaning Loss pertenecen a ramas/snapshots históricos, no a current main.
- `README-PIVOT.md` y Virro Impulsa pertenecen al checkout de usuario, no a la base canónica.
- Builds congelados conservan verdad histórica aunque sus limitaciones hayan sido superadas.

## Regla propuesta

Cada Build que cambie dominio, autoridad, seguridad o product claims debe incluir `SPEC DELTA` y actualizar simultáneamente `PROJECT_SPEC`, `CURRENT_STATE`, architecture, threat model y ownership map. CI debe comprobar al menos enlaces, commit metadata declarada y términos prohibidos obsoletos; no necesita un sistema documental complejo.

