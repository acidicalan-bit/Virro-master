# Fix Evidence

Evidence is produced by `tests/native/build002-c1-d5-r0-postgres.e3.test.ts`
when the candidate workflow supplies a PostgreSQL 17 runtime. The test replays
all 38 migrations into a disposable database, measures the RPC/table ACLs,
rejects forged direct writes, and checks zero D5/legacy/execution/state-commit
rows. The assurance test covers the canonical hash and exact-path contract.

The native positive issuance matrix requires the existing D0-D4 graph fixture;
the candidate workflow must run the D0-D4 suites before this D5 gate. No remote
production Supabase execution is claimed by this candidate.
