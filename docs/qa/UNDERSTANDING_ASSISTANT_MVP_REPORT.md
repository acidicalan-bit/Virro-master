# Virro Understanding Assistant MVP — Technical and QA Evidence

**Date:** 2026-07-10  
**Working branch:** `feature/virro-understanding-assistant-mvp`  
**Main/master untouched during implementation:** Yes.  
**Production target:** `mirro-web/virro-web` → `virro.app` after final validation.

## Project map

- Framework: Next.js 16 App Router, TypeScript, Tailwind CSS, Prisma-ready SQLite schema.
- Public landing: not present in this repository. `/` is the enterprise dashboard, not a marketing landing.
- Dashboard: `app/page.tsx`, `components/dashboard/dashboard.tsx`, `lib/services/dashboard-insights.ts`.
- Understanding Inbox / New Event: `app/inbox/page.tsx`, `components/inbox/inbox-workbench.tsx`.
- Sidebar and workspace shell: `components/layout/app-shell.tsx`, `lib/config/modules.ts`.
- Pack registry: `lib/config/pack-registry.ts`.
- Layered context: `lib/config/virro-context.ts`.
- Assistant pipeline: `services/assistant/`.
- Existing analysis/scoring: `services/analysis/`.
- Mock event store: `lib/services/assistant-event-store.ts`.
- Demo scenarios: `lib/data/demo-scenarios.ts`, `components/scenarios/demo-scenario-library.tsx`.
- Talent & Staffing: `components/packs/talent-staffing-pack.tsx`, `services/analysis/packAnalyzers/talentStaffingAnalyzer.ts`.
- Reports: `components/reports/report-builder.tsx`, `lib/services/report-builder.ts`.
- Privacy: `components/privacy/privacy-trust.tsx`, `lib/security/sensitive-data.ts`.

## Controlled pipeline

The `assistantOrchestrator` executes a bounded sequence:

1. Intake — one source input per run.
2. Classification — explicit pack or deterministic pain-signal classification.
3. Clarification — maximum three critical questions.
4. Analysis — meaning-loss risks and missing context.
5. Scoring — probabilistic readiness and risk estimates.
6. Output — one recommended operational artifact.
7. Self-check — Virro category and trust safeguards.
8. Human confirmation — save, adjust or discard.

Every result includes an `AnalysisTrace`, assumptions, human-validation requirement and an Audit/Pilot opportunity. No external AI provider or API key is required.

## Talent & Staffing separation

Consulting Delivery remains focused on project execution between client, consultancy and delivery team. Talent & Staffing is a separate official pack focused on client role need, staffing interpretation, candidate communication and hiring-team expectations. It does not evaluate people, improve CVs, replace an ATS or automate hiring decisions.

## Mock persistence and privacy

Saving an event stores minimized evidence in browser local storage for the demo. The stored event replaces raw input with a privacy marker, preserves classification, estimated scores, AnalysisTrace, audit opportunity and meaning-loss risks, and feeds dashboard/report calculations. Pattern Memory remains disabled by default and never stores raw private text in this MVP.

## Localization

- Default locale: Spanish.
- Available locale: English.
- Selector: persistent ES/EN control in desktop and mobile header.
- Localized surfaces: shell/navigation, dashboard, metric explanations, Inbox assistant, scenarios, primary pack messaging, Talent & Staffing, reports and Privacy & Trust.
- Original demo inputs remain visible in their authored language as source evidence; UI controls and explanatory copy follow the selected locale.

## Technical validation

| Check | Result |
|---|---|
| ESLint | PASS |
| Vitest | PASS — 22/22 tests across 6 files |
| Next.js production build | PASS — 17 generated pages |
| Assistant classification test | PASS |
| Maximum three critical questions | PASS |
| AnalysisTrace eight-loop contract | PASS |
| Raw-input retention flag | PASS — `false` |
| Talent & Staffing audit mapping | PASS |
| Desktop Spanish/English toggle | PASS |
| Mobile 390 × 844 Spanish/English toggle | PASS |
| Mobile horizontal overflow | PASS — none detected |
| Browser console warnings/errors | PASS — none detected |

## Functional evidence

- Dashboard: Spanish guidance block, localized metric explanations, estimated-score disclaimer and saved-assistant-event evidence.
- Understanding Inbox: enterprise guided assistant, New Event and Critical Flow Discovery entry points, optional pack selection and pain-first classification.
- Assistant result: recommended pack, confidence, Meaning Loss risks, missing context, maximum three questions, scores, output, Audit/Pilot and AnalysisTrace.
- Talent scenario: QA Automation Senior pain classified to Talent & Staffing and recommended `Talent & Staffing Understanding Audit`.
- Human confirmation: Save updates mock evidence; Adjust and Discard remain controlled actions.
- Reports: saved assistant events contribute to report scope.
- Privacy & Trust: visible Private Mode, optional Pattern Learning, no employee surveillance and no personal scoring.

## Commits

- `b89b862` — Add bilingual Virro shell and dashboard foundation.
- `02df373` — Add assistant domain and layered Virro context.
- `29666ab` — Add controlled understanding assistant pipeline.
- `9190c16` — Connect Understanding Assistant to the Inbox.
- `85bd78c` — Add Talent and Staffing pack and assistant scenarios.
- `bde6969` — Localize packs, reports and trust safeguards.

## Known limitations and next audit risks

- The mock store is browser-local, not authenticated server persistence.
- Authentication, authorization and tenant isolation remain required before real customer data.
- Privacy mode is demonstrated and enforced in the mock save path; a production backend must enforce retention across logs, analytics and backups.
- The current CSP still uses inline allowances required by the present Next.js hydration strategy.
- A public marketing landing is not included in this repository and remains a separate audit item.
- The deterministic classifier is an MVP; confidence must not be interpreted as certainty.

## Self-check conclusion

The MVP is not a floating chatbot, writing assistant, prompt generator, ATS or automated evaluator. It converts ambiguous information into auditable Understanding Events and operational audit opportunities through a bounded deterministic pipeline. The implementation is ready for a new Virro Master Router audit after production deployment.
