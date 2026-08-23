# PORTABILITY-000-R3.1 Independent Verifier

This verifier is evidence-only. It is rooted at product SHA `6f3dc26601d453ff699e01259bdc09c61bdd2679` and fails closed when the frozen portability contract, source environment discovery, provider boundaries, or product ancestry differ.

The verifier covers all seven supported source extensions, dot/bracket/dynamic environment attacks, negative system allowlist cases, synchronized secret downgrades, environment authority coherence, provider boundaries, migration identity, and product-file immutability. Native PostgreSQL 17 D0/D2, OCI, and runtime checks run in the dedicated workflow.

It does not modify or merge the product branch, and it does not establish claims beyond the existing portability claim matrix.
