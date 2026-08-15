# BUILD 001-F2 - Fix Evidence

## Original attack before

With `NODE_ENV=test` and `INTERNAL_LEGACY_ROUTES_ENABLED=true`, an unauthenticated actual-handler test observed:

- GET with a foreign client-selected transaction -> `200`, privileged service factory called, `getExperiment(foreignId)` called;
- POST `approvePreserved` with the same transaction -> `200`, privileged service factory called, `approvePreserved(foreignId)` called.

The existing fault matrix also proved that failure after transaction creation leaves the transaction and earlier project/asset/version writes in the legacy service model. Pre-patch result: 2 files and 8 tests passed as vulnerability reproduction.

## Enforcement after F2

Both GET and POST now return:

```json
{
  "code": "LEGACY_CANONICAL_PATH_DISABLED",
  "successor": "/api/field-beta"
}
```

with HTTP `410`, `Cache-Control: no-store` and a successor-version Link. This occurs before JSON parsing, environment checks or service construction.

## Attack matrix

The focused route test enabled the development flag and attempted:

- unauthenticated GET with foreign transaction;
- forged tenant, project and resource identifiers;
- foreign transaction, candidate and evidence identifiers;
- legacy output sent to verification-shaped input;
- legacy output sent to Human Acceptance/preference;
- legacy output sent to legacy canonical commit;
- rejection/status mutation;
- a service that would write once and then fail.

Every request returned the intended `410` control. The privileged factory and all mocked service operations had zero calls. The simulated persistent-write counter remained zero.

## Canonical isolation

The retired handler no longer imports parsing schemas, the legacy guard, `PreservationVerificationService`, repositories, Storage or domain execution code. It cannot create a UUID or artifact to feed into evidence, verification, acceptance, StateCommit or head.

The old page redirects to `/field-beta`; primary navigation and README identify Field Beta as the supported path. `/api/field-beta` continues to call `resolveRequestAuthority` and uses `createCanonicalOutcomeCommitService` for commit.

## Service-role impact

Service-role usage was not changed globally. It is no longer reachable from `/api/precision-edit`. The retained lower-level legacy service and F5 ownership concerns remain outside F2.

## F1 regression

The focused combined suite passed all 61 tests, including the 7 real PostgreSQL F1 cases for original reproduction, success, candidate/AssetVersion immutability, idempotency, stale head, preconditions and failure rollback.

## Full regression

```text
TypeScript: passed
ESLint: passed after final no-warning cleanup
Focused F2/F1/security: 7 files, 61 passed
Full Vitest: 40 files passed, 5 skipped; 342 tests passed, 11 skipped
Next.js production build: passed; static generation 19/19
```

## Real-boundary scope

F2 denial was exercised at the actual Next route handler. F1/database invariants were re-run through PostgreSQL 18.3/PGlite 0.5.5 with all 20 migrations. No remote Supabase credentials were used.

## Remaining unknowns

- deployed routing/cache behavior requires staging confirmation;
- authenticated Field Beta Supabase Auth/RLS/service-role behavior remains part of staging and F5 verification;
- F3, F4, F6 and F7 remain unresolved by design.
