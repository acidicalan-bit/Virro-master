# BUILD 002-C1-D1 R1 Independent Verification

## Verdict

`BUILD002_C1_D1_R1_VERIFICATION_FAILED`

The frozen product candidate was tested without changing product code,
migrations, authored product tests, or application workflows.

## Frozen identity

- Product branch: `build/build002-c1-d1-readiness-authority-orchestration`
- Product SHA: `03f3d7382037a1e409b848d01921214dfffa2b2a`
- Product tree: `5e58464f7d2da0ef3a10373e570cd2b846efaf93`
- Main before product PR: `f67ebbbb115bcca30bb341c8ca7027e3e3e0e0e1`
- Product PR: `#29`, open and not merged at verification start

The verifier branch is based directly on the product SHA. Its only changes
are under `tests/verifier/build002-c1-d1-r1/`, this directory, and the
dedicated verifier workflow.

## Independent coverage

The verifier suite contains 24 focused checks. Twenty-two pass, including:

- server-only composition, no route/client exposure, and no consequence path;
- AuthorityContext copying and dependency-operation rebinding attacks;
- caller extras and fake READY/NONREADY inputs;
- exact phase order, one invocation per phase, and short-circuit behavior;
- production-semantic READY, INSUFFICIENT_SIGNAL, HUMAN_REVIEW_REQUIRED, and
  zero-signal/one-requirement cases;
- bounded D0 rejection mapping with one attempt and no retry;
- deep result immutability and absence of execution/delegability fields;
- owner, transaction, principal, dependency-hash, and readiness-hash record
  bindings;
- all frozen material drift dimensions.

Two mandatory binding checks fail against the product implementation:

1. `C1_D1_RESULT_READINESS_ID_BINDING_INCOMPLETE`: a D0 record can return a
   `readinessId` different from the readiness candidate's `id`, while the
   orchestrator still returns a successful authority result.
2. `C1_D1_RESULT_EVALUATION_TIME_BINDING_INCOMPLETE`: a D0 record can return
   an `evaluationTime` different from `readiness.createdAt`, while the
   orchestrator still returns a successful authority result.

These are verifier findings, not fixture failures. The focused test must
remain red until the product validates both equalities.

## Gate results observed

- Independent adversarial suite: `22 passed, 2 failed` (the two findings
  above).
- Authored D1 suite: `18/18 passed`.
- Verifier test TypeScript: passed.
- Verifier test ESLint: passed.
- Assurance manifest check: passed.
- Production build: passed.
- Native D0 PostgreSQL 17: not runnable in this local worktree; no PostgreSQL
  listener was available (`ECONNREFUSED 127.0.0.1:5432`). The frozen product
  PR's required CI run had already passed this regression at product SHA.
- A full local Vitest attempt was not a clean gate in this Windows session:
  worker timeouts and temporary-directory permission failures affected the
  existing F7 assurance tests. This does not alter the two deterministic D1
  findings. Product PR #29 CI was successful at the frozen product SHA.

## Why the findings are authoritative

The frozen D0 migration writes `evaluation_time` from
`(v_readiness->>'createdAt')::timestamptz` and returns the persisted
`readiness_id`. Therefore the application composition boundary must bind the
returned record to the exact readiness object and evaluation instant it
submitted. The current D1 implementation checks tenant, transaction,
principal, dependency hash, and readiness content hash, but omits these two
material equalities.

## Scope and exclusions

No HTTP request or route was used. No command execution, provider call,
`ExecutionAuthority`, `MutationLease`, `StateCommit`, or consequence operation
was invoked. D0 remains an authority-commit primitive only. The verifier does
not repair the candidate, implement D2, merge a branch, or promote the product
PR.

The existing authored D1 product tests and D0 PostgreSQL 17 regression remain
separate gates. A passing authored suite cannot close the two independent
record-binding findings above.

## Required disposition

Stop promotion. Repair the product-side D0 readback binding for `readinessId`
and `evaluationTime`, then rerun this independent verifier and the complete
regression suite. Do not start C1-D2 from this failed candidate.
