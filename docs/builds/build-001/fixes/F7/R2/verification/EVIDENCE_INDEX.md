# F7-R2 independent verification evidence index

## Candidate

- Candidate: `a819dd4eb29cdad621872ea6b55d7c27090b5174`
- Baseline and merge-base: `0c3465b5f288d90fad7dd2ae2150146da7352a70`
- Verification branch: `codex/build001-f7-r2-v`
- Starting state: clean
- Verdict: `R2_FAILED`

## Documents

1. `00_R2_VERIFICATION_SUMMARY.md`: verdict, blocking falsification, and rubric.
2. `01_DIFF_SCOPE_AUDIT.md`: changed-file classification and forbidden-scope audit.
3. `02_ISSUER_FORGERY_ATTACKS.md`: manual forgery, registry, replay, and command-rebinding PoC.
4. `03_EXECUTION_SOURCE_BINDING.md`: process result, shell, Git, dirty tree, TOCTOU, actors, contexts, and lifetime.
5. `04_ARTIFACT_RECEIPT_INTEGRITY.md`: path containment, existence, exact bytes, mutation, and replay.
6. `05_PROVENANCE_CLASS_AND_CI_AUDIT.md`: class compatibility, CI, action pins, signatures, CRLF, and result SHA.
7. `06_R1_F1_F2_REGRESSION.md`: closed semantic and implementation regressions.
8. `07_FULL_REGRESSION_RESULTS.md`: exact independently observed command results.

## Final principle

An evidence receipt is not authoritative because its metadata looks credible.

Authority comes from a trusted issuance path plus verifiable binding to the execution, source revision, and artifacts actually observed. In this candidate, the receipt records the executed command, but the trusted requirement does not bind an accepted command ID to an authoritative executable and argument vector; therefore R2 cannot be verified.
