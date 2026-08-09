# Limitaciones reales de Build 001

- El compilador heurístico cubre expresiones de prueba y ofrece un baseline reproducible; no sustituye la comprensión amplia de un modelo remoto.
- La persistencia real requiere un proyecto Supabase y credenciales server-side aportadas por el operador.
- El adaptador remoto presupone una API compatible con `chat/completions` y `response_format: json_schema`.
- Los benchmarks deterministas detectan incumplimientos concretos. Los matices semánticos marcados como `manualReview` necesitan evaluación humana.
- No existe autenticación: la aplicación es un laboratorio interno y las tablas permanecen cerradas a clientes públicos.
- Build 001 no ejecuta Codex; solo genera el Execution Contract.
