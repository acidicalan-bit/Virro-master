# Information Architecture

## Launch principle

The public site should explain one category and one mechanism before expanding into a platform catalog. Avoid a large mega-navigation at launch.

## Proposed navigation

```text
Virro
├── Product
│   ├── How it works
│   └── Work Assurance showroom (WEB-002)
├── Trust
├── Developers (planned until real API/docs exist)
├── Company
└── Join pilot
```

“Integrations” should be a homepage/How it works section at first, not a top-level route, until named connectors and status evidence exist.

## Proposed route map

| Host/route | Class | Launch | Purpose |
| --- | --- | --- | --- |
| `virro.app/` | PUBLIC_MARKETING | WEB-001 | Category, mechanism, core modules, CTA |
| `virro.app/how-it-works` | PUBLIC_MARKETING | WEB-001 | Full intent → acceptance model and status labels |
| `virro.app/trust` | PUBLIC_MARKETING | WEB-001 | Authority, provenance, history, isolation, evidence, AI boundaries |
| `virro.app/company` | PUBLIC_MARKETING | WEB-001/002 | Company thesis and contact path |
| `virro.app/developers` | PUBLIC_MARKETING | DEFER | Publish only with supported integration/API material |
| `virro.app/showroom` | DEMO | WEB-002 | Deterministic scenario, no AI/provider call |
| `virro.app/privacy` | LEGAL | WEB-001 | Public privacy policy |
| `virro.app/terms` | LEGAL | WEB-001 | Terms appropriate to marketing/pilot |
| `app.virro.app/` | PRODUCT | Separate project | Authenticated product entry, not marketing |
| `app.virro.app/auth` | PRODUCT | Separate project | Identity |
| `app.virro.app/*labs*` | INTERNAL/DEMO | Restrict | Keep internal/lab surfaces out of public navigation |

## Homepage structure

1. **Hero / WorkState Field** — category, primary mechanism, CTA.
2. **The coordination gap** — tools can each be correct while work meaning diverges.
3. **Readiness Gate** — whether the applicable readiness requirements are satisfied; authority, delegability, and execution are evaluated elsewhere.
4. **Stale Propagation** — source change invalidates dependent work.
5. **One Intent / Multiple Authorized Views** — documentation stays aligned.
6. **Delegation Assurance Rail** — human and AI executor variants.
7. **Provenance Lens** — inspect why Virro reached a state.
8. **Integration categories** — sources, not replacement; status explicit.
9. **Trust boundary** — evidence-backed summary and route link.
10. **Pilot CTA** — request access / see how it works.

## Product surface model

Public marketing must not embed authenticated labs or expose production controls. The product surface belongs on `app.virro.app`, with its own authentication, CSP, access policy, environment variables, rollout, and rollback. Marketing can deep-link to a safe product login only when commercial readiness says it should.

## Trust page architecture

```text
/trust
├── Authority
│   └── where identity and permission come from
├── Provenance
│   └── source, actor, capture time, and version
├── Immutable history
│   └── what is append-only / versioned in the current implementation
├── Tenant isolation
│   └── exact supported boundary and current limitations
├── Evidence and verification
│   └── same-spec/current-binding checks
├── Human acceptance
│   └── separate authorization boundary
└── AI boundaries
    └── no executor self-authorizes canonical work
```

Only publish claims supported by the claim ledger. Do not show SOC 2, ISO 27001, HIPAA, uptime, SLA, penetration-test, or compliance badges without documentary evidence and authorization.

## Mobile transformation

- WorkState Field → stacked generic source cards → scenario work state → separate readiness and authority boundaries → dependent view rail.
- Readiness Gate → checklist then gate/reasons.
- Stale map → vertical dependency tree with affected descendants.
- Authorized Views → stacked accordion or accessible tabs.
- Delegation rail → vertical ordered list.
- Integration constellation → filtered category grid.

No desktop canvas should be scaled down until labels become unreadable.

## SEO ownership

Each public route owns a unique title, description, canonical, Open Graph/X metadata, and semantic H1. Marketing publishes `robots.txt` and `sitemap.xml`. Product routes should not inherit public marketing copy; authenticated/internal routes should be excluded from the marketing sitemap and evaluated for `noindex`.
