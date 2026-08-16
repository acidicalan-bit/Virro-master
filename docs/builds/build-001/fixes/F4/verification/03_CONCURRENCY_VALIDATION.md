# BUILD 001-F4 Concurrency Validation

## Native multi-session attempt

The following repository-local/runtime capabilities were checked and were unavailable: `postgres`, `initdb`, `pg_ctl`, `psql`, `pg_isready`, Docker, Podman, and the Supabase CLI. No repository-native Testcontainers or shared PostgreSQL harness exists. No database URL or service-role credential was used.

## PGlite limitation

The repository includes PGlite for local tests, but PGlite is not evidence for this gate. Separate PGlite instances created against the same disposable directory did not expose a shared relation/state, and sequential transaction calls do not create independent PostgreSQL sessions contending on the same row locks. Therefore PGlite was not used to claim concurrency success.

## Scenario status

| Scenario | Required result | F4-V status |
| --- | --- | --- |
| Revocation effective before commit authorization | `DENIED` | NOT_PROVEN (native session unavailable) |
| Commit obtains linearization before later revocation | commit succeeds; revocation serializes behind | NOT_PROVEN (native session unavailable) |
| Historical acceptance then later revocation | no current authority retained | NOT_PROVEN (native session unavailable) |
| Another currently active OWNER | legitimate control succeeds | NOT_PROVEN (native session unavailable) |
| Any rejection | zero canonical partial state | NOT_PROVEN (native session unavailable) |

The SQL lock protocol is consistent with these outcomes, but the strict gate requires a real shared PostgreSQL database with two concurrent sessions. Verdict remains `F4_BLOCKED`.
