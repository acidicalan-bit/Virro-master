# Virro — Current State Audit

Fecha de auditoría: 16 de julio de 2026  
Rama: `feature/virro-universal-flow-refinement`  
Baseline: `c2ad2f5`  
Alcance: Ciclo 0, inspección y documentación. No se modificó código de producto.

## 1. Resumen ejecutivo

Virro ya comunica en la home una categoría amplia de entendimiento operativo, tiene una experiencia pública consistente, landings comerciales, una demo enterprise extensa, un formulario con endpoint propio y una base de seguridad/privacy superior a la habitual para una demo. El baseline compila y sus suites actuales pasan.

La brecha principal no es visual: es la correspondencia entre afirmaciones públicas, estados de producto y evidencia técnica. El repositorio contiene tres niveles que hoy se mezclan:

1. experiencia comercial pública;
2. demo determinista con datos simulados y persistencia local;
3. servicio Python de Virro Core con controles de privacidad y tenancy, desacoplado del frontend público.

La refinación debe preservar la categoría y la identidad, pero convertir cada capacidad en una afirmación verificable y etiquetada como `available`, `assisted`, `pilot`, `planned` o `future`.

## 2. Arquitectura actual

### 2.1 Frontend y servidor web

- Next.js 16.2 con App Router, React 19, TypeScript estricto y Tailwind CSS 4.
- Renderizado mayoritariamente estático; `/api/audit-requests` es dinámico.
- Home y landings comerciales construidas con componentes cliente bilingües ES/EN.
- Metadata, Open Graph generado con `ImageResponse`, sitemap, robots, manifest y JSON-LD.
- Seguridad HTTP centralizada en `next.config.ts`: CSP, HSTS, COOP, CORP, Permissions Policy y protección contra framing.
- Despliegue actual vinculado externamente a Vercel; no existe `.openai/hosting.json` ni configuración declarativa de hosting en el repositorio.

### 2.2 Demo de producto

- `/app/*` es una demo enterprise con navegación propia y `noindex` desde `app/app/layout.tsx`.
- Datos provenientes de fixtures en `lib/data/seed.ts`, `lib/data/demo-scenarios.ts` y `lib/data/mock-events.ts`.
- Análisis determinista/mocks en `lib/services`, `services/analysis` y `services/assistant`.
- Persistencia limitada en `localStorage` para eventos guardados desde el asistente; no es persistencia multiusuario ni backend productivo.
- Dashboard y reportes agregan scores de fixtures y eventos locales.

### 2.3 Backend Next para leads

- `POST /api/audit-requests` valida, sanitiza, aplica honeypot y un límite en memoria por IP.
- Entrega por webhook o Resend según variables de entorno.
- Si no existe transporte configurado responde `503` y deriva a `contacto@virro.app`.
- No existe almacenamiento propio, registro durable de consentimiento, job de retención ni panel de leads.

### 2.4 Virro Core Python

- FastAPI + SQLAlchemy/Alembic en `virro-core/`.
- Pipeline seguro con API key, tenant guard, privacy policy, masking, análisis y almacenamiento de señales.
- Modelos sin columnas de contenido crudo y migraciones específicas para `raw_stored=false`.
- Adaptadores futuros declarados, pero no hay conectores productivos de Jira, Figma, Slack, Teams o CRM.
- No hay evidencia en el repositorio de que el frontend Next consuma este servicio en producción.

### 2.5 Persistencia

- Prisma define un modelo SQLite de workspace, eventos, resultados y reportes, pero no hay flujo Next activo que persista con Prisma.
- El servicio Python usa su propia capa SQLAlchemy.
- Existen por tanto dos modelos de dominio/persistencia no integrados.

## 3. Mapa de rutas

### 3.1 Públicas indexables

