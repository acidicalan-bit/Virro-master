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

# Development assurance evidence

All security and correctness claims use the canonical development evidence
levels in `docs/builds/build-001/fixes/F7/02_EVIDENCE_LEVEL_MODEL.md`:
`E0_STATIC`, `E1_MODEL`, `E2_APPLICATION`, `E3_LOCAL_REAL_BOUNDARY`,
`E4_REMOTE_STAGING` and `E5_DEPLOYED_E2E`.

- A PASS below the criterion's required level is `NOT_PROVEN`, never PASS.
- A skipped environment test is `SKIPPED_ENVIRONMENT`, never PASS.
- Suite names such as `security` or `integration` do not establish an evidence
  level. The boundary actually exercised does.
- TrustHarness is `E1_MODEL` even when the file lives under `tests/security`.
- SQL-sensitive claims require `pnpm test:sql`, which executes all repository
  migrations and the actual RPC on PGlite/PostgreSQL semantics.
- Remote Supabase claims require the isolated staging lane and remain visible as
  `NOT_PROVEN`, `SKIPPED` or `UNKNOWN` when that lane was not executed.

The BUILD 001 machine-readable source and generated manifest live under
`assurance/`. `pnpm assurance:check` rejects a stale generated manifest;
`pnpm assurance:environment` lists every environment skip with its reason and
the controls that remain unproven. No aggregate confidence score is allowed.
# v1.4 criterion evidence rule

Tests must prove Machine Same-Spec from durable criterion receipts, not from an
aggregate verification status, hashes, `sameSpecStatus`, logs, or human
feedback. Required negative cases include missing, wrong-spec, wrong-run,
wrong-artifact, foreign-tenant, stale-verifier and conflicting duplicate
receipts. The historical FIELD_READY rows are read-only and are never
backfilled during verification tests.
