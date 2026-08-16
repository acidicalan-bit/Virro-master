# Concurrency Reproduction

## Pre-Fix Finding

The pre-F4 function definition was inspected at the real PostgreSQL/PGlite
boundary. Its OWNER membership read preceded the only `FOR UPDATE` asset lock,
establishing the validated stale-authority window described in
`00_FINDING.md`.

The strongest executable local reproduction available in this repository is
the real migration lane. Sequential revocation-first execution after the patch
denies with `TRUST_COMMIT_NOT_AUTHORIZED` and leaves the canonical snapshot
unchanged. The same lane also exercises acceptance followed by revocation,
forged/member identity, and a different current OWNER.

## Session Limitation

PGlite 0.5.5 does not provide two independent sessions sharing one database in
this test setup. Opening two instances on the same temporary directory yields
independent local filesystems, while its transaction API serializes work on one
instance. Therefore no claim of a real two-session interleaving is made here.

The lock protocol itself is verified against PostgreSQL semantics by the
loaded migration and function definition: tenant locking, membership locking,
stable lock order, and delegation all execute at the real local PostgreSQL
boundary. A deployed PostgreSQL multi-session race remains a validation gap.

## Race Semantics

- Revocation-first: verified as `DENIED`, with no canonical writes.
- Commit-first: deterministic by membership lock acquisition; a subsequent
  revocation waits and may commit afterward. Multi-session runtime observation:
  not available in PGlite.
