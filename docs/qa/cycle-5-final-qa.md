# Virro — Ciclo 5: QA final y preparación de publicación

Fecha: 17 de julio de 2026

Rama: `feature/virro-universal-flow-refinement`

Entorno validado: desarrollo local, `http://localhost:3100`

Producción: sin cambios ni despliegue durante este ciclo.

## Resultado ejecutivo

El endurecimiento técnico del Ciclo 5 queda implementado y cubierto por lint, pruebas automatizadas, build de producción, comprobaciones HTTP locales y QA visual en Chrome. Se alinearon metadata, canonical, Open Graph, datos estructurados, sitemap, robots, redirects, foco visible, reducción de movimiento, carga diferida del video del hero y veracidad de claims públicos.

La conexión de navegador se recuperó usando Chrome con el runtime actualizado `26.715.21425`. Se verificaron capturas desktop/mobile, navegación por teclado inicial, ausencia de overflow horizontal en home e inbox, scroll del CTA del hero hacia Virro Core, CTA secundario de Virro Core hacia `/app/scenarios` y auditoría axe automatizada.

## Matriz de validación

| Área | Evidencia | Resultado |
|---|---|---|
| Lint | `npm run lint` | Aprobado |
| Pruebas automatizadas | `npm test` | Aprobado: 20 archivos, 72 pruebas |
| Build | `npm run build` | Aprobado: 63 páginas generadas |
| Rutas públicas | Respuestas HTTP locales | Aprobado |
| Redirects permanentes | Códigos 308 y `Location` | Aprobado |
| Metadata/canonical | HTML renderizado en servidor | Aprobado |
| Noindex de aplicación | HTML de `/app` | Aprobado |
| Headers de seguridad | Respuestas HTTP locales | Aprobado |
| Accesibilidad estática | Contratos automatizados y revisión de fuente | Aprobado |
| Teclado interactivo | Chrome | Aprobado en recorrido inicial de foco |
| Responsive visual | Capturas Chrome desktop/mobile | Aprobado |
| Axe automatizado | `pnpm dlx @axe-core/cli` en 4 rutas | Aprobado: 0 violaciones |

## Rutas validadas

Estas rutas respondieron `200` en el servidor local:

- `/`
- `/demo`
- `/how-it-works`
- `/operational-handoff`
- `/workflow-discovery`
- `/design-delivery`
- `/product-delivery`
- `/jira-readiness`
- `/app`
- `/app/inbox`
- `/app/privacy-trust`
- `/legal`
- `/legal/privacy`
- `/sitemap.xml`
- `/robots.txt`

Redirects permanentes comprobados:

| Origen | Código | Destino |
|---|---:|---|
| `/privacy` | 308 | `/legal/privacy` |
| `/terms` | 308 | `/legal/terms` |
| `/es` | 308 | `/` |
| `/es/privacy` | 308 | `/legal/privacy` |
| `/es/terms` | 308 | `/legal/terms` |
| `/demo-scenarios` | 308 | `/demo` |
| `/inbox` | 308 | `/app/inbox` |

## SEO técnico

- El título global queda como `Virro — Infraestructura de Entendimiento Operativo Digital`.
- La descripción, Open Graph y la imagen social se alinean con la categoría actual.
- La home usa canonical `https://www.virro.app` y `/demo` usa `https://www.virro.app/demo`.
- Las superficies públicas se mantienen indexables y `/app/*` permanece fuera de indexación.
- `robots.txt` bloquea `/app`, `/internal` y `/api`, sin bloquear la demo pública.
- El sitemap prioriza home, `how-it-works`, demo y casos universales; no incluye `/privacy`, que redirige.
- Los datos estructurados globales se limitan a `Organization`, `WebSite` y `WebPage`. Se eliminaron tipos y claims de producto no sustentados globalmente.

## Accesibilidad y semántica

- Se añadió un foco visible global para enlaces, botones, inputs, selects, textareas y tabs.
- La política existente de movimiento reducido sigue desactivando animaciones y video decorativo.
- El video del hero conserva `aria-hidden` y no introduce controles falsos.
- Los elementos visuales no funcionales del shell de demo dejaron de exponerse como botones.
- Los contratos automatizados cubren foco, reduced motion, video diferido y chrome no interactivo.
- El recorrido inicial por teclado en Chrome expuso foco visible en skip link, logo, navegación principal y enlace de demo.
- `/app/inbox` conserva labels reales para `Título`, `Rol de origen`, `Receptor esperado`, `Pack de análisis` e `Información original`; los helpers de pack e input original están conectados con `aria-describedby`.
- La home y `/app/inbox` no presentan overflow horizontal en 1440px ni en 390px.
- El enlace `Ver cómo funciona` del hero apunta a `#virro-core`, desplaza hasta la sección y respeta `scroll-margin-top: 96px`.
- El CTA secundario dentro de Virro Core queda como `Explorar demo enterprise` y apunta a `/app/scenarios`.
- Axe reportó 0 violaciones en `/`, `/demo`, `/app/inbox` y `/legal/privacy` después de ajustar contraste de texto secundario y el contenedor semántico de tabs de inbox.

La lectura con tecnología asistiva sigue requiriendo revisión manual antes de aprobar publicación.

## Evidencia visual

- Desktop Chrome: `docs/qa/artifacts/cycle-5-home-desktop-chrome.png`
- Mobile Chrome 390x844: `docs/qa/artifacts/cycle-5-home-mobile-chrome.png`
- Axe summary: `docs/qa/axe-cli/axe-results-summary.json`

## Performance del hero

- Se conservan los cuatro videos aprobados y el aspecto visual existente.
- La descarga de video se difiere hasta después de `load` y una espera breve.
- El primer video usa `preload="metadata"`; los siguientes usan `preload="none"`.
- Con `prefers-reduced-motion`, los videos no se habilitan.
- El poster mantiene una primera pintura estable mientras el video no está activo.

Los MP4 fuente siguen siendo pesados (aproximadamente 3.2–9.5 MB cada uno). La siguiente optimización material requiere una canalización de medios que genere versiones WebM/AV1 o MP4 con bitrate y resolución adaptativos; no se recomprimieron assets sin esa herramienta y sin alterar la calidad aprobada.

## Claims y dependencias de activación

La política de estados, claims y limitaciones queda en `docs/public-claims-and-limitations.md`. En particular:

- Los conectores Jira y la API permanecen identificados como planificados.
- La demo pública se identifica como simulada.
- Signal Sufficiency es un estado de evidencia, no una certificación ni un porcentaje de exactitud.
- La revisión humana sigue siendo requerida.
- La activación productiva del funnel depende de confirmar transporte de leads, rate limit durable, secretos y política operativa de retención.

## Evidencia pendiente antes de producción

1. Recorrido completo por teclado en todas las rutas prioritarias, no sólo muestra inicial.
2. Comprobación de Core Web Vitals en build servido en modo producción.
3. Revisión y aprobación humana de claims comerciales y legales.

No se recomienda desplegar esta rama hasta completar los puntos anteriores y aprobar explícitamente la publicación.
