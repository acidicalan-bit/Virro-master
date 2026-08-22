# BUILD 002-C1-D2 R2 Independent Verification

This verifier runs only against the frozen product commit
`58ba90f66190d0899b41e215fa344c10291331e0`. It owns only the verifier tests
and workflow in this directory/branch; product source, migrations, and
authored assurance tests remain unchanged.

The primary property is post-commit currentness of a historical readiness
assessment. The verifier does not test delegability, execution, consequence
authorization, or future serialized authority.

Coverage includes caller-field injection and authority mutation, scoped
cross-tenant reads, same-tenant marker substitution, frozen marker shape,
`evaluationTime <= committedAt <= revalidatedAt`, semantic instant equality,
unsupported temporal forms, historical readiness/dependency corruption,
current graph/evaluator drift, source-head special handling, expiry and
precedence, phase short-circuiting, result coherence/immutability, and the
absence of C1-C/D0/D1/consequence operations.

The native fixture applies the repository's 31 migrations to an ephemeral
PostgreSQL 17 database. It disables the D0 coherence trigger only while
seeding disposable scoped-reader rows and restores it in `finally`; this does
not change migrations or production behavior.
