# BUILD 001-F6-V Verification Summary

## Verdict

**F6_FAILED**

Candidate `5d85eee43741b18104f3817b4418623596e83bf8` has the expected parent `6454b7a30ada30800b2836298b2b04f8f25cf324` and was verified in a clean `codex/build001-f6` worktree. The binding mechanism itself is deterministic and fail-closed for metadata mismatches, but its material verifier definition is incomplete.

## Decisive finding

`src/application/outcome/media/creative-assertions.ts` creates seven required assertions and computes global `MachineVerificationResult.status` from all seven. F6 fingerprints only three assertions (`EDIT_REGION_HAS_CHANGE`, `SOURCE_IMMUTABLE`, `PROVENANCE_VALID`) and the policy maps only the three corresponding criterion records.

Repository-local counterexample: set the three fingerprinted assertions to pass, set `DIMENSIONS_MATCH` and `LOCKED_OUTSIDE_EXACTLY_PRESERVED` to fail, and set the aggregate machine status to `FAILED`. `buildPrecisionEditCriterionEvidence` followed by `deriveMachineSameSpecFromDurableEvidence` returned `PASSED` for the complete F6 criterion set. Thus a material verifier failure outside the fingerprint can still produce a qualifying decision.

No implementation was changed by this verifier. Only the documents in this `verification/` directory were added.
