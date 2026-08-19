# BUILD 002-B R2 Timestamp Adapter

The persistence adapter normalizes trusted database timestamp values before domain parsing. Strings with UTC offsets, `Date` values returned by a PostgreSQL client, and canonical `Z` values become `YYYY-MM-DDTHH:mm:ss.sssZ`.

Invalid values fail closed. Fractional precision beyond milliseconds is accepted only when discarded digits are zero; non-zero precision is rejected rather than silently changing a hash-bound instant. BUILD002-A input schemas remain unchanged.

Normalization applies to Requirement `createdAt`, Signal `capturedAt` and `validUntil`, Qualification `qualifiedAt` and `evidenceValidUntil`, and Readiness `createdAt` and `validUntil`.
