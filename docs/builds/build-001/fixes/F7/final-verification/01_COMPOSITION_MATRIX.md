# Composition Matrix Evidence

The matrix was exercised in a disposable repository-local Vitest harness.
The harness created a clean Git repository, issued real local runner receipts
for the authoritative pass and fail commands, evaluated them through the
public API, then removed the temporary test and repository.

| Case | Construction | Observed status |
| --- | --- | --- |
| A | Wrong control/definition plus non-authoritative fixture | `NOT_PROVEN` |
| B | Wrong control/definition plus authentic runner receipt | `NOT_PROVEN` |
| C | Exact semantic fields plus `DECLARED_ONLY` receipt where runner provenance is required | `NOT_PROVEN` |
| D | Exact claim plus runner-issued self-test pass, private runner context | `PROVEN` |
| E | Exact claim plus runner-issued self-test fail (`exitCode=3`), private runner context | `FAILED` |
| F | E3 local receipt evaluated against an E4 remote RLS requirement | `NOT_PROVEN` |
| G | Valid receipt re-evaluated after committing a new source revision | `NOT_PROVEN`; `STALE_SOURCE_REVISION` |

The positive controls used the authoritative runner's observed command,
source SHA, artifact binding and receipt integrity. Caller-provided result,
command and provenance fields were not treated as authority.

The matrix also evaluated:

- authentic pass plus weak receipt: still `PROVEN` only because the authentic
  receipt independently qualifies;
- weak receipt plus authentic fail: `FAILED` only because the authentic fail
  independently qualifies;
- weak semantically valid receipt plus an authoritative receipt for another
  control: `NOT_PROVEN`.

There was no implicit cross-receipt promotion of evidence level or
provenance.
