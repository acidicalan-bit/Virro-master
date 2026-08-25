# Runtime Status

The local environment has no `psql` or Docker executable. Therefore clean
PostgreSQL 17 replay, native D5 issuance, concurrency, OCI, and preview
evidence are blocked locally. The prior full-suite run also contained timeout
and Windows `EPERM` failures outside the R1 diff; E1 does not classify those
as a PASS without an equivalent baseline run.

The first CI attempt exposed two E1 harness-only defects: concurrent native
suites raced while creating shared fixture roles, and the E1 preflight omitted
the Storage columns required by the existing migration set. The repair is
limited to test setup, the exact-patch fixture, and workflow serialization;
no product file changed. The positive fixture reuses the existing D4 graph and
asserts one canonical lease with no additional execution run.
The fixture explicitly restores its disposable tenant, membership, transaction,
and asset-head state before issuing D4; this prevents preceding negative cases
from contaminating the positive path.
