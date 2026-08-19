# BUILD 002-A R3 Fix Record

## Result scope

R3 is a narrow pure-domain correction appended to the accepted R2 history. It
does not add persistence, migrations, RLS, APIs, executors, TaskSpec, Field
Beta, or a new dependency. The R2 candidate remains preserved at
`ea16ed21fba82761503538b08b7a79be8daecd14`; R3 is an additional normal commit
on `build/build002-a-domain`.

## Findings closed

- **A11 temporal causality:** a hash-valid qualification whose `qualifiedAt`
  is later than the readiness evaluation instant is now fail-closed and cannot
  contribute to `READY`.
- **A12 canonical instant semantics:** accepted equivalent UTC ISO forms are
  normalized before comparison and before semantic hashing. Raw datetime
  strings are no longer used for BUILD 002-A authority decisions.

## Canonical time model

The domain uses UTC millisecond precision and serializes every semantic instant
as `YYYY-MM-DDTHH:mm:ss.sssZ`. `parseInstant` validates the existing Zod ISO
datetime input, rejects offsets and fractional precision finer than a
millisecond, rejects invalid/non-finite dates, and returns canonical UTC.
`instantEquals`, `instantBefore`, `instantBeforeOrEqual`, and `earliestInstant`
perform temporal decisions over epoch milliseconds.

Signal `validUntil`, qualification `qualifiedAt` and `evidenceValidUntil`, and
readiness `validUntil` are canonicalized before hashing. Qualification time is
derived only from `evaluationTime`; a caller-supplied `qualifiedAt` is not an
input. Critical readiness horizons use the chronological earliest non-null
qualification horizon. Equality at an evidence horizon is expired. A
`QUALIFIED` artifact is temporally coherent only when its evidence horizon is
null or strictly after `qualifiedAt`.

`capturedAt` remains audit metadata excluded from the signal content hash, as
accepted in the prior BUILD 002-A contract. It is not an authorization input.

## Schema decisions

- Signal: `build002-signal-v0.1` -> `build002-signal-v0.2`
- Qualification: `build002-signal-qualification-v0.2` -> `build002-signal-qualification-v0.3`
- Readiness: `build002-signal-readiness-v0.2` -> `build002-signal-readiness-v0.3`
- Dependency snapshot: remains `build002-dependency-snapshot-v0.2`
- Requirement definition: remains `build002-signal-requirement-v0.1`

The bumps make the changed temporal hash material explicit. BUILD 002-A has
no persistence compatibility layer to migrate.

## Verification evidence

The permanent R3 regression matrix covers equivalent ISO representations,
unsupported precision and offsets, signal/qualification/readiness hash
canonicalization, signal and readiness boundary equality, chronological
critical horizons, future qualifications (including hash-valid artifacts),
temporal self-consistency, non-critical expiry, and the positive T0/T1/T2
READY/CURRENT/EXPIRED chain. The full A1-A10 regression suite remains in the
same test file and is rerun with the repository gates.

## Remaining boundaries

BUILD 002-B, BUILD 002-C, BUILD 002-D, and BUILD 002-E remain unimplemented
and unverified. R3 does not claim runtime, persistence, API, or provider
assurance beyond this pure BUILD 002-A domain module.

The final R3 result SHA is recorded by the Git commit and verification report
after all gates complete.
