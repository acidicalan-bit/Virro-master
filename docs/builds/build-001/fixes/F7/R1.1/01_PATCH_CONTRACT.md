# BUILD 001-F7-R1.1 - Patch contract

## Scope

This patch changes only development-assurance receipt typing, independence derivation, manifest representation, tests and assurance documentation. It does not modify product receipts, application runtime, Supabase, migrations, F3-F6, remote staging or provenance verification.

## Criterion behavior

- `RECORDED_ONLY`: independence is not required; otherwise compatible executor-produced evidence remains eligible.
- `AUTOMATED_OR_INDEPENDENT`: a valid typed automated gate or structurally independent verifier relationship is required.
- `INDEPENDENT_VERIFIER`: only `STRUCTURALLY_INDEPENDENT` satisfies the criterion.

Criterion definitions and hashes are unchanged.

## Fail-closed behavior

For `INDEPENDENT_VERIFIER`, missing participant bindings, identities or contexts, identical actor IDs, identical context IDs, an executor not classified as execution, or a verifier not classified as verification make the receipt incompatible and therefore unable to produce `PROVEN`.
