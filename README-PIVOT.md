# Preservación del pivote VIRRO IMPULSA

## Estado encontrado

El 3 de agosto de 2026 el directorio local contenía un repositorio Git recién inicializado, sin commits ni archivos del producto original. No existía una rama local que pudiera congelarse o clonarse. La web desplegada en `https://www.virro.app/` se inspeccionó de forma de solo lectura para registrar identidad, rutas y activos públicos.

## Regla de trabajo

- Todo el código nuevo vive en `pivot/business-modernization`.
- No se crea ni fusiona `main`.
- VIRRO Core continúa desplegado como producto original e independiente.
- `/labs` solo enlaza al producto original; no copia su teoría, datos ni funciones.
- Los activos públicos reutilizados se limitan al icono, tipografía y poster visual de marca.

## Alcance actual

MVP público con Home, Motor Virro, capacidades, transformaciones conceptuales, sectores, demos, calculadora, diagnóstico demo, modelos de atención y legales en borrador. No incluye Supabase, autenticación, admin, envío de formularios, uploads ni producción.

## Rollback

La rama puede descartarse sin afectar VIRRO Core porque no comparte historial, base de datos, secretos ni despliegue con el producto original. Antes de conectar el dominio, cree preview/staging y registre el commit aprobado.
