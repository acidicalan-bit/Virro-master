# BUILD 001-F2 - Design Decision

## Selected strategy

`OPTION C - DISABLE / REMOVE REACHABILITY`

Retire `/api/precision-edit` as a privileged runtime surface. GET and POST always return `410 LEGACY_CANONICAL_PATH_DISABLED` before parsing or service construction. Redirect the old lab page and navigation to `/field-beta`.

## Option A - Authenticate

Rejected. The route is not the supported product boundary. Adding authentication at the handler would still pass client locators into service-role repositories that do not enforce tenant ownership, intersecting F5, and would retain the non-atomic approval sequence.

## Option B - Isolate

Rejected for this compatibility surface. A new demo database/schema and Storage namespace would create a second persistence model solely to retain obsolete runtime behavior. No current supported flow requires it.

## Option C - Disable/remove reachability

Selected. It completely removes service-role and canonical-table reachability with the smallest structural boundary. Historical service code and tests remain available, while supported users move to the authenticated successor.

## Option D - Wrap compatibility

Rejected as incomplete if it leaves any legacy read, verification, preference or commit action operating on shared tables. A wrapper would need the same tenant and atomicity remediation as the canonical path and would expand F2 into F5.

## Security consequence

The route cannot manufacture isolated or canonical output because it cannot execute. Forged tenant/resource IDs, foreign transaction/candidate/evidence IDs, development flags and failure injection all terminate at the same unconditional retirement boundary.
