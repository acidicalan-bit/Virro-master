# API and Response Model

No final route is selected until route conventions and the C5 source are
resolved. The minimal conceptual surface is:

- `POST /api/.../readiness/evaluate`
- `GET /api/.../readiness/current`

These are candidates only, not implementation commitments. Both routes must
use the existing `resolveRequestAuthority` pattern and a tenant-scoped
repository. They must not accept an authoritative tenant from a body,
query, or header.

## Evaluate response

Expose readiness state, reason codes, conditions, gaps, qualified requirement
summary, immutable snapshot/version identifiers, freshness, and limitations.
Do not expose service-role clients, AuthorityContext internals, raw prompts,
secrets, evaluator internals, or decorative confidence scores.

## Current response

`current` is a server-derived view: the latest applicable immutable readiness
snapshot for the exact transaction, filtered by dependency validity and
expiration. It is not a mutable `is_ready`, `current_ready`, or
`approved=true` column.

Unauthenticated, inactive, foreign, revoked, or ambiguous authority returns a
non-success authorization response. Evaluation errors never return READY.
