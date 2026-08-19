# BUILD 002-A — Signal Sufficiency Domain Semantics

## Provenance

- Trust-map PR #5 was merged through the protected pull-request path.
- `BUILD002_TRUST_MAP_MERGE_SHA`: `8e30b61b79b06194c2acad4c27671b05dfbaf25c`
- BUILD 002-A implementation branch is based directly on that merge commit.

## Domain contract

`signal-readiness.ts` is a pure domain module. It compiles server-owned requirement definitions, creates immutable signals, evaluates deterministic qualification outcomes, builds immutable readiness assessments, and evaluates validity separately from historical assessment state.

The requirement snapshot binds semantic type, accepted provenance, cardinality, dependency selectors, blueprint identity/version/hash, policy identity/hash, and its schema version. Its canonical SHA-256 is computed from the definition only; callers cannot provide the resulting hash.

Signal content hashes bind payload, source, provenance, validity, dependency identity/hash, tenant, transaction, requirement, and schema version. Signal identifiers and capture timestamps are audit metadata, not semantic content. Dependency snapshots normalize set-like requirement hashes and signal references before hashing. Qualification and readiness hashes bind their complete server-computed material, including the evaluator definition, outcomes, blocking codes, and dependency hash.

Qualification is fail-closed and deterministic: `QUALIFIED`, `MISSING`, `UNKNOWN`, `INCOMPATIBLE_PROVENANCE`, `CONTRADICTORY`, `STALE_SOURCE`, `INVALID`, or `REQUIRES_HUMAN_REVIEW`. Readiness is a separate assessment state: `NEEDS_CONTEXT`, `INSUFFICIENT_SIGNAL`, `READY_WITH_CONDITIONS`, `READY`, `HUMAN_REVIEW_REQUIRED`, or `BLOCKED_BY_POLICY`. Validity is independently `CURRENT`, `STALE`, or `EXPIRED`. Delegation requires both `READY` and `CURRENT`.

Tenant and transaction identity are taken from the server-supplied subject/dependency context. Caller-supplied final states, hashes, verifier callbacks, and unknown object keys do not become authoritative inputs. Returned objects are deep-frozen as defense-in-depth; the security boundary is the server-controlled constructors/evaluators and not object freezing.

## Test evidence

The focused E1 matrix is `tests/assurance/build002-a-signal-readiness.test.ts` and covers qualification outcomes, inferred-provenance controls, contradiction/no-winner behavior, canonical permutation properties, material hash changes, caller-field negative controls, immutable assessments, validity, and delegation. The final focused run reports `38/38` passing. The final repository assurance run reports `8` files and `130` tests passing; the final full Vitest run reports `52` files passing, `5` skipped, with `511` tests passing and `11` skipped.

## Scope and limits

This change adds only domain code, focused E1 tests, and this documentation. It does not add persistence, migrations, RLS, API enforcement, executor changes, TaskSpec changes, or a runtime readiness choke-point.

The following are **NOT YET PROVEN** by BUILD 002-A:

1. Database immutability.
2. RLS and remote tenant isolation.
3. Server-mediated API enforcement.
4. Enforcement at the execution choke point.
5. TOCTOU linearization between assessment and execution.
6. Remote staging/provider behavior.

Those boundaries remain later BUILD 002 work and independent verification scope.
