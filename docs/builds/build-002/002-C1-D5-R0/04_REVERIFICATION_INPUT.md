# Reverification Input

Expected parent: `51e283c3a830d444170a589a6ba7ad6a837607ed`.

Expected candidate checks: PostgreSQL 17 migration replay `38/38`, D0-D4
regressions unchanged, D5 assurance/native tests, TypeScript, ESLint, full
regression, dual runtime, OCI/container and production build. The main branch
must remain at the canonical parent and this branch must not merge D5 or start
D6.
