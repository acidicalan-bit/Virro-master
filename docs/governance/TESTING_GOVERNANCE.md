# Testing governance

- **TEST-001:** prove the boundary with hermetic/controlled execution before
  paid/provider verification.
- **TEST-002:** test before and after expensive boundaries independently.
- **TEST-003:** fault-inject persistence/recovery boundaries where retries could
  duplicate cost or corrupt state.
- **TEST-004:** controlled executors require explicit server configuration and
  never replace a configured real provider silently.
- **TEST-005:** recovery must reconstruct from durable state in a fresh process.

Evidence classes remain distinct: static/unit, hermetic integration, real DB,
controlled execution, real provider, internal human, controlled field and market.
Component PASS is not Outcome PASS; provider success is not acceptance; machine
PASS is not Human Acceptance.
# v1.4 criterion evidence rule

Tests must prove Machine Same-Spec from durable criterion receipts, not from an
aggregate verification status, hashes, `sameSpecStatus`, logs, or human
feedback. Required negative cases include missing, wrong-spec, wrong-run,
wrong-artifact, foreign-tenant, stale-verifier and conflicting duplicate
receipts. The historical FIELD_READY rows are read-only and are never
backfilled during verification tests.
