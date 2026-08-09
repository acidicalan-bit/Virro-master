# Auditoría previa — reconstrucción de VIRRO IMPULSA

Fecha de auditoría: 2026-08-04  
Rama de trabajo: `fix/virro-impulsa-experience-rebuild`  
Punto de partida: `97c7c88` (`codex/prod-business-modernization`)  
Estado de `main`: sin modificar; `origin/main` permanece en `411b626`.

## Alcance y hallazgos

La home actual reúne diez bloques independientes: hero, brecha, motor, before/after, portafolio, demo sectorial, calculadora, journey, FAQ y CTA. Eso fragmenta el recorrido y repite titulares grandes. El contenido útil, las rutas y los componentes de accesibilidad pueden conservarse, pero la experiencia pública de `/` debe reducirse a los seis actos aprobados.

| Elemento actual | Problema | Conservar | Reconstruir | Eliminar |
| --- | --- | --- | --- | --- |
| `app/page.tsx` | Diez bloques, múltiples mensajes por viewport y camino de conversión diluido. | Copy base y enlaces de diagnóstico. | Home de seis actos. | Bloques no incluidos en los seis actos. |
| Hero `.stage-card` | Escaparate, teléfono y flujo se construyen con rectángulos CSS; no hay negocio real ni interfaz real. | CTAs y propósito. | Hero cinematográfico con asset real y Motor Virro. | `stage-card`, tienda y teléfono con `div`s. |
| `.bento` de “La brecha” | Cuatro tarjetas oscuras decorativas; usa un encabezado adicional y verde ácido. | Idea de coordinación de capacidades. | Narrativa dentro de transformación y capacidades. | Bento grid actual. |
| `MotorVirro` | Tres botones/anillos circulares; no hay objeto 3D/pseudo-3D, cursor, toque ni estados de negocio. | Estados y contenido de Studio, Systems y Academy. | Objeto central con idle, hover, activo, completo, fallback y reducción de movimiento. | Anillos actuales. |
| `BeforeAfter` | Comparación íntegramente tipográfica y de bloques, sin fotografía. | Control accesible por rango. | Comparador con fotografía antes/después. | Escenas CSS actuales. |
| Portafolio `.case-visual` | Las seis tarjetas dependen de gradientes y geometría CSS; no hay imágenes reales. | Datos conceptuales y rutas de casos. | Tres casos visuales con assets reales. | `case-visual` genérico de la home. |
| `SectorShowcase` | Demos sectoriales válidas, pero el dispositivo está hecho con `div`s y el bloque duplica el propósito de transformación. | Tabs, datos sectoriales y rutas interiores. | Demostración concreta dentro del Acto 3. | Demo sectorial larga de la home. |
| `OpportunityCalculator` | Es una herramienta útil, pero distrae de la conversión en portada. | Lógica y ruta `/demo/[sector]`. | Mantener fuera de `/`. | Sección en home. |
| `FAQ` | FAQ extensa y copy defensivo restan foco a la venta. | Componente y ruta posible interior. | Resumen o página interior posterior. | Sección completa en home. |
| Journey de cuatro tarjetas | Repite método y añade una cuadrícula de tarjetas gigantes. | Los tres pasos de trabajo. | Acto 5 en una sola secuencia. | `journey` actual. |
| Paleta global | `--acid: #d8ff5b` es color dominante en botones, etiquetas, foco y selección. | Coral y azul/cyan como base técnica. | Tokens azul profundo, azul eléctrico, blanco, gris frío y coral. | Verde ácido como identidad. |
| Lucide | Se emplea como recurso visual en bloques principales. | Iconos funcionales: menú, flecha, estado. | Reducir a controles semánticos. | Iconos decorativos principales. |
| Formulario | Flujo accesible de tres pasos, pero no adjunta fotografía, no guarda datos ni emite analítica. | Validación y estructura de ruta. | Formulario mínimo con archivo, Supabase y evento. | Mensaje de éxito demo como comportamiento final. |
| Header/footer | Navegación responsive, skip link y separación visible de `/labs`. | Estructura, accesibilidad y `/labs` discreto. | Jerarquía de navegación de Impulsa. | Link destacado a Core en navegación principal. |

## Rutas, formularios y datos

- Rutas existentes: `/`, `/impulsa`, `/studio`, `/systems`, `/academy`, `/motor-virro`, `/transformaciones`, `/transformaciones/[slug]`, `/sectores`, `/sectores/[slug]`, `/demo`, `/demo/[sector]`, `/diagnostico`, `/planes`, `/privacidad`, `/terminos` y `/labs`.
- `/labs` conserva un enlace externo a `https://www.virro.app/`; la reconstrucción de Impulsa no debe absorber ni editar el producto original.
- `DiagnosticForm` usa estado local y no hace `fetch`, Server Action ni escritura de datos. No se encontró cliente, variables de entorno, migración o Storage de Supabase.
- No se encontró proveedor de analítica ni evento de conversión.

## Metadatos, despliegue y dominio

- `app/layout.tsx` contiene metadata base, Open Graph básico y `metadataBase` en `https://www.virro.app`; el sitemap también referencia ese dominio. La configuración debe permanecer apuntando a producción mientras cualquier preview use su alias propio.
- `next.config.ts` no declara configuración adicional. No existen `vercel.json`, `.vercel/`, `.vercelignore` ni variables de entorno versionadas.
- La CLI de Vercel no está instalada en este entorno, por lo que no fue posible auditar el proyecto, los aliases o crear un preview autenticado desde aquí.
- Verificación externa de solo lectura: `virro.app` responde desde Vercel y redirige con 308 a `www.virro.app`; `www.virro.app` es un CNAME de Vercel y responde 200. No se modificó ningún alias ni dominio.

## Resultado de la auditoría

La reconstrucción debe iniciar únicamente después de cerrar los assets visuales y desbloquear la verificación de OriginKit. Sin fotografías, video o renders con licencia confirmada, construir el portafolio o la transformación en vivo convertiría la experiencia otra vez en superficies CSS, justo lo que esta orden prohíbe.
