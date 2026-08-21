# Interactive Module Catalog

## Priority decision

- **Hero signature:** WorkState Field
- **WEB-001 core:** Readiness Gate; Stale Propagation Map; One Intent / Multiple Authorized Views
- **Secondary:** Provenance Lens; Delegation Assurance Rail; Integration Constellation
- **WEB-002:** Deterministic Work Assurance Showroom

The expected default recommendation survives the audit with one change: **Integration Constellation is intentionally secondary and static-first**, because unverified integrations must not be implied as available.

## Module scorecard

Scores are 1–5. For implementation complexity and performance risk, 5 means harder/riskier.

| Module | Clarity | Novelty | Brand ownership | Visual impact | Complexity | Perf risk | Mobile | A11y | Commercial | Recommendation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WorkState Field | 5 | 5 | 5 | 5 | 4 | 3 | 4 | 4 | 5 | WEB-001 HERO |
| Readiness Gate | 5 | 4 | 5 | 4 | 3 | 2 | 5 | 5 | 5 | WEB-001 CORE |
| Stale Propagation Map | 5 | 5 | 5 | 5 | 4 | 3 | 4 | 4 | 5 | WEB-001 CORE |
| One Intent / Multiple Views | 5 | 4 | 5 | 4 | 3 | 2 | 5 | 5 | 5 | WEB-001 CORE |
| Provenance Lens | 4 | 5 | 5 | 4 | 3 | 2 | 5 | 5 | 4 | WEB-001 SECONDARY |
| Delegation Assurance Rail | 4 | 4 | 5 | 4 | 3 | 2 | 5 | 5 | 5 | WEB-001 SECONDARY |
| Integration Constellation | 3 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 4 | WEB-001 SECONDARY |
| Deterministic Showroom | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | WEB-002 |

## 1. WorkState Field

**Purpose:** communicate Virro's placement and entire category in one mechanism.

```text
CONCEPTUAL WORKFLOW — EXAMPLE SOURCE CATEGORIES
[Planning requirement] ─ scope ─────┐
[Chat decision] ─────── signal ─────┤
[Design v14] ────────── version ────┼────▶ ┌────────────────────┐
[Code baseline] ─────── dependency ─┤      │ SCENARIO WORK STATE│
[Human approval] ────── authority ──┘      │ v17                │
                                            │ READINESS: READY   │
                                            └─────────┬──────────┘
                                                      │
                                            AUTHORITY BOUNDARY
                                      represented conceptually;
                                      not produced by this demo

CHANGE: Design v14 → v15
                                      [Dev view] STALE  [QA view] STALE
```

**Anatomy:** scenario label, generic source rail, typed connection, versioned work-state card, readiness chip, separate authority boundary, dependent views, change event, provenance trigger.

**Interaction:** play/pause one deterministic change; inspect any input; reset. No freeform prompt. Keyboard controls mirror pointer controls.

**Implementation contract:** custom semantic HTML + decorative SVG connectors; server-rendered initial frame; a small client controller only for transitions. Static text fallback shows the same before/after facts. Reduced motion swaps moving pulses for immediate line/style/state changes.

## 2. Readiness Gate

**Purpose:** explain readiness as explicit state, not confidence.

```text
PRODUCT DEMO — READINESS ONLY

REQUIRED SIGNALS                       READINESS
✓ Approved scope             current   ┌─────────────────────┐
! Compatible current Signal  missing   │ INSUFFICIENT_SIGNAL │
                                        │ requirement missing │
                                        └─────────────────────┘

Add compatible current Signal
✓ Compatible current Signal  current   ┌─────────────────────┐
                                        │ READY               │
                                        │ requirements        │
                                        │ satisfied           │
                                        └─────────────────────┘

──────────────────── AUTHORITY BOUNDARY ────────────────────
AUTHORITY: not evaluated here

Optional authored example:
human review required                  HUMAN_REVIEW_REQUIRED
```

**Anatomy:** required-signal list, qualification outcome, dependency version, evaluator/time, gate state, reason list, and an explicit authority boundary. No permitted next action is inferred.

**Interaction:** visitors toggle one authored Signal and see the evidence-backed deterministic transition `INSUFFICIENT_SIGNAL → READY`; an optional authored scenario may show `HUMAN_REVIEW_REQUIRED`. Text announces the result in an `aria-live="polite"` region.

**Implementation contract:** native checkbox/button controls; no graph library; no score. `READY` means only that the applicable readiness requirements are satisfied for the evaluated state. It does not mean authorized, permission granted, delegable, may execute, or may move to execution. `READY_WITH_CONDITIONS` is not an active WEB-001 demo transition. Mobile becomes a vertical checklist followed by the gate and the separate authority boundary.

## 3. Stale Propagation Map

**Purpose:** demonstrate how a source change invalidates dependent work before later contract, authority, delegation, or execution stages.

```text
SOURCE v14 ─────┬────▶ DEV SPEC v8 ───▶ EXECUTOR A
                ├────▶ QA PLAN v5  ───▶ REVIEWER
                └────▶ DOC VIEW v9 ───▶ STAKEHOLDER

SOURCE v15 COMMITTED
                ├────▶ DEV SPEC v8   STALE
                ├────▶ QA PLAN v5    STALE
                └────▶ DOC VIEW v9   STALE
```

**Anatomy:** source version, dependency edges, derived views, executor endpoints, changed binding, stale paths, resolution action.

**Interaction:** commit one predefined source change, highlight affected paths, inspect why. Lines use dash/shape changes as well as color.