| Ruta | Implementación | Estado actual | Observación |
|---|---|---|---|
| `/` | `app/page.tsx` + `PublicLanding` | Activa | Home universal; aún mezcla estados comerciales no normalizados. |
| `/flow-audit` | `CommercialSeoPage` | Activa | Landing breve; oferta aún no contiene los 12 entregables solicitados. |
| `/workflow-discovery` | `CommercialSeoPage` | Activa | Entrada para flujos informales; CTA/copy requieren alineación final. |
| `/design-delivery` | `CommercialSeoPage` | Activa | Caso presente; no tiene modelo de evidencia/outcomes completo. |
| `/product-delivery` | `CommercialSeoPage` | Activa | Caso específico de software. |
| `/change-integrity` | `CommercialSeoPage` | Activa | Capacidad transversal. |
| `/ai-understanding` | `CommercialSeoPage` | Activa | Capacidad presentada sin estado reutilizable. |
| `/jira-readiness` | `CommercialSeoPage` | Activa | Afirma conexión Jira de solo lectura sin conector implementado en repo. |
| `/privacy` | `CommercialSeoPage` | Activa | Resumen comercial de privacidad. |
| `/security` | `CommercialSeoPage` | Activa | Explicita que no hay certificaciones verificadas. |
| `/enterprise` | `CommercialSeoPage` | Activa | Mezcla disponible/planeado/futuro con etiquetas ad hoc. |
| `/faq` | Página propia | Activa | También representada en JSON-LD global. |
| `/legal` | `LegalCenter` | Activa | Índice legal/trust. |
| `/legal/terms` | `TermsPage` | Activa | Términos. |
| `/legal/privacy` | `PrivacyNoticePage` | Activa | Aviso de privacidad. |
| `/legal/cookies` | `CookiePolicyPage` | Activa | Declara ausencia de analítica no esencial. |
| `/legal/accessibility` | `AccessibilityStatementPage` | Activa | Declara objetivo WCAG 2.2 AA y limitaciones. |
| `/legal/security-overview` | `EnterpriseTrustDocumentPage` | Activa | Documento resumido, no certificación. |
| `/legal/data-processing` | `EnterpriseTrustDocumentPage` | Activa | Marco general, no DPA contractual. |
| `/legal/subprocessors` | `EnterpriseTrustDocumentPage` | Activa | Lista no publicada; disponible bajo solicitud. |
| `/legal/retention` | `EnterpriseTrustDocumentPage` | Activa | Publica valores recomendados, no prueba ejecución de borrado. |

Rutas solicitadas que no existen: `/how-it-works` y `/demo`.

### 3.2 Demo no indexable

| Ruta | Componente principal |
|---|---|
| `/app` | `Dashboard` |
| `/app/inbox` | `InboxWorkbench` |
| `/app/demo-scenarios` | `DemoScenarioLibrary` |
| `/app/events` | `ModuleOverview` |
| `/app/product-delivery` | `ProductDeliveryPack` |
| `/app/ai-understanding` | `AIUnderstandingPack` |
| `/app/handoff-intelligence` | `HandoffIntelligencePack` |
| `/app/process-understanding` | `ProcessUnderstandingPack` |
| `/app/onboarding` | `OnboardingPack` |
| `/app/consulting-delivery` | `ConsultingDeliveryPack` |
| `/app/talent-staffing` | `TalentStaffingPack` |
| `/app/technical-documentation` | `TechnicalDocumentationPack` |
| `/app/reports` | `ReportBuilder` |
| `/app/privacy-trust` | `PrivacyTrust` |
| `/app/settings` | `DemoSettings` |

El layout `/app` aplica `robots: index=false`, `noarchive=true`. `robots.txt` también bloquea `/app`, `/demo` e `/internal`.

### 3.3 Redirects y compatibilidad

- `/terms` → `/legal/terms` (permanente).
- `/es/terms` → `/legal/terms` (permanente).
- `/es/privacy` → `/legal/privacy` (permanente).
- `/es` → `/` (permanente).
- `/inbox` → `/app/inbox` (permanente).
- `/demo-scenarios` → `/app/demo-scenarios` (permanente).
- `/app/scenarios` → `/app/demo-scenarios` (permanente).
- `app/[module]` conserva redirects legacy hacia `/app/[module]`.

### 3.4 APIs

