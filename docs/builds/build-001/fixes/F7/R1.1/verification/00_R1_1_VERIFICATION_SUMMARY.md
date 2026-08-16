# BUILD 001-F7-R1.1-V - Verification summary

## Verdict

`R1_1_VERIFIED`

Candidate `1f4b1ad3c6a7073dd7b1083a3e25862c9f76755a` was checked from a clean, separate worktree. Its parent and merge-base are the required baseline `501db46c421a351be789555dd1a09ca3252bb541`.

## Finding under validation

R1 previously allowed a receipt-supplied independence label to satisfy an independent-verifier criterion. Confidence in this verification is high: static source-to-decision tracing, an independent 28-case dynamic attack matrix, persistent focused tests, SQL/application controls, and full regression all agree.

## Validation rubric

- [x] Receipt declarations and display metadata have zero qualification authority.
- [x] Same actor/context, missing data, and invalid roles fail closed.
- [x] Structurally independent and `RECORDED_ONLY` positive controls remain reachable.
- [x] No alternate evaluator trusts declared independence; R1/F1/F2 regressions pass.
- [x] Structural independence is not reported as authenticated provenance.

## Conclusion

`evaluateClaim` derives eligibility through `deriveStructuralIndependence`. `INDEPENDENT_VERIFIER` accepts only `STRUCTURALLY_INDEPENDENT`; `declaredIndependence` cannot grant that state. Actor and context authenticity remains explicitly open for F7-R2.
