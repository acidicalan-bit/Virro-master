# Fix Evidence

`tests/outcome/criterion-machine-evidence.test.ts` passes 24/24.

Coverage includes:

- the original decisive counterexample, now returning `FAILED`;
- each omitted assertion failing independently: dimensions, raw candidate existence, preserved candidate existence, and locked-outside preservation;
- missing required assertion evidence returning `INCOMPLETE`;
- partial historical F6 binding returning `INCOMPLETE`;
- verifier/policy mismatch, unknown, caller-spoof, and legacy controls;
- genuine criterion failure remaining `FAILED`;
- fingerprints changing for assertion removal/addition, semantic-version change, methodology change, result-rule change, and policy mapping change;
- object-order determinism and safe snapshot mutation isolation.

The canonical binding remains `verification_criterion_evidence.verifier`; `verification_runs.details.verificationDefinition` remains an audit copy.
