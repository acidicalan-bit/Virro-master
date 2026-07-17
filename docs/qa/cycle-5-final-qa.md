# Virro — Ciclo 5: QA final y preparación de publicación

Fecha: 16 de julio de 2026

Rama: `feature/virro-universal-flow-refinement`

Entorno validado: desarrollo local, `http://localhost:3100`

Producción: sin cambios ni despliegue durante este ciclo.

## Resultado ejecutivo

El endurecimiento técnico del Ciclo 5 queda implementado y cubierto por lint, pruebas automatizadas, build de producción y comprobaciones HTTP locales. Se alinearon metadata, canonical, Open Graph, datos estructurados, sitemap, robots, redirects, foco visible, reducción de movimiento, carga diferida del video del hero y veracidad de claims públicos.

La evidencia visual desktop/mobile y la ejecución interactiva con axe no pudieron producirse: el navegador integrado no logró inicializar su runtime y devolvió `failed to write kernel assets: El sistema no puede encontrar la ruta especificada. (os error 3)` en dos intentos, incluido un reinicio del kernel. Este documento no presenta esa validación como aprobada.

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
| Teclado/axe interactivo | Navegador integrado | No ejecutado por fallo de herramienta |
| Responsive visual | Capturas desktop/mobile | No ejecutado por fallo de herramienta |

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

La navegación real por teclado, orden de foco, lectura con tecnología asistiva y auditoría axe deben repetirse con un navegador funcional antes de aprobar publicación.

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

1. Capturas desktop y mobile de las rutas prioritarias.
2. Verificación de overflow horizontal en anchos móviles reales.
3. Recorrido completo por teclado y comprobación de foco visible.
4. Auditoría axe en home, demo, formulario y aplicación.
5. Comprobación de Core Web Vitals en build servido en modo producción.
6. Revisión y aprobación humana de claims comerciales y legales.

No se recomienda desplegar esta rama hasta completar los puntos anteriores y aprobar explícitamente la publicación.