| Ruta | Función | Evidencia |
|---|---|---|
| `POST /api/audit-requests` | Captura y entrega de leads | Código activo; transporte depende de entorno. |
| `GET /v1/trust/data-handling-summary` | Contrato resumido de datos | Respuesta estática. |
| `GET /v1/trust/retention-policy` | Valores de retención | Respuesta estática. |
| `GET /v1/trust/security-overview` | Resumen de seguridad | Respuesta estática. |

## 4. Inventario de componentes

### 4.1 Home pública activa

- `PublicLanding`: composición y footer.
- `PublicNavbar`: navegación desktop/mobile, idioma y tema.
- `HeroUnderstandingFilter`: hero, cuatro videos y CTAs.
- `HeroVirroCorePanel`: representación visual del filtro/flujo.
- `ProblemSection`: problema universal.
- `VirroCoreSection`: secuencia operativa y cuatro capacidades.
- `InitialProductSection`: cuatro formas de entrada.
- `FutureApplicationsSection`: siete casos con estados escritos manualmente.
- `UnderstandingEventDemo`: escenario de Design Delivery.
- `EnterprisePrivacySection`: flujo de privacidad y principios.
- `NonJiraSection`: entrada agnóstica de herramienta.
- `ShadowScanOfferSection`: envolvente de oferta/formulario con nombre heredado.
- `FinalEnterpriseCta`: cierre comercial.
- `DiagnosisRequestForm`: captura de lead.
- `PublicAnalyticsObserver`: observación de secciones y clicks.
- `RevealOnScroll` y primitivas de movimiento.

### 4.2 Componentes públicos reutilizables o parcialmente activos

- `CommercialSeoPage`: plantilla compartida por diez landings.
- `LanguageProvider`, `LanguageToggle`, `ThemeToggle`.
- `ArchitectureOrbit`, `EnterpriseUnderstandingMap`, `EnterpriseValueMap`, `SolutionPanels`, `ProductWalkthrough`, `PlatformCapabilities`, `DiscoverabilitySection`.
- `CategoryLayerSection`, `HowItWorksSection`, `AuditPilotSection`, `AIUnderstandingSection`, `PackagingSection`, `WhyNowSection`.
- `ChangeKnowledgeLayer`, `PrivacyTrustHome`, `ClosingUnderstandingCta`.

Los últimos grupos no forman parte de la composición actual de la home. Conservan narrativa, CTAs y visualizaciones de iteraciones anteriores; son deuda de componentes y fuente potencial de contradicciones.

### 4.3 Componentes de demo

- Shell: `AppShell`, `Dashboard`, `InboxWorkbench`, `ModuleOverview`, `DemoSettings`.
- Escenarios: `DemoScenarioLibrary` y `EnterpriseDemoExperienceV2`.
- Packs: Product Delivery, AI Understanding, Handoff, Process, Onboarding, Consulting, Talent/Staffing y Technical Documentation.
- Reportes y trust: `ReportBuilder`, `PrivacyTrust`.
- UI común: `ScoreRing`, `StatusPill`, `PackHeader`, `ScoreHero`, `SectionCard`, `InsightList`, `OutputChips`, `FactGrid`, `LabeledList`.

### 4.4 Componentes reutilizables solicitados y aún ausentes

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
- `LeadForm` como contrato desacoplado de la landing

## 5. Formularios

### 5.1 Formulario público actual

Incluye nombre, correo, empresa, tamaño, área, tipo de flujo, ubicación de información, herramienta, emisor, receptor, siguiente acción, cambio habitual, volumen, problema, consentimiento y honeypot.

Brechas:

- falta `cargo`;
- opciones no incluyen CRM;
- `Slack/Teams` y `Correo/documentos` no coinciden con la taxonomía final;
- no enlaza una política de retención específica del lead;
- el consentimiento se envía, pero no existe evidencia durable propia;
- el rate limit en memoria no es confiable en serverless/distribuido;
- el README todavía afirma que el formulario es `mailto`, aunque ya no lo es;
- queda `lib/conversion/diagnosis-mailto.ts` y su suite, aparentemente legado;
- la promesa de respuesta en dos días hábiles requiere validación operativa.

