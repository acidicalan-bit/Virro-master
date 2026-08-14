# Foundation 1.5 Internal API Design Gate

Status: `API_DESIGN_READY`

## `/field-beta`

Classification: `AUTHENTICATED_TENANT_ACTIVE`.

- Authentication: verified Supabase Auth claims through the server resolver.
- Tenant locator: optional `tenantId` query/header; never authority.
- Resolution: active tenant plus active membership.
- AuthorityContext: created server-side before rendering.
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

`PUBLIC_API_STATUS` remains `BLOCKED`.
