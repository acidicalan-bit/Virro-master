# Current State and Deployment

## Evidence boundary

| Item | Observed value | Evidence |
| --- | --- | --- |
| Canonical product repository | `acidicalan-bit/Virro-master` | GitHub repository metadata; repository ID `1297848418` |
| Requested baseline SHA | `9d20bd5bb2e64084ac1733588a6ecb794df58b7e` | GitHub commit and local checkout agree |
| Requested baseline tree | `8031a911dd6aceef8a77f890ce3dd960c5f26c62` | Local Git object |
| Current baseline homepage | `app/page.tsx` → `<IntentLab />` | Source at baseline |
| Live site | `https://www.virro.app/` | Browser and HTTP inspection |
| Live host/project | Vercel project `virro-web` | Authenticated Vercel read |
| Live repository | `acidicalan-bit/Virro-master` | Vercel deployment metadata |
| Live branch | `codex/prod-business-modernization` | Vercel deployment metadata |
| Live commit | `97c7c88d3270420f1c71cbc6ae0c613648e39f54` | Vercel deployment metadata |
| Live homepage source | Marketing homepage importing `MotorVirro`, `BeforeAfter`, `OpportunityCalculator`, and sector/case content | Source at live commit |
| Deployment source match | **NO** | Same repository, different branch/commit/homepage from baseline |

The live commit is an ancestor of the canonical baseline, but the baseline is not an ancestor of the live commit. Production therefore represents an older marketing line, not the baseline root experience.

## DNS and hosting observations

- `virro.app` resolves to a Vercel address and redirects permanently to `www.virro.app`.
- `www.virro.app` is a CNAME under `vercel-dns-017.com`.
- HTTPS responses identify Vercel and include HSTS.
- Spaceship may remain the registrar/DNS control plane; no repository or application hosting evidence was found there. Do not describe Spaceship as the application runtime without additional evidence.
- No deployment setting was changed during WEB-000.

## Current public homepage audit

The live homepage currently says “Transformamos cómo se ve, trabaja y vende tu negocio,” introduces VIRRO IMPULSA in CDMX, and organizes the offer around Studio, Systems, and Academy. It contains labeled conceptual transformations, a sector demo, an opportunity calculator with disclaimers, FAQ, and a diagnostic CTA.

| Section | Decision | WEB-001 translation |
| --- | --- | --- |
| Hero transformation promise | REJECT | Work Assurance category + WorkState Field mechanism |
| Café/device visual | REJECT | Versioned authorized state and dependency field |
| “Pieces work together” | MODIFY | People, tools, and AI share one current work state |
| Studio / Systems / Academy motor | REJECT | Readiness / evidence / authority modules |
| Before/after visual transformation | REJECT | Before/after source-change propagation |
| Conceptual portfolio disclaimer | KEEP | Scenario labeling standard |
| Sector demo | MODIFY | Deterministic workflow showroom |
| Editable opportunity calculator | DEFER | No quantified outcome model until validated evidence exists |
| Observe / visualize / prioritize / implement | MODIFY | Intent / context / readiness / contract / verification |
| FAQ and expectation setting | KEEP | CTO and nontechnical buyer questions |
| Diagnostic CTA | REJECT | “Join pilot / Request access” |

## Baseline route inventory

The canonical baseline builds 25 application routes: 8 page routes and 17 API routes. Next.js also emits framework routes such as `/_not-found`; those are excluded from the product count.

### Page routes

| Route | Class | Note |
| --- | --- | --- |
| `/` | PRODUCT | Intent Lab compiler; collides with future public marketing root |
| `/auth` | PRODUCT | Authentication surface |
| `/benchmarks` | INTERNAL | Internal benchmark UI |
| `/blind-eval` | INTERNAL | Internal blind evaluation UI |
| `/field-beta` | PRODUCT | Authenticated, flag-gated Precision Edit path |
| `/precision-edit-lab` | LEGACY | Redirects to `/field-beta` |
| `/preservation-study` | INTERNAL | Controlled research study |
| `/transaction-lab` | DEMO | Lab-only transaction surface |

### API routes

| Route family | Class | Note |
| --- | --- | --- |
| `/api/auth/provision` | PRODUCT | Identity provisioning |
| `/api/compile`, `/api/execution-contract`, `/api/feedback` | PRODUCT | Intent Lab workflow |
| `/api/field-beta` | PRODUCT | Supported authenticated execution entrypoint |
| `/api/core-lineage` | INTERNAL | Lineage inspection |
| `/api/benchmarks` | INTERNAL | Benchmark operations |
| `/api/blind-eval/*` (6) | INTERNAL | Evaluation workflow |
| `/api/precision-edit` | LEGACY | Disabled canonical path |
| `/api/preservation-study`, `/api/preservation-study/media` | INTERNAL | Guarded study paths |
| `/api/transaction-lab` | DEMO | Guarded fake/in-memory lab |

### Collision

The critical collision is `/`: the canonical product claims it for Intent Lab while public marketing also requires it. Adding marketing routes to the same application would place public navigation, metadata, and dependencies beside authentication and execution APIs. This is avoidable risk.

## Repository visual/technical baseline

- Next.js `16.3.0`, React `19.2.4`, server and client components.
- No dedicated animation, graph, UI-kit, or icon dependency in the canonical baseline.
- No `public/` directory at baseline.
- Global CSS is a restrained paper/surface design with one large shared stylesheet and responsive rules at 900px and 680px.
- Every `src/ui/*` primary lab is a client component; the root product surface hydrates the full lab.
- Reduced-motion CSS exists globally and collapses animation/transition duration.
- Focus-visible and skip-link foundations exist.
- Root metadata is only title/description. There is no baseline canonical, Open Graph, X image, structured data, robots, or sitemap implementation.

## Live SEO audit

| Signal | Status | Finding |
| --- | --- | --- |
| Title / description | PASS | Present and specific to VIRRO IMPULSA |
| Canonical | PASS | `https://www.virro.app` |
| Open Graph title/description/type | PARTIAL | Present; no `og:image` observed |
| X/Twitter | PARTIAL | `summary`, title and description; no image observed |
| Robots | PASS | Allows public crawl; disallows `/admin` |
| Sitemap | PASS | 26 public URLs observed |
| Structured data | MISSING | No JSON-LD observed on homepage |
| Semantic headings | PASS | One clear H1 and ordered section headings |
| Product-category accuracy | FAIL | Search metadata describes modernization, not Work Assurance |

## Technical baseline commands

- TypeScript: **PASS** (`tsc --noEmit`)
- ESLint: **PASS WITH 1 WARNING** (unused `SIGNAL_B` in an existing integration test)
- Production build: **PASS** (Next.js 16.3.0; 25 application routes)
