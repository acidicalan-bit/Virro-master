# BUILD 001-F4 Concurrency Validation

## Native multi-session result

No local server binary was required. A disposable Supabase project (`virro-f4-staging`, PostgreSQL 17.6, ref `exgbzdiebhcfjurpowel`) provided two independent SQL Editor sessions against one database. No production target or production credential was used.

## PGlite limitation

The repository includes PGlite for local tests, but PGlite is not evidence for this gate. Separate PGlite instances created against the same disposable directory did not expose a shared relation/state, and sequential transaction calls do not create independent PostgreSQL sessions contending on the same row locks. Therefore PGlite was not used to claim concurrency success.

## Scenario status

| Scenario | Required result | F4-V status |
| --- | --- | --- |
| Revocation effective before commit authorization | `DENIED` | PASS: `TRUST_COMMIT_NOT_AUTHORIZED` |
| Commit obtains linearization before later revocation | commit succeeds; revocation serializes behind | PASS: revocation waited behind the held locks |
| Historical acceptance then later revocation | no current authority retained | PASS: subsequent commit denied after membership became `REVOKED` |
| Another currently active OWNER | legitimate control succeeds | PASS: separate fixture committed successfully |
| Any rejection | zero canonical partial state | PASS: head unchanged, one version, zero commits |

The SQL lock protocol and all required concurrent outcomes were observed in a real shared PostgreSQL database. Verdict: `F4_VERIFIED`.

Observed control values: the commit session held the locks through a six-second sleep; the revocation request completed about 9.4 seconds after it started, after the commit returned. Final state was `COMMITTED`, two asset versions, one `StateCommit`, and membership `REVOKED`.
