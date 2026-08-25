# Runtime Status

The local environment has no `psql` or Docker executable. Therefore clean
PostgreSQL 17 replay, native D5 issuance, concurrency, OCI, and preview
evidence are blocked locally. The prior full-suite run also contained timeout
and Windows `EPERM` failures outside the R1 diff; E1 does not classify those
as a PASS without an equivalent baseline run.
