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

Production domain: [virro.app](https://www.virro.app/)

## Launch DNS

DMARC must be configured in DNS before launch. Start in monitoring mode only after SPF, DKIM and report reception are verified:

```text
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@virro.app; pct=100
```

Do not move to `p=reject` until SPF/DKIM alignment and DMARC reports have been validated.