### 5.2 Formulario de Inbox

`InboxWorkbench` permite analizar inputs contra un pipeline determinista y guardar evidencia minimizada en `localStorage`. No envía el input a Virro Core Python.

## 6. Datos demo, scores y evidencia

- Diez escenarios tipados en `lib/data/demo-scenarios.ts`, todos con `mockScores` precisos.
- Doce escenarios visuales adicionales embebidos en `EnterpriseDemoExperienceV2`.
- Fixtures de workspace/eventos en `lib/data/seed.ts`.
- Dashboard agrega promedios y rankings sobre muestras pequeñas de demo.
- `ReportBuilder` muestra cifras como `58/100` y `63/100` sobre cuatro eventos.
- `AppShell` presenta un `Workspace health` consolidado.
- La demo etiqueta datos como simulados y scores como estimaciones, pero no muestra de forma consistente tamaño de muestra, periodo, cobertura, fuentes ausentes, confianza y limitaciones.
- No existe una taxonomía común para Observado, Estimado, Inferido, Confirmado, Señal insuficiente y Limitaciones.
- Signal Sufficiency aparece en copy, pero no como modelo/estado compartido. El demo principal siempre renderiza un score numérico.

## 7. Integraciones y capacidades reales

### Evidencia técnica presente

- Endpoint de leads por webhook o Resend.
- API FastAPI con autenticación por tenant, masking y almacenamiento de señales.
- Adaptadores futuros y contratos para fuentes manual/API/connector/webhook.
- Analítica first-party por eventos DOM/dataLayer, sin payload de formulario.
- Datos demo y análisis determinista local.

### No evidenciado como productivo

- Conector Jira.
- Conector Figma.
- Conectores GitHub, Slack, Teams o CRM.
- Importación segura operativa de archivos/exportaciones.
- API pública Next conectada a la experiencia comercial.
- Persistencia enterprise compartida entre Next y Virro Core.
- outcome tracking productivo.
- eliminación programada verificada en infraestructura desplegada.
- certificaciones o auditorías externas.

## 8. Analítica

Eventos actuales: `hero_audit_click`, `hero_demo_click`, `core_section_view`, `demo_scenario_started`, `audit_form_started`, `audit_form_submitted`, `pilot_cta_click`, `privacy_section_view`.

La implementación despacha `CustomEvent` y empuja a `window.dataLayer` si existe. No se observa un script de proveedor en el repo. No se envía contenido del formulario.

Brechas:

- taxonomía distinta de la solicitada;
- no existe `lead_form_failed`;
- no hay vistas de landings ni selección de entrada/caso;
- no hay contrato de propiedades permitido/prohibido;
- la política de cookies afirma ausencia de analítica no esencial; debe mantenerse consistente si se conecta un proveedor.

## 9. SEO técnico

Fortalezas:

- canonical por landing;
- sitemap y robots dedicados;
- metadata global y por ruta;
- Open Graph generado;
- JSON-LD de Organization, WebSite, SoftwareApplication y FAQ;
- redirects permanentes para rutas legacy;
- `/app/*` noindex.

Brechas:

- faltan `/how-it-works` y `/demo`;
- el sitemap asigna prioridad muy alta a Jira (`0.9`), reforzando una categoría demasiado específica;
- el nav llama “Demo” a `/workflow-discovery`, no a una demo;
- JSON-LD lista capacidades sin estado;
- el idioma inglés solo existe como estado cliente, sin URL indexable;
- landings comparten una plantilla muy breve y repetitiva;
- no hay pruebas de metadata específicas por ruta, salvo verificaciones parciales por cadenas.

## 10. Accesibilidad, responsive y performance

Fortalezas observables en código:

- skip links, landmarks, labels, `aria-describedby`, navegación responsive, focus compartido y reduced motion;
- navegación móvil con cierre por Escape e inert/aria-hidden en el shell;
- tests contractuales para semántica básica.

Riesgos:

