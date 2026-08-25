# Patch Contract

- Add exactly one migration: `20260823130000_build_002_c1_d4_r1_authority_closure.sql`.
- Preserve the R0 migration and all D0-D3 behavior.
- Derive authority identity from locked tenant, membership, admission,
  authority commit, transaction, asset, version, binding and profile rows.
- Recompute transaction/source semantic hashes and TaskSpec hashes with the
  explicit canonical JSON contract.
- Validate the complete persisted row before both normal and unique-violation
  retry returns.
- No execution, lease, provider, StateCommit, migration rewrite, merge or D5.
