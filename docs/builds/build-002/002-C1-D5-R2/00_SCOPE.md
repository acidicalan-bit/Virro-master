# BUILD 002-C1-D5-R2 Scope

This candidate is a forward-only repair of the D5 MutationLease authority
contract. The historical R0 and R1 migration files remain unchanged. The
new migration removes the incorrect `critical=false` mutation gate from the
installed private issuer while preserving R1's exact TaskSpec, operation,
patch-value, expiry, currentness, and RPC-only checks.

No execution, provider call, state commit, or production database access is
introduced.
