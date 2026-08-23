# Native Gate

`tests/native/build002-c1-d3-postgres.e3.test.ts` applies all migrations to a
fresh PostgreSQL 17 database and exercises positive admission, concurrent
identical retry, stale serialized material, and append-only/ACL attacks.
CI is the authoritative native execution environment when local PostgreSQL 17
is unavailable.
