# Virro — Refinement Plan

Fecha: 16 de julio de 2026  
Rama: `feature/virro-universal-flow-refinement`  
Estado: propuesta del Ciclo 0; requiere aprobación antes de implementar.

## 1. Principios de ejecución

- No reconstruir el sitio.
- Preservar logo, identidad visual, hero aprobado y categoría universal.
- Tratar Jira como implementación específica, nunca como definición.
- Separar demo, capacidad asistida, piloto, plan y visión futura.
- No conectar ni simular integraciones no existentes.
- No mostrar precisión superior a la evidencia.
- No desplegar ningún ciclo sin build, tests, QA y aprobación del alcance correspondiente.

## 2. Conservar

- Arquitectura Next App Router y sistema visual actual.
- Hero aprobado, videos actuales y navegación responsive como base.
- `Virro Core` como núcleo de la narrativa.
- Landings existentes y `CommercialSeoPage` como punto de partida.
- Flujo seguro conceptual Receive → Mask → Analyze → Discard → Store Signals → Report.
- Avisos legales y disclaimers de no certificación/no vigilancia.
- `noindex` de `/app/*`, sitemap, robots, canonical y redirects actuales.
- Formulario POST propio, honeypot, sanitización y validación de email.
- Virro Core Python como infraestructura separada, sin fingir integración con Next.
- Fixtures demo claramente etiquetados como simulados.
- Idioma ES/EN, tema, reduced motion y patrones accesibles existentes.

## 3. Modificar

- Home para centrar `Understanding Transfer Point` y las siete capacidades universales.
- Problema para mostrar Readiness Failure y Change Integrity Failure con ejemplos balanceados.
- Formas de entrada con estados honestos y CTA único.
- Casos de uso: reducir a seis y añadir detecciones/outcomes sin inflar disponibilidad.
- Design Delivery con hero/copy exactos, evidencia, limitaciones y entrada asistida.
- Signal Sufficiency como estado real sin score cero obligatorio.
- Demo: navegación de seis áreas y tres escenarios completos.
- Dashboard/reportes para eliminar agregados injustificadamente precisos.
- Privacy Shield para distinguir dato recibido, dato enmascarado, descarte y señal guardada.
- Oferta `Virro Flow Understanding Audit` y sus 12 entregables.
- CTAs, taxonomía analítica, navegación, metadata, JSON-LD y prioridades de sitemap.
- Formulario para cargo, CRM, consentimiento/retención y errores completos.
- Endpoint de leads para rate limit durable/compatible con despliegue y fallos seguros.
- Tests orientados a comportamiento en lugar de solo cadenas de fuente.

## 4. Crear

### Componentes

- `FlowMap`
- `TransferPointCard`
- `EntryModeCard`
- `UseCaseCard`
- `EvidenceSection`
- `SignalSufficiencyStatus`
- `CapabilityStatusBadge`
- `PrivacyRuntimeCard`
- `FlowAuditDeliverables`
- `LimitationsPanel`
- `OutcomePanel`
- `TrustSummary`
- `LeadForm`/contrato de validación desacoplado

### Rutas

- `/how-it-works`
- `/demo` como entrada pública controlada hacia la experiencia demo, con decisión explícita entre landing o redirect.

### Contratos y tests

- Registro único de estados de capacidades.
- Clasificación de evidencia.
- Modelo de Signal Sufficiency.
- Schema/validador compartido del lead.
- Política/versionado de consentimiento y retención del lead.
- Tests unitarios, integración y E2E listados en el brief.

## 5. Eliminar

- Código `mailto` obsoleto cuando el endpoint nuevo quede cubierto.
- Tests exclusivos del mailto legado.
- Componentes públicos muertos que dupliquen narrativas y no tengan consumidor.
- CTAs heredados que compitan con `Analizar un flujo`, `Ver demo` y `Activar piloto`.
- Scores consolidados o ratios sin evidencia suficiente.
- Strings de estado dispersos cuando exista el registro central.

No se eliminará una ruta pública existente sin redirect y revisión SEO.

## 6. Ocultar

- Capacidades internas o packs que no deban dominar la compra inicial.
- Módulos demo que no pertenezcan a Overview, Flows, Understanding Events, Evidence Report, Trust o Settings.
- Estados/capacidades sin evidencia suficiente para exposición comercial.
- Rutas internas y datos simulados detrás de `noindex` y señalización visible de demo.

Ocultar no significa borrar el motor/fixture; significa retirarlo de navegación o presentación comercial hasta tener estado verificable.

## 7. Posponer

- Motor real de IA.
- Conectores Jira, Figma, GitHub, Slack, Teams o CRM.
- Upload de archivos.
- Billing, autenticación productiva y portal de cliente.
- Rankings individuales, hard blocking y policy enforcement.
- Certificaciones.
- Persistencia enterprise unificada entre Next y FastAPI.
- Outcome tracking productivo si no existe fuente confirmada.
- Internacionalización SEO con rutas inglesas hasta definir estrategia URL.

## 8. Ciclos propuestos

### Ciclo 1 — Veracidad del producto y sistema universal

