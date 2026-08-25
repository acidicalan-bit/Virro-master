# BUILD 002-C1-D5-R2 Evidence Plan

Native PostgreSQL 17 evidence must prove:

- exact `SET_ATTRIBUTE` issuance for both `critical=true` and `critical=false`;
- rejection of unknown, missing, duplicate, malformed, and hash-mismatched values;
- consequence-time TaskSpec rehash and D4 graph revalidation;
- expired-lease rejection, sequential/concurrent idempotency, and zero consequence;
- RPC-only canonical table access and predecessor D0-D5 regressions.

The candidate is not independently verified or merge-authorized by this phase.
