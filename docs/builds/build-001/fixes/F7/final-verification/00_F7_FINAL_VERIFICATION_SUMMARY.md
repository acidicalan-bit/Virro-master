# BUILD 001-F7-V2 Final Composition Verification

## Verdict

**F7_VERIFIED**

Candidate under test: `4f5c7d25a492c5b835bc36aad485f6bc402cfbb9`.
This candidate contains the verified R2.2 implementation commit
`ea21c0f3f152f2a1a59a18e795d49a7254e55d6c` and its independent R2.2
verification. The worktree was clean before and after verification.

The composition invariant holds: a claim is `PROVEN` only when semantic
compatibility and valid provenance are both present. A compatible, genuinely
executed failing control is `FAILED`; all other insufficient combinations are
`NOT_PROVEN` (with `SKIPPED`/`UNKNOWN` preserved for those explicit states).

## Required Cases

| Case | Result |
| --- | --- |
| A invalid semantics + invalid provenance | `NOT_PROVEN` |
| B invalid semantics + valid provenance | `NOT_PROVEN` |
| C valid semantics + invalid provenance | `NOT_PROVEN` |
| D valid semantics + valid runner `PASS` | `PROVEN` |
| E valid semantics + valid runner `FAIL` | `FAILED` |
| F valid E3 evidence applied to E4 requirement | `NOT_PROVEN` |
| G previously valid receipt after source revision | `NOT_PROVEN` with stale-source reason |

Additional controls passed: authentic evidence for the wrong control cannot
repair R1; a semantically perfect declared-only receipt cannot repair R2;
multiple weak receipts do not launder assurance; and structural independence
remains a separate requirement from provenance.

## Assurance Picture

The generated manifest reports 7 current `PROVEN`, 1 `NOT_PROVEN`, 1
`SKIPPED`, and 5 `UNKNOWN`; `allCurrentCriteriaProven` is `false`. Local
deterministic/model/application/SQL controls are represented individually,
while remote Supabase, Storage, Auth, deployed routing, and remote
concurrency evidence remain unproven. No global security-pass claim is
generated.

No remote E4 target, credentials, service role, Supabase Auth, Storage, or
remote concurrency was accessed.
