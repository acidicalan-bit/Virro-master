# BUILD 001-F7-R1.1-V - Positive controls

## Structurally independent

A compatible PASS receipt with executor `actor:a` in `context:x` and verifier `actor:b` in `context:y`, typed as `EXECUTION` and `VERIFICATION`, produced:

- claim status: `PROVEN`;
- derived status: `STRUCTURALLY_INDEPENDENT`.

Matching display names and `declaredIndependence: IMPLEMENTER` did not change that result.

## Independence not required

A compatible PASS receipt with the same actor/context for both participants produced `PROVEN` when the criterion used `RECORDED_ONLY`. Its recorded assessment remained `NOT_STRUCTURALLY_INDEPENDENT`.

## Result semantics

A structurally compatible FAIL produced `FAILED`; a non-independent FAIL was incompatible and remained `NOT_PROVEN`. `SKIPPED_ENVIRONMENT`, `UNKNOWN`, and `NOT_RUN` never produced `PROVEN`.
