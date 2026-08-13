# Canon ownership map — PROJECT_SPEC 1.4.0

Status: **[CURRENT]** · reconciled 2026-08-13. `PROJECT_SPEC.md` owns current
cross-cutting doctrine; frozen Build reports remain historical evidence.

| Concept | Canonical home | Other material | Action |
|---|---|---|---|
| Product/category, buyer doctrine | `PROJECT_SPEC.md`, `docs/product/` | positioning/addenda | UPDATE then reference; hypotheses stay labelled |
| Architecture and execution chain | `PROJECT_SPEC.md`, `docs/ARCHITECTURE.md` | foundation report | UPDATE current views; retain frozen report |
| Outcome / Blueprint / Task Spec | `src/domain/outcome/specification/` | `docs/SPEC_ANCHORED_PLATFORM_FOUNDATION_V0_1.md` | Code contracts are authoritative; docs reference |
| Execution Fingerprint / evidence | application specification + field repositories | BUILD 005 reports | Preserve immutable IDs/hashes; no historical rewrite |
| Machine verification / Same-Spec | `same-spec-gate.ts`, semantic projection | legacy `same_spec_status` | Legacy field is compatibility-only; projection is current read authority |
| Human acceptance / Outcome acceptance | `field_feedback` + `field-beta.ts` projection | Build reports | Human evidence is independent and server-derived |
| Canonical commit eligibility | Blueprint policy + server authorization | historical commit docs | Never derive from legacy Same-Spec aggregate |
| Recovery | `src/application/outcome/recovery/` + BUILD 005 evidence | E2E readiness docs | Adopt only demonstrated EXEC-002..005 / ARCH-004 |
| Persistence / migrations | `src/application/ports`, `src/infrastructure/persistence`, `supabase/migrations` | SQL reports | Ports first; service role remains internal-only |
| API | `app/api`, route schemas, `docs/governance/API_GOVERNANCE.md` | README examples | Internal API is documented; public contract remains planned |
| Testing / evidence classes | `tests/`, `docs/governance/TESTING_GOVERNANCE.md` | Build reports | Keep machine, provider, human, market evidence distinct |
| Marketplace / supply / mobile | `PROJECT_SPEC.md`, `docs/product/`, `docs/security/SELLER_SUPPLY_CHAIN.md` | strategic addenda | Planned/deferred; no public marketplace/native app |
| Documentation / Build governance | this map, `PROJECT_SPEC.md`, `AGENTS.md` | historical contracts | Update → reference → deprecate; never rewrite history |

No duplicate document is allowed to silently outrank the map or `PROJECT_SPEC`.
