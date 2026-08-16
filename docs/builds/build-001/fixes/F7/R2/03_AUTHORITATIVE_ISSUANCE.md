# BUILD 001-F7-R2 - Authoritative issuance

## Issuer inventory

- `AUTHORITATIVE_RUNNER`: `createLocalEvidenceRunner`; the only path eligible for `RUNNER_RECORDED`.
- `TEST_FIXTURE`: static repository fixtures and the generated assurance manifest; `DECLARED_ONLY`.
- `IMPORTED`: documented historical evidence; `DECLARED_ONLY`.
- `MANUAL_INPUT` / `UNKNOWN`: representable but never promoted without an authority appropriate to the criterion.
- `AUTHORITATIVE_CI`: reserved for a future real CI attestation boundary; no issuer is implemented in R2.

## Runner boundary

The runner requires a clean Git worktree, records HEAD before execution, resolves the requested command ID through its configured registry, executes without a shell, derives PASS/FAIL from the child exit code, and rejects a dirty or changed source afterward.

It creates executor/verifier actor component IDs and distinct execution/gate context UUIDs. Callers cannot supply those fields. Actor identity is runner-derived but not externally authenticated.

The runner holds an in-memory issuance registry. Registration requires a private module capability token. The evaluator accepts runner provenance only when given that live authority and a matching issuance record; serialized fields alone cannot enroll evidence.

## Command binding

Criteria accepting `RUNNER_RECORDED` must list explicit `acceptedRunnerCommandIds`. The runner accepts only IDs present in its command registry and records the actual executable, arguments, invocation digest, start/end, exit code, and stdout/stderr digests.
