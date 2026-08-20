# Technical Web Architecture

## Current fact pattern

The canonical repository is a trust-sensitive Next.js monolith whose `/` renders Intent Lab and whose API tree includes authentication, compilation, Field Beta execution, evaluations, and internal labs. The live public marketing site is a Vercel production deployment from a different branch/commit in the same repository. This arrangement has deployment coupling, route collision, and source drift.

## Deployment options

| Criterion | Option A: same app (`/` marketing, `/app` product) | Option B: separate deployments, same repo | Option C: separate marketing repo/project |
| --- | --- | --- | --- |
| Security isolation | Low: shared runtime/config/build graph | Medium: separate projects/env, shared source history | High: separate source, build, env, access and project |
| Deployment coupling | High | Medium | Low |
| Developer velocity | Fast initially; costly collisions later | Good with path ownership/CI discipline | Good after bootstrap; explicit cross-repo coordination |
| SEO | Good if metadata/routes disciplined | Excellent; host boundary is clear | Excellent; marketing owns crawl surface |
| CI coupling | High | Medium/high | Low |
| Trust-kernel risk | Highest | Medium | Lowest |
| Maintenance | One repo, complex boundaries | One repo, duplicated project configuration | Two repos/projects, simple responsibility |
| Vercel configuration | One project; shared settings | Two projects connected to same repo/root or branch | Two projects connected to separate repos |
| Rollback isolation | Poor | Good | Best |
| Decision | **REJECT** | **MODIFY / migration bridge** | **KEEP / recommend** |

## Recommendation

Adopt **Option C**:

```text
Spaceship registrar / DNS control
            │
            ├── virro.app + www.virro.app
            │       └── Vercel marketing project
            │             └── separate marketing repository
            │
            └── app.virro.app
                    └── Vercel product project
                          └── acidicalan-bit/Virro-master
```

Confidence: **HIGH** for the isolation principle; **MEDIUM** for exact migration mechanics until current DNS ownership, Vercel production protection, and product hostname readiness are reviewed in WEB-001-A.

Do not transfer domain registration merely to achieve this architecture. Spaceship can remain registrar/DNS provider; only DNS records need to point to the intended Vercel projects during an authorized cutover.

## Migration bridge

If creating a marketing repository is temporarily blocked, use Option B with two Vercel projects and explicit root directories/branch policy. Do not continue using one production project whose aliases can be reassigned by unrelated product branches. The bridge must include:

- dedicated production branch or root for marketing;
- protected product project and separate environment values;
- independent domain aliases;
- path-based CI that does not rebuild/deploy the other surface;
- a documented rollback for each host.

## Server-first component boundary

```text
MarketingRoot (Server Component)
├── Header / navigation (server)
├── Hero copy + static WorkState frame (server)
│   └── WorkStateController (small client island)
├── Problem / positioning / trust copy (server)
├── ReadinessGate (client island; native controls)
├── StalePropagation (client island; authored data)
├── AuthorizedViews (client island or server + tabs)
├── Secondary modules (server-first; disclose interactively)
└── Footer / metadata / structured data (server)
```

Never mark the whole homepage `"use client"`. Each interactive island receives serializable authored data and renders a complete initial state on the server.

## Signature implementation strategy

- Semantic HTML owns all labels, states, controls, lists, and evidence.
- SVG owns bounded connector lines only; avoid canvas.
- CSS variables/tokens own theme and state presentation.
- React state owns a small deterministic scenario, never product authority.
- Public module data is authored content with explicit `CapabilityStatus`.
- No public OpenAI/provider call, prompt surface, chatbot, or dynamic generated marketing content.

## Dependency recommendation

Exact WEB-001 runtime addition: **`motion@13.1.1` only, conditional on a measured prototype showing CSS/WAAPI cannot meet the motion vocabulary.** If added, use `LazyMotion`/`m` or `useAnimate` mini and enforce the JS budget. Otherwise add **no runtime dependency**.

Do not add Aceternity, Magic UI, Motion Primitives, `@xyflow/react`, Rive, a UI kit, or a second icon library in WEB-001. Custom CSS/HTML/SVG is sufficient for the selected modules.

## Configuration ownership

| Concern | Marketing project | Product project |
| --- | --- | --- |
| Domains | `virro.app`, `www.virro.app` | `app.virro.app` |
| Environment | Public marketing-only values | Supabase, providers, product secrets |
| Auth | None in WEB-001 | Existing product auth |
| CSP | Static marketing sources only | Product-specific API/storage sources |
| Analytics | Defer until consent/privacy decision | Independent product observability |
| Deployment protection | Public production; private previews | Strong preview/access protection |
| Rollback | Marketing release only | Product release only |

## Trust invariants

- Marketing has no import path to server authority, provider, persistence, or canonical commit modules.
- Product secrets never exist in the marketing project.
- Marketing content cannot change product runtime behavior.
- Product routes and internal labs do not inherit marketing navigation or crawl metadata.
- Public capability status is reviewed against the claim ledger before release.
