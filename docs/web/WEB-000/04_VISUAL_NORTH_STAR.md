# Visual North Star

## Direction

**A living assurance instrument.** The page resembles a precise technical field notebook joined to a versioned state inspector. It is quiet at rest. It becomes alive when a signal arrives, a binding resolves, a gate changes state, or provenance is inspected.

The balance is 80% structural clarity and 20% visual surprise.

## Signature visual grammar

- Nodes are facts, requirements, actors, and views—not decorative dots.
- Lines are typed relationships: signal, dependency, authorization, derivation, or evidence.
- Every state surface may expose source, timestamp, version, and binding.
- A change is shown as a transition from one authorized version to another.
- Staleness propagates along real dependency lines; it is not a generic red alert.
- Gates show conditions and the exact missing or stale cause.

## Palette roles

Virro should not be “another black AI page.” Use a warm, near-black technical canvas with a paper-like light surface available for dense reading.

| Role | Direction | Use |
| --- | --- | --- |
| Canvas | `#0B0D0F` | Hero and interactive field |
| Raised field | `#12161A` | Work-state surfaces |
| Paper | `#F3F1EA` | Documentation and long-form routes |
| Primary ink | `#F2F4EF` / `#171A18` | High-contrast text by theme |
| Muted ink | `#939C98` / `#656B67` | Metadata and explanations |
| Structural line | `#2A3133` / `#D4D2C9` | Grid, dividers, inactive bindings |
| Signal cyan | `#77D7D1` | New signal / inspectable flow |
| Authority amber | `#D7B56D` | Human authority, conditional readiness |
| Committed violet | `#A99BEF` | Versioned/committed state, sparingly |
| Stale rust | `#C97C63` | Changed dependency or stale state |
| Policy slate | `#8996A5` | Policy block / unknown |

Color is never the only state encoding. Pair shape, line style, icon, and label.

## Typography

- Display: a restrained grotesk/system sans, large but not theatrical.
- Body: high-legibility sans with 65–75 character measure.
- Metadata: system mono for version IDs, hashes, timestamps, and bindings.
- Do not load multiple decorative variable fonts in WEB-001. Prefer system fonts first; add one self-hosted family only if measured value justifies it.

## Background

Use a measured coordinate grid, faint signal rails, and topological junctions. The grid should encode alignment and scale. Avoid stars, nebulae, auroras, random particles, matrix rain, and glowing Web3/cyberpunk scenes.

## Composition rules

### Prefer

- One dominant mechanism per viewport.
- Persistent labels and evidence metadata.
- Structured asymmetry with clear reading order.
- State transitions that remain understandable in a static frame.
- Product surfaces built from semantic HTML and simple SVG connectors.
- Restraint: large quiet regions around dense state modules.

### Avoid

- Generic gradient headline words.
- Infinite logo marquees or fabricated logo rails.
- Bento cards without a semantic reason.
- Glassmorphism, floating blobs, 3D globes, and fake command terminals.
- 0–100 gauges, vanity metrics, or animated counters.
- Hover-only explanations or canvas-only diagrams.

## Hero composition

```text
┌──────────────────────────────────────────────────────────────┐
│ WORK ASSURANCE / WORK STATE v17                     12:42:09 │
│                                                              │
│ Keep work aligned across      [Slack decision] ──┐           │
│ people, tools and AI.         [Jira scope] ──────┼─▶ v17     │
│                                [Figma v14] ───────┘  READY    │
│ Virro maintains one current,                              │   │
│ authorized state and shows      CHANGE Figma v14 → v15    │   │
│ when work no longer supports       ├─ Dev  → STALE         │   │
│ delegation.                         └─ QA   → STALE         │   │
│                                                              │
│ [See how it works] [Join pilot]       inspect provenance ↗   │
└──────────────────────────────────────────────────────────────┘
```

## Originality test

Remove the Virro logo. If the page can still be identified through WorkState versions, typed dependencies, readiness conditions, stale propagation, evidence inspection, and authority gates, it passes. If it becomes a generic dark AI SaaS page, a Linear/Vercel clone, or a component-library demo, it fails.