Objetivo: centralizar estados y evidencia; refinar home sin rediseñarla.

Entregables:

- `CapabilityStatusBadge` sin default implícito.
- registro central de capacidades/estados;
- `FlowMap`, `TransferPointCard`, `EntryModeCard`, `UseCaseCard`;
- Understanding Transfer Point visible;
- máximo seis casos;
- Readiness Failure y Change Integrity Failure;
- CTAs primarios normalizados.

### Ciclo 2 — Signal Sufficiency, evidencia, privacy y scores

Objetivo: eliminar precisión falsa y separar observado/estimado/inferido/confirmado/insuficiente.

Entregables:

- estados de Signal Sufficiency;
- Evidence, Limitations y Outcome panels;
- reportes con muestra, periodo, cobertura, fuentes ausentes, confianza y limitaciones;
- PrivacyRuntimeCard por superficie;
- remoción/ocultamiento de scores consolidados débiles.

### Ciclo 3 — Oferta, formulario y funnel seguro

Objetivo: productizar Flow Understanding Audit y cerrar el funnel sin mailto.

Entregables:

- 12 entregables de auditoría;
- formulario completo;
- schema compartido;
- rate limiting adecuado al entorno;
- consentimiento versionado y política de retención;
- success/error/fallback y analítica sin contenido;
- eliminación del legado mailto.

Dependencia: confirmar transporte de leads y mecanismo durable disponible en producción.

### Ciclo 4 — Demo simplificada y landings

Objetivo: alinear demo y rutas comerciales con la categoría.

Entregables:

- navegación demo de seis áreas;
- Design Delivery, Product Delivery y Operational Handoff completos;
- `/how-it-works` y `/demo`;
- refinamiento de `/workflow-discovery`, `/design-delivery`, `/jira-readiness` y restantes landings;
- estados honestos en todas las superficies.

### Ciclo 5 — SEO, accesibilidad, performance y QA final

Objetivo: endurecimiento y preparación de publicación.

Entregables:

- metadata/canonical/OG/structured data/redirects/noindex;
- sitemap reequilibrado;
- pruebas unitarias, integración y E2E;
- axe/teclado/mobile;
- optimización de videos/hero y Core Web Vitals;
- revisión legal de claims y documentación de limitaciones;
- build, lint, tests y evidencia desktop/mobile.

## 9. Estimación

| Ciclo | Complejidad | Estimación de trabajo |
|---|---|---|
| 0. Auditoría y plan | Completado | 1 ciclo |
| 1. Sistema universal | Alta | 1 ciclo |
| 2. Evidencia/privacy/scores | Alta | 1–2 ciclos |
| 3. Funnel seguro | Alta, dependiente de infraestructura | 1–2 ciclos |
| 4. Demo y landings | Alta | 1–2 ciclos |
| 5. QA y hardening | Media-alta | 1 ciclo |

Estimación total restante: **5 a 8 ciclos**, condicionada por transporte/persistencia de leads y por la decisión comercial sobre qué capacidades son realmente `available`, `assisted` o `pilot`.

## 10. Lista exacta de archivos propuestos

Esta es la lista de trabajo prevista. Se validará al inicio de cada ciclo y cualquier ampliación requerirá explicación.

### Modificar — aplicación pública

- `app/layout.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/opengraph-image.tsx`
- `next.config.ts`
- `components/landing/public-landing.tsx`
- `components/landing/public-navbar.tsx`
- `components/landing/hero-understanding-filter.tsx`
- `components/landing/hero-virro-core-panel.tsx`
- `components/landing/virro-core-section.tsx`
- `components/landing/commercial-sections.tsx`
- `components/landing/enterprise-home-sections.tsx`
- `components/landing/commercial-seo-page.tsx`
- `components/landing/diagnosis-request-form.tsx`
- `components/landing/public-analytics-observer.tsx`
- `lib/analytics/public-events.ts`
- `app/globals.css`

### Modificar — landings

- `app/flow-audit/page.tsx`
- `app/workflow-discovery/page.tsx`
- `app/design-delivery/page.tsx`
- `app/product-delivery/page.tsx`
- `app/change-integrity/page.tsx`
- `app/ai-understanding/page.tsx`
- `app/jira-readiness/page.tsx`
- `app/privacy/page.tsx`
- `app/security/page.tsx`
- `app/enterprise/page.tsx`
- `app/faq/page.tsx`

### Modificar — formulario/API/trust/legal

- `app/api/audit-requests/route.ts`
- `.env.example`
- `components/legal/legal-pages.tsx`
- `components/privacy/privacy-trust.tsx`
- `lib/trust/security-foundation.ts`
- `app/v1/trust/data-handling-summary/route.ts`
- `app/v1/trust/retention-policy/route.ts`
- `app/v1/trust/security-overview/route.ts`
- `README.md`

### Modificar — demo, evidencia y scores

