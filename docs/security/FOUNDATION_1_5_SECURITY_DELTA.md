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
| Revoked membership | Membership status is checked from Postgres, not JWT claims; real revocation was demonstrated on the approved Supabase project | Full lineage/storage revocation proof remains Phase B |
| Service-role bypass | Explicit privileged adapter boundary and route authorization | Legacy base graph still uses privileged repositories |
| Session spoofing | `auth.getClaims()` through SSR boundary and real disposable Auth sessions | Production session/device revocation and high-risk reauthentication remain deferred |
| Cache leakage | Dynamic Field Beta page and `private, no-store` API responses | Broader internal routes remain legacy internal |
| Principal deletion | `ON DELETE RESTRICT` on memberships/provenance | Full account-deletion workflow is out of scope |

## Key discipline

Preferred keys are `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY`; legacy anon/service-role names remain compatibility
fallbacks. No rotation is performed here. No secrets are logged or exposed to
the browser.

## Evidence boundary

Phase A now has demonstrated `REAL_SUPABASE`, `REAL_AUTH`, `REAL_RLS`,
`SECURITY_NEGATIVE` and `CONTROLLED_EXECUTOR` evidence on the approved
project. This does not claim Storage negative proof, complete transaction /
execution lineage isolation or public multi-tenant readiness; those remain
Phase B work.

The `/field-beta` SSR page and API both resolve the shared `AuthorityContext`
before exposing the protected experience. Authentication without an active
tenant membership is not sufficient, and GET rendering never provisions
authority implicitly.

After OWNER membership revocation, generic personal-tenant provisioning is
currently `UNSUPPORTED_IN_PHASE_A`: it does not reactivate the revoked
membership or silently create a second personal tenant. A future explicit
privileged lifecycle design is required for reactivation or re-membership.
