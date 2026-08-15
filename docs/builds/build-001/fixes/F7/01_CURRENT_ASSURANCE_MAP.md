# BUILD 001-F7 - Current assurance map

## Inventario

| Suite o artefacto | Subject | Frontera real | Entorno y sustitutos | Puede probar | No puede probar | Etiqueta previa | Estado CI previo |
|---|---|---|---|---|---|---|---|
| `tests/security/build001-trust-foundation.test.ts`, 4 casos | SQL contract | Texto de migración | Lectura de archivo | Presencia/ausencia de fragmentos | Semántica SQL, triggers, ACL, RLS | security | Sin CI |
| Mismo archivo, 23 casos TrustHarness | Autoridad, rollback, idempotencia | Maps y reglas del propio test | Harness puro | Modelo esperado y matriz rápida | PostgreSQL, RPC, RLS, locks | security | Sin CI |
| Mismo archivo, 3 casos app | Authority envelope y servicio | Componentes reales de aplicación | Repositorios sustituidos | Gate de aplicación | Infraestructura externa | security | Sin CI |
| Unit/domain/outcome | Dominio y servicios | Funciones/clases reales | Fakes e in-memory repositories | Lógica y contratos de aplicación | DB, red, Storage, provider real | unit/test | Sin CI |
| UI | Componentes React | React/jsdom | fetch/router mockeados | Estado e interacción del componente | Next desplegado, Auth, red | UI | Sin CI |
| F2 handler | Retiro legacy | Exports reales GET/POST | Módulo privilegiado instrumentado | Orden de terminación de aplicación | CDN/routing desplegado | security | Sin CI |
| F1 SQL | Commit canónico | PostgreSQL 18.3 vía PGlite, migraciones y RPC reales | Bootstrap local de roles Supabase | Triggers, constraints, RPC, atomicidad, inmutabilidad | Supabase desplegado, Auth, Storage | integration; antes skip condicional | Sin CI |
| BUILD 001 remote integration | RPC remoto | Supabase desplegado | URL + anon key; normalmente omitido | Negación RPC anónima | Success path, dos tenants, Storage, concurrency | integration | Sin CI |
| BUILD 005 DB integration | Repositorios remotos | Supabase y service-role | Credenciales remotas; skip | Casos específicos de repository y anon | Auth A/B completo y controles BUILD 001 | integration | Sin CI |
| BUILD 004 real smoke/readback | Provider, DB y Storage | OpenAI + Supabase reales | Credenciales y fixture; skip | Flujo remoto concreto | Assurance general BUILD 001 | smoke/real | Sin CI |
| Deterministic PNG smoke | Diff de pixels | Encoder/decoder/calculador reales | Memoria local | Algoritmo real de imagen | Provider/Storage remoto | smoke | Sin CI |
| E5 desplegado | Workflow soportado | No existe lane | No ejecutado | Nada aún | E2E production-equivalent | Ausente | Ausente |

## Skips existentes

El registro `assurance/environment-lanes.json` conserva cinco suites y once casos environment-dependent:

- BUILD 001 deployed trust: 1;
- BUILD 005 DB: 6;
- BUILD 005 stabilization: 2;
- BUILD 004 real smoke: 1;
- BUILD 004 readback: 1.

Cada lane declara identificador, activación, variables requeridas por nombre, razón y controles no demostrados. `pnpm assurance:environment` emite el estado sin secretos.

## Gaps de assurance encontrados

1. `TrustHarness` se documentó como matriz de seguridad sin declarar E1.
2. Cuatro asserts de strings sobre SQL podían leerse como contrato de migración fuerte aunque sólo eran E0.
3. F1 SQL era `describe.skipIf` y dependía de `PGLITE_PACKAGE_ROOT`; un checkout normal podía omitir toda la frontera E3.
4. El resumen global contaba skips, pero no mostraba por identificador qué control seguía sin prueba.
5. El nombre `integration` cubría tanto PGlite local como Supabase remoto, dos fronteras distintas.
6. Tests UI y de repositorio con sustitutos podían fallar por validación/serialización antes de tocar autorización real.
7. El único test remoto BUILD 001 prueba una negación anónima; no justifica un claim general de RLS/RPC.
8. No existía CI ni validación de manifest que impidiera publicar un agregado `Security: PASS`.

## Estado después de F7

Los nombres de suite siguen siendo útiles para navegación, pero no asignan fuerza probatoria. El receipt y el evaluador determinan la satisfacción por criterio.
