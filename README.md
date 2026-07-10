# Virro Enterprise Demo Platform

Virro is operational understanding infrastructure for companies, teams, processes and AI. This demo turns imperfect digital communication into traceable Understanding Events, probabilistic readiness signals and operational outputs.

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
- `prisma/` — SQLite-ready enterprise domain model for local persistence

The current `analysisEngine` uses a deterministic `MockAnalysisService` and does not require an external AI provider. Implement `AnalysisService` to connect a provider later without coupling the UI to it. Supporting services isolate scoring, reports, demo scenarios and pack definitions.

Production domain: [virro.app](https://www.virro.app/)
