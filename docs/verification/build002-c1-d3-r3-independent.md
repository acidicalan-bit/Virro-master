# BUILD002-C1-D3-R3 independent verification

This verifier is rooted at promotion-fix product SHA `3c1481fb7f7bdbe243cbfe2a272d32358eded879`, a direct descendant of verified R3 SHA `40a954a88612e0af04fc6cdafd102d594d9163a4`, and
does not modify product source, migrations, authored tests, or runtime configuration.

The verifier independently checks the R2-to-R3 ancestry, the 34-file forward-only
migration chain, byte identity of the R0/R1 migrations, SQL ordering of the complete
retry envelope before existing-row lookup, and ten negative verifier mutations. Native
PostgreSQL 17 execution is mandatory in the protected workflow; a skipped native test
is a failure, not a pass. It also proves that predecessor tests reject reintroduced
global migration-count and latest-migration-name ratchets. The workflow reruns the authored R3 native suite twice,
then executes D0/D2 regressions, the product regression gates, dual builds, and OCI
smoke checks.

The verifier branch is evidence-only and must never be merged into product or `main`.
