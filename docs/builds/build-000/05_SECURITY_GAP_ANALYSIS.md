# BUILD 000 - Análisis de brechas de seguridad

## Estado

`SECURITY_PLUGIN_COMPLETION_STATUS = INCOMPLETE`.

El scan auxiliar anterior se ejecutó sobre el snapshot histórico `411b626`, escribió `scan-manifest.json`, `findings.json` y `coverage.json`, pero quedó sin `sealedAt`, sin artefactos finales y sin `report.md`. `complete-scan` falló en el workbench. No se reintentó. Sus siete candidatos no son hallazgos del commit canónico actual.

## Validación de candidatos heredados

| Área | Resultado en `96e42e9` | Evidencia/conclusión |
| --- | --- | --- |
| License enforcement/authorization | NOT_APPLICABLE | No existe FastAPI, `/v1/license/activate`, modelo License ni licencia runtime en current main. |
| Rate limiter histórico | NOT_REPRODUCED | No existen `audit-requests` ni `public-rate-limit.ts`. Brecha distinta OBSERVED: los APIs internos no tienen rate/cost quotas y governance lo exige antes de exposición pública. |
| Retention vs deletion | OBSERVED | No hay lifecycle/purge general; threat model exige retention/deletion policy. El PEX sólo define borrado manual a 30 días. |
| Privacy Shield / aux fields | NOT_APPLICABLE | No existen `PrivacyShield`, `privacy_shield`, `client_name` o `company_name` en el runtime actual. |

No se heredan severidades del scan histórico.

## Controles actuales observados

- Secretos server-only y clientes Supabase separados por privilegio.
- Principal verificado por Supabase claims.
- Tenant + membership activos antes de construir `AuthorityContext`.
- RLS y triggers de consistencia para core lineage; owner inmutable una vez probado.
- Rutas legacy privilegiadas 404 por defecto y siempre en producción.
- Zod estricto, capability allow/deny, critical UNKNOWN fail-closed.
- TaskSpec ID/hash compartido por result/evidence/verification.
- Human acceptance separada de machine verification y commit.
- Upload PNG acotado y Storage privado en el workflow actual.
- Auditoría `pnpm audit --prod`: sin vulnerabilidades conocidas al momento del baseline.

## Brechas actuales

| ID | Brecha | Estado | Prioridad de diseño |
| --- | --- | --- | --- |
| SEC-001 | ExecutionRun/EvidenceReceipt/Storage/StateCommit no tienen envelope tenant completo | OBSERVED | Alta, antes de cualquier exposición multiusuario. |
| SEC-002 | Head movement + StateCommit no son atómicos | OBSERVED | Alta por integridad/stale race. |
| SEC-003 | Service role legacy conserva blast radius amplio | OBSERVED | Alta; migración progresiva a user-scoped/RPC. |
| SEC-004 | Retención/borrado verificable no implementado | OBSERVED | Alta antes de datos de clientes. |
| SEC-005 | Sin rate limits, quotas, idempotency y cost guard generales | OBSERVED | Media ahora; alta antes de APIs/proveedores públicos. |
| SEC-006 | Roles `OWNER/MEMBER` son demasiado gruesos para aprobación/ejecución de alto riesgo | OBSERVED | Media; introducir permissions/policy sólo con casos reales. |
| SEC-007 | Codex/seller execution sandbox no existe | OBSERVED | Bloquea CodexAdapter arbitrario; mantener DEFER. |
| SEC-008 | Observabilidad/redacción/retención de logs no tienen enforcement completo | PARTIAL | Añadir allowlist, request correlation y pruebas de redacción. |

## Requisitos para CodexAdapter

Antes de ejecutar código/repositorios: lease de filesystem/tool/network, credenciales efímeras scoped, deny-by-default egress, workspace aislado, límites CPU/memoria/tiempo/output/costo, immutable input commit, artifact digest, evidence receipts, same-contract verification, human approval para side effects y revocación/kill switch. El proceso Next.js y la service role nunca deben alojar código no confiable.

## Efectos externos

**EXTERNAL SIDE EFFECT STATUS = UNKNOWN.**

- Búsqueda read-only exacta `"BUILD 000" Virro` en Linear: sin resultados.
- Búsqueda read-only de issues en `acidicalan-bit/Virro-master`: sin resultados.
- Jira/Atlassian respondió que la app no está instalada; no pudo auditarse.
- Los artefactos del scan no contienen referencias a Linear, Jira, GitHub, advisories o comentarios.
- Esto prueba ausencia de evidencia accesible, no ausencia universal de escrituras externas.

