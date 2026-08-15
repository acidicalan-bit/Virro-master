# BUILD 001-F2 - Route Classification

## Classification

`C. LEGACY COMPATIBILITY ROUTE`

## Repository evidence

- `legacy-route-guard.ts` describes routes using it as a migration compatibility surface, not an authorization mechanism;
- the BUILD 001 trust map classifies `/api/precision-edit` as legacy, without principal, tenant membership or role resolution;
- its service descriptions and UI copy are BUILD 004 laboratory semantics;
- `/api/field-beta` is the later server-authoritative path and uses `resolveRequestAuthority` plus canonical commit;
- the old README and navigation still exposed Precision Edit Lab, but those references predate the accepted BUILD 001 trust boundary;
- tests exercise the legacy service directly for historical behavior; none require the HTTP route to remain privileged.

## Legitimate purpose

The implementation is retained as compatibility/history and as lower-level experimental test coverage. It is not a supported canonical API after BUILD 001.

## Consequence

Compatibility does not require runtime access to service-role canonical tables. The HTTP surface can be retired while preserving repository artifacts and redirecting users to the authenticated successor.
