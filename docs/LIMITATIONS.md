# Limitaciones reales de Build 001.1

- El compilador heurístico cubre expresiones de prueba y ofrece un baseline reproducible; no sustituye la comprensión amplia de un modelo remoto.
- La persistencia real requiere un proyecto Supabase y credenciales server-side aportadas por el operador.
- El proveedor real requiere una OpenAI API key con acceso a `gpt-5.6-luna`; iniciar sesión en ChatGPT o Supabase no entrega esa credencial.
- El adaptador usa Responses API y structured output, pero la llamada real no puede verificarse sin una API key y saldo del proyecto OpenAI.
- Los benchmarks deterministas detectan incumplimientos concretos. Los matices semánticos marcados como `manualReview` necesitan evaluación humana.
- El fixture DEMO solo comprueba el harness; no es evidencia de precisión ni forma parte del set ciego final.
- La evaluación no evita que una persona con acceso directo a la base inspeccione notas privadas. La disciplina experimental requiere congelar esta build antes de importar el set real y limitar dicho acceso.
- El precio configurado es una referencia versionada verificada el 2026-08-09; debe añadirse una nueva entrada cuando OpenAI cambie precios.
- No existe autenticación: la aplicación es un laboratorio interno y las tablas permanecen cerradas a clientes públicos.
- Build 001.1 no ejecuta Codex; solo genera el Execution Contract.
