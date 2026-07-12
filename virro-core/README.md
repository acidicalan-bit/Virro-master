# Virro Core Understanding Engine v0

Virro Core is the privacy-first rule engine behind audits, pilots and enterprise licenses. It receives operational information, masks identifiers, estimates readiness and stores safe signals rather than raw client content.

> Virro does not compete to store client information. Virro exists to analyze whether operational information is ready to move forward.
>
> Virro no compite por almacenar la información del cliente. Virro existe para revisar si esa información está lista para avanzar.

## Data lifecycle

`Receive → Mask → Analyze in memory → Discard raw → Store signals → Report`

Safe mode is mandatory in v0. There are no database columns for raw text, messages, documents, transcripts or conversation bodies. Persisted events contain identifiers, type, source, privacy mode, fingerprint and `raw_stored=false`. Analyses contain scores, categories, questions, recommended pack, safe next action and safe reports.

Logs contain request ID, endpoint, status, time and `raw_stored=false`; never payloads, authorization headers or detected values. Future connectors and LLM adapters must call Privacy Shield first. External LLM use is intentionally disabled in v0.

## Run locally

```bash
cd virro-core
python -m venv .venv
.venv/Scripts/activate     # Windows
pip install -e ".[test]"
set VIRRO_API_KEY=replace-with-a-local-secret
alembic upgrade head
uvicorn app.main:app --reload
pytest
```

OpenAPI: `http://localhost:8000/docs`. Health: `GET /health`.

## Docker + PostgreSQL

Copy `.env.example` to `.env`, set `POSTGRES_PASSWORD` and `VIRRO_API_KEY`, then run `docker compose up --build`. Production expects HTTPS termination, encrypted managed database storage and a secrets manager. Do not commit `.env`.

## Key endpoints

- `POST /v1/understanding/analyze-safe`
- `POST /v1/privacy/detect`, `POST /v1/privacy/mask`
- `POST /v1/events`, `GET /v1/events/{id}`
- pack endpoints under `/v1/packs/{pack}/analyze`
- `POST /v1/reports/executive`, `GET /v1/reports/{id}`
- license and usage endpoints
- `GET /v1/trust/data-handling-summary`

All `/v1` requests require `X-API-Key`.

```bash
curl -X POST http://localhost:8000/v1/understanding/analyze-safe -H "X-API-Key: $VIRRO_API_KEY" -H "Content-Type: application/json" -d '{"tenant_id":"demo","event_type":"handoff","source_type":"api","content":"QA should review this soon. Contact alan@example.com","privacy_mode":"safe","store_raw":false}'
curl -X POST http://localhost:8000/v1/packs/ai-understanding/analyze -H "X-API-Key: $VIRRO_API_KEY" -H "Content-Type: application/json" -d '{"tenant_id":"demo","event_type":"ai_instruction","content":"Summarize this for leadership","privacy_mode":"safe","store_raw":false}'
curl -X POST http://localhost:8000/v1/reports/executive -H "X-API-Key: $VIRRO_API_KEY" -H "Content-Type: application/json" -d '{"tenant_id":"demo"}'
curl -X POST http://localhost:8000/v1/privacy/mask -H "X-API-Key: $VIRRO_API_KEY" -H "Content-Type: application/json" -d '{"content":"Email alan@example.com or +52 55 1234 5678"}'
```

## Retention and future operations

Tenant license defaults: raw data `none`, safe outputs 90 days, aggregate patterns 365 days and audit logs 365 days. Interfaces for verified tenant deletion and safe report/usage export are reserved in `lifecycle.py` and require authorization design before activation.

## v0 limitations

Masking and person-name recognition are heuristic, not guaranteed anonymization. The engine is deterministic and does not call an external LLM. API keys are tenant-level v0 credentials; rotation, RBAC, rate limiting, Alembic production migrations and verified deletion/export are next-cycle work.
