# Result Semantics

The final evaluator first filters evidence to the exact build, spec and
criterion. It then computes semantic incompatibilities and provenance
assessment for each receipt. Only receipts with no incompatibility are
eligible for the result decision.

The effective precedence verified in `evaluateClaim` is:

1. compatible `FAIL` -> `FAILED`;
2. otherwise compatible `PASS` -> `PROVEN`;
3. otherwise definition-bound `SKIPPED_ENVIRONMENT` -> `SKIPPED`;
4. otherwise definition-bound `UNKNOWN`/`NOT_RUN` -> `UNKNOWN`;
5. otherwise -> `NOT_PROVEN`.

Thus semantic mismatch and provenance insufficiency cannot be compensated by
an observed `PASS`. A real compatible failing control is not downgraded to
`NOT_PROVEN`. `SKIPPED`, `UNKNOWN`, and `NOT_RUN` never become `PROVEN`.

The verified result is claim-local. The manifest summary counts statuses and
sets `allCurrentCriteriaProven` only when every current claim is `PROVEN`; it
does not reinterpret partial evidence as a global security assertion.
