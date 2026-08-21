# WEB-001 Implementation Plan

The original suggested sequence is modified so deployment isolation and claim authority precede visual implementation, while the smallest recognizable hero slice still appears early.

## WEB-001-A — Boundary and cutover design

- Create the separate marketing repository and Vercel project, or document the approved Option B migration bridge.
- Reserve `virro.app`/`www` for marketing and `app.virro.app` for product without changing production yet.
- Define rollback, preview protection, DNS change plan, owner, and acceptance evidence.
- Prove the marketing project has no product secrets or runtime imports.

**Gate:** independent builds and rollbacks are demonstrated in preview; product runtime remains unchanged.

## WEB-001-B — Claim authority, content model, and IA

- Implement `CapabilityStatus` in marketing content.
- Convert this ledger into reviewed content records.
- Finalize `/`, `/how-it-works`, `/trust`, `/company`, `/privacy`, `/terms`.
- Freeze hero headline/support copy and CTA readiness.

**Gate:** every material claim has an owner, status, and evidence link; no fake proof; `READINESS_AUTHORITY_SEPARATION=PASS`; `DEMO_STATE_MAPPING=EVIDENCE_BACKED`; `CONCEPTUAL_INTEGRATIONS_LABELED=YES`.

## WEB-001-C — Server-first shell and tokens

- Build semantic layout, navigation, footer, metadata, robots, sitemap, and structured data.
- Add design tokens, grid, typography, focus, reduced-motion, and responsive foundations.
- Keep all content server-rendered; no animation dependency yet.

**Gate:** complete crawlable no-JS page with passing keyboard/contrast baseline.

## WEB-001-D — First meaningful WorkState Field slice

- Implement the hero as an explicitly labeled `CONCEPTUAL WORKFLOW` or `PRODUCT DEMO` using generic source categories and separate readiness, authority, delegability, and execution stages.
- Add one deterministic source-version change and provenance disclosure as a small client island.
- Use custom HTML/CSS/SVG and a complete reduced-motion/static equivalent.

**Gate:** hero claim review passes before implementation expands; the demo does not produce or imply production authority; ten-second/CTO/nontechnical tests pass before additional modules are built.

## WEB-001-E — Readiness Gate

- Build authored signal checklist, state result, reason list, evaluator/time metadata, and live announcement.
- Use the evidence-backed `INSUFFICIENT_SIGNAL → READY` transition, with optional `HUMAN_REVIEW_REQUIRED`; never add a score.
- Do not implement `READY_WITH_CONDITIONS` as an active deterministic transition unless a later mapping is independently evidenced and authorized.

**Gate:** keyboard, touch, reduced motion, and exact claim mapping pass; `READINESS_AUTHORITY_SEPARATION=PASS`; `DEMO_STATE_MAPPING=EVIDENCE_BACKED`; `CONCEPTUAL_INTEGRATIONS_LABELED=YES`.

## WEB-001-F — Stale Propagation Map

- Build bounded desktop node/edge view and separate vertical mobile rail.
- Demonstrate one source change, affected descendants, and recovery.

**Gate:** no canvas, bounded DOM/SVG, static text equivalent, performance budget intact.

## WEB-001-G — One Intent / Multiple Authorized Views

- Implement server-rendered canonical state and accessible audience views.
- Bind every view to one visible source version and show joint staleness.

**Gate:** the module communicates verified alignment, not AI-generated documentation.

## WEB-001-H — Secondary modules

- Add Provenance Lens and Delegation Assurance Rail.
- Add Integration Constellation only with generic categories or evidence-backed named tools/status.
- Do not add the full showroom yet.

**Gate:** secondary modules do not exceed the core modules in visual priority or JS.

## WEB-001-I — Motion decision and polish

- Prototype semantic motion in CSS/WAAPI.
- Add exactly `motion@13.1.1` only if a measured requirement cannot be met otherwise.
- If added, use LazyMotion/m or `useAnimate` mini, and record before/after bundle impact.

**Gate:** initial motion layer ≤ 6 kB compressed; no idle loops; reduced-motion parity.

## WEB-001-J — Independent release audit

- Validate mobile, keyboard, screen reader, contrast, reduced motion, metadata, structured data, crawlability, and budgets.
- Re-audit claim ledger against the actual release.
- Verify product project/build/runtime are byte-for-byte or commit-identical to the approved pre-WEB-001 reference.
- Execute authorized DNS/domain cutover with separate rollback.

**Gate:** independent visual/product/claim audit passes; production change is separately approved.

## Recommended dependencies

```text
Required additions: none
Conditional addition: motion@13.1.1
Explicitly excluded in WEB-001:
  Aceternity package/template
  Magic UI package/template
  Motion Primitives package
  @xyflow/react
  @rive-app/*
```

## WEB-002 follow-up

Build the Deterministic Work Assurance Showroom only after the marketing surface, claims, and core state grammar are stable. Define a reviewed scenario schema, URL-addressable scenario state, comprehensive text equivalents, and analytics/privacy ownership before implementation.
