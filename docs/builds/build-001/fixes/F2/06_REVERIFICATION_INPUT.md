# BUILD 001-F2 - Re-verification Input

## Candidate scope

Verify only that `/api/precision-edit` cannot reach the legacy privileged implementation and that supported application navigation uses the authenticated Field Beta successor. Do not infer overall BUILD 001 acceptance.

## Required checks

1. Confirm the F2 parent is `bc2cc7179979b4fccd892d265bedf8d7b3ab7bf1`.
2. Audit the diff for unrelated F3-F7 changes.
3. Invoke GET and POST directly with no session and `INTERNAL_LEGACY_ROUTES_ENABLED=true`.
4. Try forged tenant/project/resource IDs and foreign transaction/candidate/evidence IDs.
5. Try verification-, acceptance- and commit-shaped legacy payloads.
6. Instrument the legacy service factory and confirm it is never imported/called by the handler.
7. Simulate a service that writes once then fails; confirm it cannot be reached.
8. Confirm `/precision-edit-lab` redirects and navigation points to `/field-beta`.
9. Confirm `/api/field-beta` still resolves request authority and canonical commit.
10. Re-run F1 real PostgreSQL coverage and the complete baseline.

## Expected result

All legacy requests return HTTP `410` with `LEGACY_CANONICAL_PATH_DISABLED`, independent of environment, flag, payload and locators. No repository or Storage operation occurs.

## Commands

```powershell
pnpm vitest run tests/security/build001-f2-legacy-precision-edit-isolation.test.ts tests/security/legacy-route-surface.test.ts tests/security/legacy-route-guard.test.ts tests/field-beta-security.test.ts tests/auth/field-beta-page-authority.test.ts

$env:PGLITE_PACKAGE_ROOT='<external-pglite-package-root>'
pnpm vitest run tests/integration/build001-f1-canonical-commit.integration.test.ts tests/security/build001-trust-foundation.test.ts

pnpm typecheck
pnpm lint
$env:PGLITE_PACKAGE_ROOT='<external-pglite-package-root>'
pnpm test
pnpm build
```

## Staging unknowns

Local handler tests do not establish deployed cache/routing, Supabase Auth, REAL_RLS, Storage policy or service-role tenant filtering. Preserve those as `UNKNOWN`; they are not needed for the unconditional F2 denial itself.
