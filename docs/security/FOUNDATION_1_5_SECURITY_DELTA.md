# Foundation 1.5 Phase A — Security Delta

## Changed trust boundaries

- Supabase Auth claims now precede tenant resolution for internal Field Beta.
- Tenant membership is durable Postgres authority.
- Field Beta routes reject unauthenticated requests.
- Requested tenant IDs are locators, never grants.
- Privileged persistence remains server-only and operation-scoped.

## Threats and mitigations

| Threat | Phase A mitigation | Remaining limitation |
|---|---|---|
| BOLA / foreign UUID | Authority resolution before Field Beta service construction | Full transaction/storage lineage proof is Phase B |
| BOPLA / tenant injection | Strict request schemas; tenant/principal fields are server-derived | Legacy repositories still need complete user-scoped migration |
| Revoked membership | Membership status is checked from Postgres, not JWT claims | Real Auth revocation integration remains Phase B |
| Service-role bypass | Explicit privileged adapter boundary and route authorization | Legacy base graph still uses privileged repositories |
| Session spoofing | `auth.getClaims()` through SSR boundary | Supabase Auth environment must be configured for real tests |
| Cache leakage | Dynamic Field Beta page and `private, no-store` API responses | Broader internal routes remain legacy internal |
| Principal deletion | `ON DELETE RESTRICT` on memberships/provenance | Full account-deletion workflow is out of scope |

## Key discipline

Preferred keys are `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY`; legacy anon/service-role names remain compatibility
fallbacks. No rotation is performed here. No secrets are logged or exposed to
the browser.

## Evidence boundary

Phase A has unit and structural evidence. It does not claim REAL_AUTH,
REAL_SUPABASE, Storage negative proof or full two-tenant Field Beta readiness
until Phase B executes those tests.