**Implementation contract:** fixed graph authored as data; HTML nodes and SVG edges; no canvas. Mobile transforms into a vertical dependency rail with affected descendants grouped beneath the changed source.

## 4. One Intent / Multiple Authorized Views

**Purpose:** position verified documentation as several views derived from the same current work state.

```text
                 ┌─ DEV VIEW     task + constraints     [bind: v17]
INTENT + v17 ────┼─ QA VIEW      acceptance criteria    [bind: v17]
                 ├─ EXEC VIEW    least-authority input  [bind: v17]
                 └─ BUYER VIEW   outcome + conditions   [bind: v17]
```

**Anatomy:** canonical intent/state, view tabs, audience label, visible omissions, shared binding/version, stale marker.

**Interaction:** switch tabs; changed source invalidates all views together. Use tabs with correct keyboard behavior or a server-rendered stacked layout on small screens.

**Implementation contract:** text and structured lists; no animated text morphing. Crossfade is optional and disabled for reduced motion.

## 5. Provenance Lens

**Purpose:** make evidence inspection a recognizable Virro trait.

```text
ASSERTION: “QA criteria accepted”                       [inspect]
┌──────────────────────────────────────────────────────────────┐
│ source: human.acceptance       actor: role/owner             │
│ captured: 2026-08-20T12:42Z   version: acceptance/v3        │
│ binds: work-state/v17          status: current               │
└──────────────────────────────────────────────────────────────┘
```

**Anatomy:** assertion, source, provenance class, actor/authority, capture time, validity, content/version binding.

**Interaction:** disclosure button opens an inline detail region. Touch and keyboard are first-class; hover may only preview what click/focus can persist.

**Implementation contract:** `<button aria-expanded>` + adjacent region; no cursor-following lens.

## 6. Delegation Assurance Rail

**Purpose:** show that human and AI delegation share one assurance sequence.

```text
INTENT ─ CONTEXT ─ READINESS ─ CONTRACT ─ AUTHORITY ─ EXECUTION ─ EVIDENCE ─ ACCEPT
  ●         ●          ●            ●          ●           ○           ○         ○
Human → Human        Human → AI        AI → Human        AI → AI
```

**Anatomy:** assurance stages, actor pair, current stage, blocked reason, evidence return, acceptance owner.

**Interaction:** select an authored actor pair and see the same assurance stages relabeled, not a different system.

**Implementation contract:** ordered list with buttons; line is decorative. Mobile is the native vertical form.

Readiness, contract, authority, and execution remain separate stages. No interaction may shortcut `READINESS → EXECUTION`, and no stage auto-advances because a readiness result is `READY`.

## 7. Integration Constellation

**Purpose:** show that Virro connects to work sources without becoming the system of record.

```text
[Planning]   [Design]   [Chat]   [Code]   [Docs]
      \          |        |        |        /
       ───────────── [WORK STATE] ─────────
                 capabilities labeled:
             conceptual / planned / pilot / available
```

**Anatomy:** integration class, example tool only when verified, direction of signal, status, connector boundary.

**Interaction:** filter by source type and status. Do not animate orbital motion or show unverified logos.

**Implementation contract:** static-first grid/rail. Use generic categories until the claim ledger proves named integration availability.

## 8. Deterministic Work Assurance Showroom

**Purpose:** let a visitor manipulate an authored work scenario and observe deterministic state responses.

```text
SCENARIO: release handoff
[x] scope approved
[x] source current
[ ] security review
[change source version]

RESULT: NEEDS_CONTEXT
REASONS: SECURITY_REVIEW_MISSING, QA_VIEW_STALE
EVIDENCE: inspect exact bindings
```

This is a WEB-002 module because it requires a reviewed scenario schema, state engine, robust keyboard/mobile behavior, analytics/privacy decision, and comprehensive claim labeling. It remains local/deterministic and makes no provider call.

## Component candidate contract

| Candidate | Purpose | Semantic meaning | Dependency | JS weight | Client required | Mobile | A11y | Reduced motion | SSR | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Custom HTML + CSS + SVG | All signature modules | Native headings, lists, controls, status, relationships | Existing stack | Minimal | Only controller islands | Purpose-built | Full native semantics | Instant state changes | Yes | Complete static explanation |
| Motion `13.1.1` with LazyMotion | Complex cross-module transitions only | No semantic ownership | `motion` | Target ~4.6 kB initial feature layer per official guidance | Yes | Same DOM | Must preserve focus/announcements | `useReducedMotion` | Initial DOM yes | CSS/no-motion state |
| Motion Primitives source | Later disclosure/transition experiments | Primitive only | Motion + Tailwind assumptions | Per copied component | Usually | Review per primitive | Review per primitive | Must be authored | Varies | Native equivalent |
| React Flow `12.11.3` | Future exploratory graph | Interactive node/edge graph | `@xyflow/react` | Material | Yes | Requires alternate rail | Built-in support but requires authored labels | Disable animated edges | Supported with dimensions | Structured list |
| Rive `4.32.1` | Highly authored illustration | Canvas animation, not content authority | Rive runtime + WASM + asset | ~222 kB compressed minimum WASM before asset | Yes | Responsive canvas work | Separate full text equivalent | Separate static state | No meaningful content SSR | Static image/text |

## Performance and accessibility constraints

- Off-screen modules initialize only when near viewport and never block the hero.
- No continuous `requestAnimationFrame` loop at rest.
- No scroll listener that reads and writes layout on every frame.
- State changes are announced in text and do not depend on movement or color.
- SVG connector count stays bounded; decorative paths are `aria-hidden`.
- All module controls are reachable and operable by keyboard and touch.
