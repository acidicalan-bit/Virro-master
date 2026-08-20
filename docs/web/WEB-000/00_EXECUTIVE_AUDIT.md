# WEB-000 Executive Audit

Observed 2026-08-20 against canonical baseline `9d20bd5bb2e64084ac1733588a6ecb794df58b7e` (`8031a911dd6aceef8a77f890ce3dd960c5f26c62`) and the public `https://www.virro.app` deployment.

## Verdict

Virro has a credible technical nucleus but no public story that represents it. The live site presents **VIRRO IMPULSA** as a CDMX transformation program combining design, technology, and adoption for small businesses. The canonical repository root presents **Intent Lab**, an internal compiler/product lab. Neither communicates the proposed category: **Work Assurance**.

This is not a copy refresh. It is a category, evidence, and deployment-boundary correction.

## What is wrong with current public positioning?

- The public promise is business modernization and coordinated services, not assurance of authorized work state.
- `Studio / Systems / Academy` makes Virro sound like an agency or consulting portfolio.
- The hero visual demonstrates a café rebrand and customer journey, not state, authority, evidence, readiness, or stale propagation.
- The commercial CTA requests a business diagnosis; it does not match the current product's technical buyer or pilot maturity.
- The repository root is an internal product surface (`IntentLab`) with production-capable APIs and trust-sensitive code. It is not a safe marketing homepage.
- Public production is attached to an older branch commit from the same repository, so marketing and product are coupled while also drifting.

## Keep / modify / reject / defer

| Current element | Decision | Reason |
| --- | --- | --- |
| Explicitly labeled conceptual demos | **KEEP** | They avoid fabricated customers and can become Work Assurance scenarios. |
| “Now / later / not yet” restraint | **MODIFY** | Preserve the honesty, translate it into explicit capability status. |
| System-level coordination idea | **MODIFY** | Reframe from coordinating vendors to aligning authorized work state. |
| Strong interactive product demonstrations | **MODIFY** | Replace café/agency demos with deterministic state transitions. |
| Studio / Systems / Academy as primary architecture | **REJECT** | It anchors Virro in an agency category. |
| Small-business transformation headline and diagnostic CTA | **REJECT** | It attracts the wrong buyer and obscures the product. |
| Fabricated proof, logos, metrics, certifications | **REJECT** | No evidence supports them. |
| Public customer case studies | **DEFER** | Publish only after real, permissioned evidence exists. |

## What Virro should feel like

Technically serious, precise, calm, alive, and auditable. The page should feel like an instrument for inspecting work state—not a dashboard, command center, AI toy, or neon infrastructure template. Visual interest should come from bindings, state transitions, versions, gates, evidence, and propagation.

## Positioning decision

- **Category:** Work Assurance
- **Company definition:** Virro is the assurance layer for work.
- **Primary message:** Keep work aligned across people, tools and AI.
- **Secondary message:** From scattered context to verifiable work.
- **Commercial wedge:** Delegate to AI without losing intent.
- **Replacement clarification:** Virro does not replace Jira, GitHub, Slack, or documentation tools. It evaluates and preserves the authorized work state across them.

## Signature web experience

The hero must be a custom **WorkState Field**. A visitor sees signals from people and tools converge into an authorized, versioned work state. One source changes; dependent work becomes stale; provenance remains inspectable. This single mechanism explains what Virro is, where it sits, and why it is different.

Selected homepage modules:

- Hero: **WorkState Field**
- Core: **Readiness Gate**, **Stale Propagation Map**, **One Intent / Multiple Authorized Views**
- Secondary: **Provenance Lens**, **Delegation Assurance Rail**, **Integration Constellation**

## Safest deployment architecture

**Recommend Option C: a separate marketing repository and Vercel project for `virro.app`; a separate product project for `app.virro.app`.** The domain can remain registered and DNS-managed through Spaceship while Vercel remains the application host. This isolates marketing releases from the trust kernel, gives each surface independent rollback and access policy, and removes the `/` collision.

Option B (separate Vercel deployments from the same repository) is an acceptable migration bridge, not the target. The current production arrangement demonstrates why branch-only separation is fragile: the public domain serves commit `97c7c88...` from `codex/prod-business-modernization`, while the requested product baseline is `9d20bd5...` and renders a different homepage.

## What WEB-001 should build first

1. Establish repository/project/domain boundaries without moving or weakening the product runtime.
2. Create server-rendered marketing shell, metadata, capability-status language, and design tokens.
3. Build the smallest recognizable WorkState Field hero with a static semantic fallback.
4. Add the three core modules as isolated client islands, then secondary modules.
5. Run accessibility, reduced-motion, mobile, claim, and performance gates before any production cutover.

## Acceptance outcome

The direction passes the ten-second test only if a technical buyer can say: Virro connects work across tools, maintains an authorized current state, decides whether work has enough support to move, and exposes stale or unsupported delegation before it silently drifts.
