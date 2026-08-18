# BUILD 001-F9 Fix Design

The forward migration introduces `enforce_preservation_run_lineage()` and
rebinds only `preservation_runs_trust_lineage_guard` to it. INSERT validates
the existing transaction, execution, source-version, and raw-candidate
lineage. UPDATE keeps owner, transaction, execution, source version, raw
candidate, policy, methodology, ROI, coupled band, and start time immutable.

Only the repository-supported lifecycle fields can change. A non-null
preserved candidate must be the same tenant/transaction/execution, have type
`PRESERVED`, point to the run's raw candidate, and reference the same run.
