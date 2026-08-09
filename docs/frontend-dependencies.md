# Dependencias frontend — propuesta previa

No se instaló ninguna dependencia durante la auditoría. El proyecto actual usa Next 16.2.12, React 19.2.4, Radix UI y Lucide. La siguiente tabla es una propuesta condicionada a la aprobación de la Entrega 1 y a la disponibilidad de assets.

| Dependencia | Propósito | Peso / costo | Alternativa descartada | Uso exacto | Impacto de performance |
| --- | --- | --- | --- | --- | --- |
| `motion` | Coreografías de entrada, tabs, estados del Motor y respeto de reducción de movimiento. | Paquete adicional; medir bundle antes de integrar. | Combinar Motion y GSAP: redundante. | Componentes cliente del hero, Motor y capacidades. | Carga diferida por componente; no animar fuera de viewport. |
| `@react-three/fiber` | Una sola escena 3D, si el Motor requiere volumen real tras validar el prototipo. | Costo alto para una landing; no instalar sin asset/escena final. | Three.js directo: mayor complejidad de integración. | Solo `MotorVirro`, importado dinámicamente. | DPR limitado, pausa fuera de viewport, fallback WebP. |
| `@react-three/drei` | Utilidades mínimas para la escena: controles y carga del objeto. | Complemento de R3F; importar selectivamente. | Utilidades propias duplicadas. | Solo si se aprueba R3F. | Sin precarga global; escena única. |

## Decisión inicial

La ruta preferida es **Motion únicamente** con un Motor pseudo-3D en CSS/WebGL ligero, salvo que un GLB aprobado demuestre que la escena 3D aporta valor y cumple la meta móvil. No se añadirá smooth-scroll: el sticky storytelling se resuelve con scroll nativo y CSS para evitar peso y problemas de accesibilidad.
