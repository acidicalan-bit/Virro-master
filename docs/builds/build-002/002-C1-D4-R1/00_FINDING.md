# BUILD 002-C1-D4-R1 Finding

R0 created an execution-authority fact but left three closure gaps: the
admission/commit identity chain was not fully bound to the caller, PostgreSQL
used `jsonb::text` rather than the TypeScript canonical JSON contract, and
retry/readback validation was narrower than the persisted row. R1 repairs
these gaps with a forward-only migration.

R0 remains immutable historical evidence at `f80debf1e3ff63ee9e9d8ba322a2670e2eac8519`.
