# BUILD 001-F7-R1.1 - Reverification input

## Baseline and scope

- baseline: `501db46c421a351be789555dd1a09ca3252bb541`;
- review only R1.1 assurance source, manifest, tests and documentation;
- confirm no application, migration, Supabase, dependency or runtime change.

## Adversarial checks

1. Re-run every case in `tests/assurance/derived-independence.test.ts`.
2. Attempt to obtain `PROVEN` from an independent criterion using only `declaredIndependence` or display names.
3. Attempt same actor with distinct contexts and distinct actors with the same context.
4. Remove each participant, stable identity and context independently.
5. Classify the verifier as execution.
6. Confirm distinct stable actors and contexts with typed execution/verification roles remain eligible.
7. Confirm `RECORDED_ONLY` does not impose independence universally.
8. Re-run all R1 semantic mismatch and evidence-escalation attacks.
9. Confirm F1 E3 and F2 E2 manifest evaluations remain `PROVEN` with unchanged criterion hashes.

## Required limitation

A pass establishes only that the evaluator derives structural independence from the modeled relationship. It must not be reported as authenticated provenance, full F7 closure, R1 verification, remote staging evidence, or artifact authenticity. Those remain open for F7 R2 and later work.
