# Formato de evaluación ciega

Importa un archivo JSON con este envelope:

```json
{
  "schema_version": "1.0.0",
  "slug": "evaluation-set-unique-slug",
  "name": "Nombre interno",
  "description": "Descripción opcional",
  "source_label": "Quién preparó el set",
  "is_demo": false,
  "cases": [
    {
      "id": "external-case-id",
      "raw_input": "Lenguaje humano original",
      "context": "Contexto disponible o null",
      "domain": "Dominio opcional",
      "private_evaluator_notes": "No se muestra antes de completar la sesión",
      "expected_high_level_behavior": "Orientación opcional para revisión posterior"
    }
  ]
}
```

Reglas:

- `slug` usa minúsculas, números y guiones.
- Los IDs de caso deben ser únicos dentro del set.
- El archivo acepta entre 1 y 500 casos.
- La importación valida estrictamente campos y límites.
- Un set importado no puede editarse ni reemplazarse.
- Un SHA-256 del contenido normalizado evita importar el mismo set con otro nombre.
- `private_evaluator_notes` y `expected_high_level_behavior` permanecen en el servidor hasta que toda la sesión se completa.

El archivo [blind-eval-demo.json](../fixtures/blind-eval-demo.json) existe únicamente para verificar el flujo. No debe incluirse en resultados de precisión.
