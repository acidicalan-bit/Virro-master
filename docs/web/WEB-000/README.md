# VIRRO WEB-000

Evidence-backed audit and product-positioning baseline for the future Virro public web experience.

## Status

**WEB_000_CANDIDATE**

- Baseline: `9d20bd5bb2e64084ac1733588a6ecb794df58b7e`
- Baseline tree: `8031a911dd6aceef8a77f890ce3dd960c5f26c62`
- Branch: `web/web-000-audit-positioning-baseline`
- Observed: 2026-08-20
- Scope: documentation only
- Application runtime changed: NO
- Product runtime changed: NO
- API changed: NO
- Database changed: NO
- Migration added: NO
- Dependency added: NO
- Deployment changed: NO

## Document set

1. [Executive audit](./00_EXECUTIVE_AUDIT.md)
2. [Current state and deployment](./01_CURRENT_STATE_AND_DEPLOYMENT.md)
3. [Product positioning](./02_PRODUCT_POSITIONING.md)
4. [Reference research](./03_REFERENCE_RESEARCH.md)
5. [Visual north star](./04_VISUAL_NORTH_STAR.md)
6. [Interactive module catalog](./05_INTERACTIVE_MODULE_CATALOG.md)
7. [Information architecture](./06_INFORMATION_ARCHITECTURE.md)
8. [Capability and claim ledger](./07_CAPABILITY_AND_CLAIM_LEDGER.md)
9. [Design system direction](./08_DESIGN_SYSTEM_DIRECTION.md)
10. [Technical web architecture](./09_TECHNICAL_WEB_ARCHITECTURE.md)
11. [Performance and accessibility budget](./10_PERFORMANCE_ACCESSIBILITY_BUDGET.md)
12. [WEB-001 implementation plan](./11_WEB_001_IMPLEMENTATION_PLAN.md)

## Core recommendation

- Category: **Work Assurance**
- Hero: **WorkState Field**
- Core modules: **Readiness Gate**, **Stale Propagation Map**, **One Intent / Multiple Authorized Views**
- Secondary modules: **Provenance Lens**, **Delegation Assurance Rail**, **Integration Constellation**
- Architecture: separate marketing repository/project at `virro.app`; product project at `app.virro.app`
- Dependency posture: custom HTML/CSS/SVG; no required new dependency; `motion@13.1.1` is conditional only

## Evidence limits

The live Vercel deployment and repository relationship were inspected with read-only account evidence. The live domain comes from the same GitHub repository but a different branch and commit than the requested canonical baseline. No customer, integration, certification, performance-result, or ROI evidence was invented. Spaceship was treated as registrar/DNS context, not assumed to be the application runtime.

The candidate commit SHA/tree are reported in the final handoff rather than embedded here because a commit cannot truthfully contain its own SHA.
