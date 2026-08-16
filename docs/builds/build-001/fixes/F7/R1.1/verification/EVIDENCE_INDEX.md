# BUILD 001-F7-R1.1-V - Evidence index

## Candidate evidence

- evaluator and derivation: `src/assurance/development-evidence.mts`;
- manifest source: `assurance/build-001-evidence-source.mts`;
- generated output: `assurance/build-001-evidence-manifest.json`;
- persistent R1.1 attacks: `tests/assurance/derived-independence.test.ts`;
- R1 semantic attacks: `tests/assurance/semantic-evidence-qualification.test.ts`;
- manifest authority tests: `tests/assurance/build001-evidence-manifest.test.ts`.

## Verification artifacts

- `00_R1_1_VERIFICATION_SUMMARY.md`: verdict, rubric, and conclusion;
- `01_DIFF_SCOPE_AUDIT.md`: Git and decision-path scope;
- `02_SELF_DECLARATION_ATTACKS.md`: declaration and presentation results;
- `03_ACTOR_CONTEXT_ROLE_ATTACKS.md`: relationship, role, and R2 boundary;
- `04_POSITIVE_CONTROLS.md`: positive and result-state controls;
- `05_R1_REGRESSION.md`: R1 and original F7 false-proof replay;
- `06_FULL_REGRESSION_RESULTS.md`: command results and environment note.

## Open provenance gaps

F7-R2 must establish authoritative actor and context issuance/resolution, canonical identifier semantics, receipt authenticity, signer/runner binding, and artifact provenance. R1.1 establishes only evaluator-derived structural independence from the relationships currently supplied.
