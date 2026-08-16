# R2.2 Reverification Input

Candidate baseline: `947d3800d72f95722d5259953e539d337e1044ed`.

Required adversarial checks for the next independent verification:

1. Inspect every export and public return path for `LocalRunnerAuthority`, `authority`, `evaluationContext`, issuance registries, verifier callbacks, and command registries.
2. Assert that `evaluationContext()` exposes only an immutable non-authoritative snapshot.
3. Pass copied, proxied, mutated, and authority-injected context objects to `evaluateClaim`; all must fail closed.
4. Attempt to mutate returned command requirements or any returned nested values; private registry semantics must remain unchanged.
5. Confirm a legitimate runner-issued receipt qualifies and a manual receipt does not.
6. Re-run R2.1 command-binding attacks and R2/R1/F1/F2 regression lanes.

The expected result is `FIXED` only if the authority capability remains unreachable and all preserved controls remain green.
