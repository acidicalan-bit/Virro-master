# Entrega 1 — wireframe y dirección visual

## Dirección visual

Azul profundo como campo base, azul eléctrico como señal de sistema, blanco y gris frío para jerarquía editorial, coral para la acción crítica. El verde ácido se retira de tokens, controles y foco. La página usará fotografía/editorial real, superficies mate y profundidad medida; no dashboards, vidrio repetido, neón, robots, cerebros ni circuitos genéricos.

Tokens de movimiento previstos: `--motion-fast: 300ms`, `--motion-base: 520ms`, `--motion-slow: 820ms`, `--ease-standard: cubic-bezier(.2,.7,.2,1)`, `--ease-emphasis: cubic-bezier(.16,1,.3,1)`. Todo tendrá una variante estable bajo `prefers-reduced-motion`.

## Wireframe de seis actos

```text
01 HERO · una promesa + dos CTAs
   [copy dominante]                         [Motor Virro / negocio real transformándose]

02 TRANSFORMACIÓN EN VIVO · sticky scroll
   [foto de establecimiento] -> identidad -> aplicación física -> web -> chatbot -> seguimiento -> capacitación

03 CAPACIDADES · panel único con estados
   [Studio] [Systems] [Academy]              [demostración concreta que se sustituye]

04 PORTAFOLIO · tres casos visuales
   [Estética antes/después] [Tienda antes/después] [Taller/Clínica antes/después]

05 ASÍ TRABAJAMOS · tres pasos
   Vemos tu negocio -> mostramos su siguiente versión -> construimos el cambio contigo

06 CONVERSIÓN · formulario mínimo y WhatsApp
   Nombre · negocio · giro · colonia · WhatsApp · fotografía · necesidad
```

## Prototipos requeridos antes de código final

No se produjo un screenshot o bitmap del hero: la herramienta de generación de imágenes no está disponible en esta sesión y no existen assets visuales aprobados para representarlo. Se deja este wireframe deliberadamente sin una falsa imagen de portafolio. El prototipo visual debe elaborarse al recibir los assets o autorización expresa para generar assets, y debe cubrir desktop 1440×900 y móvil 390×844.

## Matriz responsive

| Formato | Decisión |
| --- | --- |
| Desktop 1440×900 | Hero de dos zonas; Motor visible junto al mensaje; sticky storytelling con imagen dominante. |
| Tablet 768×1024 | Motor bajo el copy; transformación en dos tramos de scroll; controles de tabs amplios. |
| Móvil 390×844 | Titulares de 9–11 palabras; fallback estático del Motor; story por etapas verticales; controles de al menos 44 px; sin overflow horizontal. |

## Bloqueos de la siguiente etapa

1. Acceso navegable a OriginKit para verificar componentes y licencia.
2. Assets reales o autorizados para el hero, la transformación y los tres casos.
3. Configuración/credenciales de Supabase Storage y base de datos, además del evento de analítica, antes de afirmar que el formulario guarda datos.
4. Acceso autenticado a Vercel para crear solamente un preview cuando corresponda.