- no hay suite E2E ni auditoría automatizada axe;
- varias vistas demo son densas y la propia declaración de accesibilidad reconoce limitaciones;
- componentes de home se concentran en JSX de una sola línea, dificultando revisión semántica;
- cuatro videos MP4 están montados en el hero con `preload="metadata"`, lo que puede afectar LCP, memoria y datos móviles;
- no hay medición de Core Web Vitals en repo;
- no se ejecutó browser QA en Ciclo 0 porque el encargo pidió documentación y no cambios.

## 11. Tests y baseline

Resultado del Ciclo 0:

- ESLint: pasa sin errores ni warnings.
- Vitest: 13 archivos, 55 tests, todos pasan.
- Build Next: pasa; 59 páginas generadas.
- Pytest Virro Core: 21 tests pasan; existe un warning de deprecación de `starlette.testclient`/`httpx`.

Cobertura ausente o insuficiente:

- E2E real;
- endpoint de leads Next;
- consentimiento y retención de leads;
- fallos de transporte;
- noindex/redirects mediante requests reales;
- status badges, evidence classification y signal insufficiency;
- pruebas de metadata por cada landing;
- accesibilidad automatizada y responsive visual.

## 12. Afirmaciones públicas que requieren revisión

| Afirmación actual | Archivo/superficie | Motivo de revisión | Recomendación |
|---|---|---|---|
| “Jira disponible inicialmente” / “Virro puede conectarse a Jira en modo de solo lectura” | `enterprise-home-sections.tsx`, `/jira-readiness` | No hay conector Jira en el repo; solo adaptador futuro. | Clasificar como piloto/planeado o describir auditoría/importación asistida hasta verificar integración. |
| “Native Connectors” con estado Piloto | Home | No existe implementación concreta verificable. | Mostrar Jira con estado contractual exacto y separar “interés” de “piloto activo”. |
| “API & Events” | Hero/home | Existe API Python, pero no está conectada al frontend ni se prueba su despliegue productivo. | Etiquetar como planeado/piloto técnico y delimitar alcance. |
| “Readiness & Change Integrity … Disponible” | `/enterprise` | La evidencia visible es demo determinista y análisis asistido, no un producto autoservicio completo. | Usar “Disponible con acompañamiento” si existe operación real; de lo contrario “Piloto”. |
| Product Delivery “Disponible” | Home | Estado escrito manualmente, sin fuente de verdad. | Mover a `CapabilityStatusBadge` y registro único de capacidades. |
| “Secure Flow Import · Disponible” | Home | No existe upload/import seguro en la web ni adaptador comprobado. | Cambiar a “Disponible con acompañamiento” solo si el proceso operativo existe; no sugerir upload. |
| “Reporte privado” / entrega de diagnóstico | `/jira-readiness`, `/flow-audit` | No existe workflow persistente de generación/entrega desde el formulario. | Presentarlo como entregable de auditoría asistida, sujeto a alcance. |
| “Descartar contenido crudo” / “Raw content retained: No” | Home, demo, privacy, trust API | Virro Core lo implementa, pero la demo contiene raw input en memoria/source y leads se envían a webhook/email. | Delimitar por runtime: análisis seguro de Core vs demo local vs lead transport. |
| “No entrenamiento cruzado entre clientes” | Home/privacy/legal | Es política declarada; no hay proveedor de modelo conectado que permita validarla de extremo a extremo. | Mantener como restricción de arquitectura/contrato, no como certificación técnica absoluta. |
| “Aislamiento” | Home/security/legal | Virro Core tiene tenant guard; Next demo y SQLite/fixtures no son un entorno multi-tenant productivo. | Precisar superficie y modalidad de despliegue. |
| Retención 90/365 días | `/legal/retention`, trust API | Son defaults/recomendaciones; no se observa scheduler de borrado desplegado. | Etiquetar como configuración objetivo hasta verificar enforcement. |
| “Acceso mínimo, revocable, solo lectura” | `/security`, `/jira-readiness` | No existe flujo OAuth/conector para demostrar scopes y revocación. | Condicionar al alcance de cada piloto/conector. |
| “Auditoría asistida · Importación segura · Integraciones · API” | Hero | Puede leerse como cuatro productos disponibles. | Añadir estados o explicar modalidades en la sección siguiente. |
| “Virro detecta/identifica” en landings | Todas las landings | Hoy el motor público mostrado es determinista/simulado. | Mantener como definición de capacidad, acompañada de estado y metodología. |
| “Scores probabilísticos” y scores `/100` | Demo/dashboard/reportes | Algoritmos deterministas sobre muestras simuladas; precisión visual excesiva. | Reemplazar agregados débiles por evidencia, rango/confianza o “no determinable”. |
| “Responderemos en dos días hábiles” | Formulario | SLA operativo no verificable desde repo. | Confirmar con operación o retirar plazo. |
| “El sitio público no carga analítica no esencial” | Política de cookies | Existe instrumentación dataLayer, aunque no hay proveedor cargado. | Mantener solo mientras no se conecte proveedor; documentar cambio y consentimiento si ocurre. |
| Feature list de JSON-LD | `app/layout.tsx` | Enumera capacidades sin estado ni alcance. | Limitar a capacidades verificadas o formularlo como descripción, no disponibilidad. |

