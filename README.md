# Virro Enterprise Demo Platform

Virro is operational understanding infrastructure for companies, teams, processes and AI. This demo turns imperfect digital communication into traceable Understanding Events, probabilistic readiness signals and operational deliverables.

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Architecture

- `app/` — Next.js routes and application shell
- `components/` — reusable layout, dashboard, inbox and module components
- `lib/config/` — module registry and navigation model
- `lib/data/` — demo fixtures
- `lib/domain/` — domain factories, validation, aggregation and relationship helpers
- `lib/services/` — replaceable analysis and scoring services
- `lib/types/` — typed contracts for workspaces, teams, role cards, workflows, events, analyses and reports
- `services/analysis/` — mock Analysis Engine, probabilistic scoring and pack-specific analyzers

The application includes an executive dashboard, seven executable demo scenarios, seven visual Analysis Pack modules, a nine-type Report Builder and explicit Privacy & Trust modes.
- `prisma/` — SQLite-ready enterprise domain model for local persistence

The current `analysisEngine` uses a deterministic `MockAnalysisEngine` and does not require an external AI provider. It receives an `UnderstandingEvent`, routes it to a pack analyzer and returns a consistent `AnalysisResult`. The engine boundary can be replaced later without coupling the Inbox to an LLM provider.

The public diagnosis form is intentionally mailto-based during this phase: the site does not post or retain its payload. A visible honeypot filters basic automated submissions before the visitor's email client is opened.

## Language delivery

Spanish and English currently share one canonical route and switch interface strings client-side. `hreflang` is intentionally omitted until each language has a stable, indexable URL; publishing alternate annotations before then would be misleading to crawlers.

Production domain: [virro.app](https://www.virro.app/)

## Security foundation

Virro Core enforces this lifecycle:

`Receive → Mask → Analyze → Discard → Store Signals → Report`

Safe mode is the default and only supported v0 analysis mode. Every analysis request follows `Auth → Tenant Guard → PrivacyPolicyGuard → Privacy Shield → Analyze-Safe → Store Signals`. Tenant credentials and the HMAC fingerprint key come from environment variables; they are never embedded in frontend code or committed to the repository.

Virro stores safe metadata, readiness scores, risk levels and patterns, missing-context categories, recommended packs, safe summaries, usage counters and audit metadata with `raw_stored=false`. It does not store raw conversations, complete documents, transcripts, emails, phone numbers, tokens or secrets by default. `store_raw=true` is rejected in safe mode.

Configure retention with `SAFE_OUTPUT_RETENTION_DAYS`, `AGGREGATE_PATTERNS_RETENTION_DAYS` and `AUDIT_LOGS_RETENTION_DAYS`. Raw-data retention remains `none`. Configure tenant credentials as a JSON map in `VIRRO_TENANT_API_KEYS` and provide a separate `VIRRO_FINGERPRINT_KEY`. Requests must include `X-API-Key` or a bearer token plus the matching `X-Tenant-ID`.

Public trust summaries are available at:

- `GET /v1/trust/data-handling-summary`
- `GET /v1/trust/retention-policy`
- `GET /v1/trust/security-overview`

Virro does not compete to store client information. Virro exists to analyze whether operational information is ready to move forward.

Virro no compite por almacenar la información del cliente. Virro existe para revisar si esa información está lista para avanzar.

## Launch DNS

DMARC must be configured in DNS before launch. Start in monitoring mode only after SPF, DKIM and report reception are verified:

```text
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@virro.app; pct=100
```

Do not move to `p=reject` until SPF/DKIM alignment and DMARC reports have been validated.
