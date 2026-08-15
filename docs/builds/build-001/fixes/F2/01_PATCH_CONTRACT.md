# BUILD 001-F2 - Patch Contract

## VULNERABLE PATH

Unauthenticated HTTP request -> non-production feature flag -> client-provided locator or names -> service-role repository factory -> legacy multi-write execution/verification/preference/commit -> canonical tables and head.

## LEGITIMATE SUCCESSOR PATH

Authenticated request -> `resolveRequestAuthority` -> server-derived tenant/principal/role -> Field Beta execution/evidence/acceptance -> `commit_accepted_field_outcome` atomic RPC.

## CANONICAL ISOLATION INVARIANT

No request to `/api/precision-edit`, regardless of environment, flag, payload, UUID or header, may instantiate the legacy service or reach persistence, Storage, verification, acceptance, StateCommit or head mutation.

## AUTHORITY INVARIANT

Environment variables are never treated as authority. The supported successor remains `/api/field-beta`, which resolves authenticated authority before constructing tenant-scoped services.

## PARTIAL-WRITE INVARIANT

The retired route performs zero persistent operations. Therefore a request failure cannot leave any legacy project, asset, version, transaction, candidate, evidence, acceptance, StateCommit or head write.

## DATA COMPATIBILITY

Historical BUILD 004 tables, rows, service implementation, domain types and non-route tests remain unchanged. No historical row is rewritten or promoted. The legacy URL returns a durable retirement response rather than executing compatibility code.

## UI COMPATIBILITY

The obsolete `/precision-edit-lab` page redirects to the authenticated `/field-beta` successor. Primary navigation and current README references point to the successor.

## MINIMUM ENFORCEMENT BOUNDARY

Replace both legacy route handlers with unconditional `410 Gone` responses, remove all imports and calls to privileged services, and eliminate supported UI reachability. No migration or new authorization system is required.
