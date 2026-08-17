# F6-R1 Failure Analysis

Baseline: `5d85eee43741b18104f3817b4418623596e83bf8`.

The failed F6 implementation fingerprinted only `EDIT_REGION_HAS_CHANGE`, `SOURCE_IMMUTABLE`, and `PROVENANCE_VALID`. The canonical machine verifier in `creative-assertions.ts` actually declares seven assertions as required and computes global status from all seven.

The omitted assertions were `DIMENSIONS_MATCH`, `RAW_CANDIDATE_EXISTS`, `PRESERVED_CANDIDATE_EXISTS`, and `LOCKED_OUTSIDE_EXACTLY_PRESERVED`. A local reproduction made the three mapped assertions pass and two omitted assertions fail: global machine status was `FAILED`, while the previous criterion derivation returned `PASSED`.

R1 preserves the seven-assertion product meaning and closes the gap at both definition binding and qualification.
