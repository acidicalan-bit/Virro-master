# Cycle 6 — Production readiness QA

Date: 2026-07-17  
Branch: `feature/virro-universal-flow-refinement`  
Environment: local production server, `next start` on `http://localhost:3101`

## Scope

Cycle 6 is an additional closeout pass after the planned Cycle 5. It focuses on release confidence rather than new product scope:

- keyboard traversal and visible focus across key public, demo, app and legal routes;
- app-shell accessible-name cleanup for stacked brand text and visible count badges;
- lab performance / SEO / accessibility / best-practices check on production build;
- public-claims review for unsupported claims before promotion.

## Route coverage

Validated routes:

- `/`
- `/demo`
- `/app/inbox`
- `/legal/privacy`

Additional routes remain covered by Cycle 5 final QA and contract tests.

## Keyboard and semantic navigation

Evidence: `docs/qa/cycle-6-keyboard-routes.json`

Result: pass.

- All sampled visible focusable controls had a visible focus indicator.
- `/app/inbox` sidebar brand link now exposes `aria-label="Virro Enterprise"`.
- `/app/inbox` sidebar inbox link now exposes `aria-label="Bandeja de entendimiento"`.
- The visible inbox count badge remains visible, but is `aria-hidden`, so it is not appended to the link accessible name.

## Lighthouse lab check

Evidence: `docs/qa/cycle-6-lighthouse-home-summary.json`

Result: pass.

| Category | Score |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

Key metrics:

- FCP: 0.5 s
- LCP: 0.8 s
- TBT: 0 ms
- CLS: 0
- Speed Index: 0.7 s

Note: current Lighthouse latest failed once with `NO_LCP`; Lighthouse `12.8.2` produced the report successfully, but the CLI exited nonzero after writing JSON because Windows could not clean up a temporary directory (`EPERM`). The compact summary is the committed artifact.

## Accessibility scan

Command:

`pnpm dlx @axe-core/cli http://localhost:3101/ http://localhost:3101/demo http://localhost:3101/app/inbox http://localhost:3101/legal/privacy --browser chrome --load-delay 1000 --timeout 120`

Result: pass, 0 violations across:

- `/`
- `/demo`
- `/app/inbox`
- `/legal/privacy`

Manual testing remains required for full accessibility coverage, but the automated smoke set is clean.

## Public claims review

Evidence: `docs/public-claims-and-limitations.md`

Result: pass with human-approval caveat.

- No new public metrics, certifications, productive connectors, SLAs, retention automation claims or customer outcomes were added.
- Human legal, commercial and operations approval is still required before promoting any pilot/planned/future-vision capability as generally available.

## Files changed in Cycle 6

- `components/layout/app-shell.tsx`
- `docs/public-claims-and-limitations.md`
- `docs/qa/cycle-6-keyboard-routes.json`
- `docs/qa/cycle-6-lighthouse-home-summary.json`
- `docs/qa/cycle-6-production-readiness.md`

## Release assessment

Ready to merge from an implementation QA standpoint once CI matches local checks. Remaining risk is not code-level: the public claims register still requires owner approval before production messaging expands beyond the documented statuses.
