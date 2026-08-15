# ADR-003 - Atomic Privileged Commit

Status: Accepted for BUILD 001 implementation

## Decision

Use one narrow `SECURITY DEFINER` PostgreSQL function for canonical commit. Revoke direct authenticated asset/version mutation and reauthorize tenant OWNER, lineage, exact evidence, acceptance and expected head inside the function.

## Consequences

Head and StateCommit change atomically with row-lock concurrency and idempotent retry. The elevated function is a critical security boundary and therefore uses empty `search_path`, schema-qualified relations, explicit grants and deterministic negative tests. A disposable real Supabase deployment must still verify runtime behavior.
