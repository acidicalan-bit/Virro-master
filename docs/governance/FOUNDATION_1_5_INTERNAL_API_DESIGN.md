# Foundation 1.5 Internal API Design Gate

Status: `API_DESIGN_READY`

## `/field-beta`

Classification: `AUTHENTICATED_TENANT_ACTIVE`.

- Authentication: verified Supabase Auth claims through the server resolver.
- Tenant locator: optional `tenantId` query/header; never authority.
- Resolution: active tenant plus active membership.
- AuthorityContext: created server-side before rendering; authenticated users
  without current authority receive no protected Field Beta shell.
- Writable fields: image, instruction, ROI, topology, task type and selected
  strategy only.
- Forbidden authority fields: principal, tenant, role, ownership, evidence,
  acceptance source, verification state, commit eligibility and provider cost.
- Cache: dynamic/private; no shared response caching.

## `/api/field-beta`

Classification: `AUTHENTICATED_TENANT_ACTIVE`.

- Authentication: verified Auth claims required for GET and POST.
- Tenant locator: `tenantId` query parameter or `x-tenant-id` header.
- Resolution: `TenantAuthorityService` checks active membership and tenant status.
- Object authorization: outcome, sample, feedback, regression and golden
  identifiers are resolved only through the tenant-bound service.
- Property authorization: request schemas are strict and action fields are
  removed before domain calls.
- Errors: sanitized 401/403/409/400 responses; no database/provider details.
- Idempotency: provisioning is idempotent by principal; existing Field Beta
  transaction/strategy identity remains the execution deduplication boundary.
- Limits: PNG/type/size/dimension limits remain enforced by Field Beta.
- Cache: `private, no-store` for authenticated responses.

## Related routes

| Route | Classification | Phase A decision |
|---|---|---|
| `/api/transaction-lab` | LEGACY_INTERNAL | No new tenant data until tenant wiring is completed |
| `/api/precision-edit` | LEGACY_INTERNAL | No new public contract |
| `/api/preservation-study` | INTERNAL_SYSTEM_ONLY | Historical experiment surface |
| `/api/preservation-study/media` | INTERNAL_SYSTEM_ONLY | Historical private media surface |
| `/api/compile`, `/api/feedback` | LEGACY_INTERNAL | Service-role persistence; fail-closed containment |
| `/api/benchmarks`, `/api/blind-eval/*` | LEGACY_INTERNAL | Internal evaluation persistence; fail-closed containment |

`PUBLIC_API_STATUS` remains `BLOCKED`.

## `/api/core-lineage`

Classification: `AUTHENTICATED_TENANT_ACTIVE`.

Build 001 is the first supported authenticated core-lineage surface for
Project, Asset, AssetVersion and OutcomeTransaction. The route resolves the
verified request principal and active membership into an immutable
`AuthorityContext`, then uses a user-scoped Supabase client and a repository
port that applies `owner_tenant_id` filters before every read or write.

Request bodies contain resource locators only. `tenantId`, ownership, role,
principal, verification, cost and canonical-commit claims are not accepted as
authority fields. The database trigger rejects new rows without an owner and
rejects parent/child tenant mismatches. Historical NULL ownership remains
compatibility data and is not backfilled.

`/api/transaction-lab`, `/api/precision-edit`, `/api/preservation-study` and
`/api/preservation-study/media` now fail closed with 404 unless the server is
non-production and `INTERNAL_LEGACY_ROUTES_ENABLED=true`. That switch is an
operational containment mechanism only; it is not authorization and must not
be enabled on a public deployment.

Phase A real evidence is demonstrated for Supabase Auth, two-user tenant
isolation, revocation and the controlled executor. This document does not
claim public multi-tenant readiness; Storage, recovery and complete lineage
RLS remain Phase B.