- `app/app/layout.tsx`
- `app/app/page.tsx`
- `app/app/[module]/page.tsx`
- `components/layout/app-shell.tsx`
- `components/dashboard/dashboard.tsx`
- `components/inbox/inbox-workbench.tsx`
- `components/scenarios/demo-scenario-library.tsx`
- `components/reports/report-builder.tsx`
- `components/modules/module-overview.tsx`
- `components/landing/enterprise-demo-experience-v2.tsx`
- `components/ui/score-ring.tsx`
- `components/ui/status-pill.tsx`
- `lib/config/modules.ts`
- `lib/config/pack-registry.ts`
- `lib/data/demo-scenarios.ts`
- `lib/data/seed.ts`
- `lib/domain/understanding-event.ts`
- `lib/services/assistant-event-store.ts`
- `lib/services/dashboard-insights.ts`
- `lib/services/report-builder.ts`
- `services/analysis/scoringEngine.ts`
- `lib/types/understanding.ts`
- `lib/types/demo-scenario.ts`

### Crear — componentes y contratos

- `components/landing/flow-map.tsx`
- `components/landing/transfer-point-card.tsx`
- `components/landing/entry-mode-card.tsx`
- `components/landing/use-case-card.tsx`
- `components/evidence/evidence-section.tsx`
- `components/evidence/signal-sufficiency-status.tsx`
- `components/evidence/limitations-panel.tsx`
- `components/evidence/outcome-panel.tsx`
- `components/ui/capability-status-badge.tsx`
- `components/privacy/privacy-runtime-card.tsx`
- `components/audit/flow-audit-deliverables.tsx`
- `components/trust/trust-summary.tsx`
- `lib/config/capability-registry.ts`
- `lib/evidence/evidence-classification.ts`
- `lib/evidence/signal-sufficiency.ts`
- `lib/leads/lead-schema.ts`
- `lib/leads/lead-delivery.ts`
- `lib/leads/rate-limit.ts`
- `lib/leads/retention-policy.ts`
- `app/how-it-works/page.tsx`
- `app/demo/page.tsx`

### Eliminar después de reemplazo verificado

- `lib/conversion/diagnosis-mailto.ts`
- `tests/conversion/diagnosis-mailto.test.ts`

Los siguientes archivos se evaluarán para eliminación si permanecen sin consumidores después del Ciclo 1; no se borrarán automáticamente:

- `components/landing/architecture-orbit.tsx`
- `components/landing/continuity-trust-sections.tsx`
- `components/landing/enterprise-understanding-map.tsx`
- `components/landing/enterprise-value-map.tsx`
- `components/landing/platform-capabilities.tsx`
- `components/landing/product-walkthrough.tsx`
- `components/landing/solution-panels.tsx`

### Tests a modificar

- `tests/landing/enterprise-category.test.ts`
- `tests/landing/production-qa-contract.test.ts`
- `tests/landing/public-language-navigation.test.ts`
- `tests/content/operational-language.test.ts`
- `tests/security/security-config.test.ts`
- `tests/security/trust-foundation.test.ts`
- `tests/services/executive-services.test.ts`
- `tests/domain/domain-integrity.test.ts`
- `tests/analysis/analysis-engine.test.ts`

### Tests a crear

- `tests/components/capability-status-badge.test.ts`
- `tests/evidence/evidence-classification.test.ts`
- `tests/evidence/signal-sufficiency.test.ts`
- `tests/leads/lead-schema.test.ts`
- `tests/leads/lead-retention.test.ts`
- `tests/api/audit-requests.test.ts`
- `tests/seo/route-metadata.test.ts`
- `tests/seo/noindex-redirects.test.ts`
- `tests/integration/lead-form.test.ts`
- `tests/e2e/home.spec.ts`
- `tests/e2e/flow-audit.spec.ts`
- `tests/e2e/design-delivery.spec.ts`
- `tests/e2e/workflow-discovery.spec.ts`
- `tests/e2e/jira-readiness.spec.ts`
- `tests/e2e/demo.spec.ts`
- `tests/e2e/lead-submission.spec.ts`
- `tests/e2e/mobile.spec.ts`

## 11. Archivos explícitamente fuera de alcance por ahora

- Todo `virro-core/**`, salvo corrección posterior de un contrato demostrado como incorrecto.
- `prisma/schema.prisma`, mientras no se autorice persistencia propia de leads o unificación del backend.
- Logo y assets `public/brand/**`.
- Nuevos conectores, billing, autenticación y motor de IA.

## 12. Decisiones necesarias antes del Ciclo 1

1. Estado real de Jira: `assisted`, `pilot`, `planned` o `available`.
2. Estado real de Secure Flow Import y API & Events.
3. Capacidades que cuentan con entrega operativa real hoy.
4. Transporte productivo de leads y mecanismo durable disponible.
5. Política/versión de consentimiento y plazo de retención de leads.
6. Si `/demo` será landing pública o redirect a `/app/demo-scenarios`.
7. Qué seis casos de uso deben ocupar la home.
8. Si el SLA de respuesta de dos días hábiles es contractual/operativo.

## 13. Criterio de pausa

El Ciclo 0 termina con estos dos documentos. No se debe iniciar ninguna modificación listada hasta recibir aprobación explícita.
