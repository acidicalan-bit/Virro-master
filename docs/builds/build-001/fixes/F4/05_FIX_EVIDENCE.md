# F4 Fix Evidence

## Focused SQL Evidence

`pnpm test:sql` passed with 13 tests. The added cases prove:

- OWNER revoked before commit -> `TRUST_COMMIT_NOT_AUTHORIZED`;
- acceptance OWNER revoked before commit ->
  `TRUST_HUMAN_ACCEPTANCE_AUTHORITY_REVOKED`;
- stale/forged MEMBER identity -> denied;
- different current OWNER -> successful commit;
- denied paths leave head, versions and StateCommit unchanged;
- the deployed function definition contains `FOR UPDATE`, stable membership
  ordering and private delegation to the F1 implementation.

The focused security contract passed 32 tests and confirms the wrapper is
`SECURITY DEFINER`, current-state based, lock-bound and does not send cached
role/tenant/lease data as RPC authority.

## Regression Evidence

- F1 SQL lane: 13/13 passed, including atomicity and idempotency.
- F2 application lane: 9/9 passed.
- F7/R1/R2 assurance suite: 92/92 passed.
- Security plus assurance: 141/141 passed.

No F3, F5 or F6 implementation files changed.
