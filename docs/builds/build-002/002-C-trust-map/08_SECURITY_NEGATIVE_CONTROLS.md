# Security Negative Controls

The C implementation test matrix must include at least these controls:

1. Foreign tenant in body/query/header is ignored or rejected; authority
   remains server-derived.
2. Foreign transaction is rejected through tenant-scoped lookup.
3. Caller-declared `READY` cannot mint a READY persistence row.
4. Caller-declared `OBSERVED` is reclassified or rejected.
5. Caller requirement hash cannot replace the compiled requirement.
6. Caller content hash is recomputed and mismatches fail closed.
7. Caller qualification result is ignored or rejected.
8. Caller readiness hash is recomputed and mismatches fail closed.
9. Omission of a critical Signal yields non-READY.
10. Contradictory Signals yield non-READY or human review.
11. Revoked/inactive users are denied.
12. Cross-tenant reads return no data or authorization denial.
13. `createSystemRepositories()` exposes no tenant-canonical BUILD002 bundle.
14. BUILD002 tenant factory rejects an empty scope.
15. Evaluation error leaves zero READY persistence for that evaluation.
16. No evaluation path invokes an executor, ExecutionAuthority, MutationLease,
    StateCommit, Field Beta execution, or candidate mutation.

The controls must test the real HTTP/application boundary and native
PostgreSQL/RLS boundary, not only mocks. Caller-owned objects and callbacks
must not be trusted as verifier or authority state.
