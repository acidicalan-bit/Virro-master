# BUILD 002-C1-C R1 Independent Verification

This verifier branch is based directly on product SHA
`a58bd3105d7f03d1d20c5ae6ef7a4c39a483dced` and targets only the product
candidate branch. It does not modify product code, authored tests, migrations,
or the product assurance workflow.

The independent application test constructs its own canonical requirements and
signals, recreates the original positional hash comparison as a negative
control, and composes the actual C1-A, C1-B, and C1-C resolvers. It checks the
R1 opposite-order counterexample, set mismatches, three-requirement order
stability, current evaluator/time binding, complete qualifications, semantic
states, immutability, and the absence of persistence or operational authority.

The independent native test applies all 29 migrations to disposable
PostgreSQL 17, seeds a minimal tenant/project/asset/version/transaction and
BUILD002 signal chain, then composes the actual application resolvers while
checking zero writes. It does not claim full Supabase HTTP transport
end-to-end; that remains `NOT_PROVEN` unless separately executed.

C1-C remains `NON_ATOMIC_CANDIDATE_EVALUATION`; signal, dependency, evaluator,
and revalidation races remain owned by C1-D. A READY candidate is not an
operational delegation decision.