## 13. Inconsistencias y deuda

- README desactualizado sobre mailto y número de escenarios.
- `diagnosis-mailto.ts` y tests asociados permanecen aunque el formulario usa API.
- Componentes públicos antiguos no montados conservan narrativas/CTAs contradictorios.
- Home muestra siete casos; el nuevo máximo es seis.
- La unidad “Understanding Transfer Point” no está definida ni modelada visualmente como centro.
- Signal Sufficiency no es un estado reutilizable.
- Estados de capacidad son strings dispersos y pueden caer en “Disponible” sin política común.
- La navegación pública actual difiere de la recomendada: usa Integraciones/Privacidad/Empresa y una “Demo” que apunta a Workflow Discovery.
- La demo contiene 15 módulos y numerosos packs; la navegación deseada es de seis áreas.
- El frontend y Virro Core duplican conceptos sin contrato compartido.

## 14. Riesgos técnicos

1. **Claims vs runtime (alto):** riesgo comercial/legal si un prospecto interpreta conectores, retención o disponibilidad como productivos.
2. **Rate limit serverless (alto):** el `Map` en memoria se reinicia y no coordina instancias; no protege de forma consistente.
3. **Consentimiento no durable (alto):** el lead contiene consentimiento, pero el sistema propio no conserva evidencia ni política/versionado.
4. **Transporte de leads (alto):** depende de secretos externos; sin ellos el funnel termina en `503`.
5. **Privacidad por superficie (alto):** las afirmaciones de “raw content: no” no distinguen demo, lead, Core y proveedores.
6. **Scores con falsa precisión (alto):** agregados pequeños pueden parecer medición real y causal.
7. **Arquitectura dual (medio-alto):** Prisma/Next y SQLAlchemy/FastAPI pueden divergir en contratos y retención.
8. **Persistencia local sin expiración (medio):** `localStorage` conserva hasta 20 evidencias demo sin TTL.
9. **Deuda de componentes (medio):** múltiples secciones antiguas incrementan riesgo de regresión narrativa.
10. **Tests frágiles (medio):** varios tests validan strings de código fuente, no comportamiento renderizado.
11. **SEO de rutas dinámicas legacy (medio):** el árbol genera rutas históricas además de las públicas y depende de redirects/noindex consistentes.
12. **Performance del hero (medio):** cuatro videos simultáneamente declarados pueden degradar LCP/datos móviles.
13. **Sin E2E/axe (medio):** build verde no cubre interacción, mobile, teclado ni funnel real.
14. **Dependencia operativa no documentada (medio):** Vercel y variables productivas no están declarados en repo.
15. **Warning Python (bajo):** compatibilidad futura de TestClient/httpx requiere actualización controlada.

## 15. Archivos que se propone modificar

La lista exacta, por ciclo, está en `docs/refinement-plan.md`. No se propone modificar `virro-core/` durante la refinación comercial salvo que una validación posterior demuestre que un contrato público necesita corrección. No se propone crear conectores ni un motor de IA.

