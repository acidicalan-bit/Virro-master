# BUILD 002 Implementation Sequence

The smallest evidence-backed sequence is additive and stops at the first
failed invariant.

## 002-A Domain semantics

- Invariant: requirement, signal, qualification and readiness outcomes are
  deterministic, orthogonal and server-owned.
- Scope: schemas, canonical hash material, pure evaluator and state/expiry
  semantics only.
- Tests: E1 qualification/provenance/contradiction/state/property tests.
- STOP: caller can set criticality/provenance/readiness, UNKNOWN qualifies, or
  READY_WITH_CONDITIONS delegates.
- Verification: independent E1 review and immutable result SHA.

## 002-B Persistence and RLS

- Invariant: every authoritative row is tenant/subject rooted, immutable where
  required, and inaccessible to foreign authenticated tenants.
- Scope: additive BUILD 002 migration/tables, server-mediated repositories,
  RLS/FK policies; no F1-F9 migration rewrite.
- Tests: E2 repository contracts and E3 native PostgreSQL/RLS matrix.
- STOP: service-role scope is optional, direct client writes succeed, or any
  foreign reference is visible.
- Verification: independent native PostgreSQL review before staging.

## 002-C Evaluation service

- Invariant: evaluation derives all hashes/statuses and persists immutable
  snapshots without granting authority.
- Scope: authenticated submit/evaluate/current-read operations; no executor
  call and no UI redesign.
- Tests: E1/E2 API trust and idempotence tests.
- STOP: response contains capability-bearing material or caller-owned fields
  affect qualification.
- Verification: independent API/tenant review.

## 002-D Choke-point integration and binding

- Invariant: only current exact READY plus valid ExecutionAuthority can create a
  readiness-execution reservation before any provider side effect.
- Scope: one shared server gate at the supported Field Beta path, additive
  binding to execution lineage.
- Tests: E2 zero-invocation matrix and exact downstream binding tests.
- STOP: any supported executor path bypasses the gate or readiness replaces
  authority.
- Verification: independent code-path and regression review.

## 002-E Stale/concurrency hardening

- Invariant: dependency changes and READY->execution races serialize at a
  concrete PostgreSQL linearization point with no partial reservation/run.
- Scope: lock order, transaction-bound revalidation, multi-session tests.
- Tests: E3 real PostgreSQL sessions and rollback/duplicate evaluation tests.
- STOP: timestamp-only checks, stale execution side effect, deadlock-prone
  inconsistent lock order, or unverifiable winner.
- Verification: independent adversarial concurrency review.

## 002-R Remote verification

- Invariant: deployed Auth/RLS/RPC/storage and executor boundary preserve all
  previous controls.
- Scope: disposable staging only, no production credentials or paid provider.
- Tests: E4 remote proof plan, then F1-F9/full regression.
- STOP: any remote tenant leak, caller provenance upgrade, stale invocation,
  missing evidence, or BUILD 001 regression.
- Verification: independent remote verifier; no merge until the required
  `Required E0-E3 deterministic gates` and remote contract are green.

## Scope guard

Reject generic WorkContract, Operational Canon, RAG/vector database, knowledge
graph, executor marketplace/plugin framework, agent orchestration,
billing/payments, Learning Engine, economic optimizer, mobile and UI redesign.
BUILD 002 is a readiness boundary, not a platform expansion.
