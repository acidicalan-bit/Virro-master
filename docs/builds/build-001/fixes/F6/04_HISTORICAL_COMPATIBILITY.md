# Historical Compatibility

Rows created before F6 may contain only `name`, `version`, and `policyVersion`. They remain parseable for audit and migration tooling, but `deriveMachineSameSpecFromDurableEvidence` classifies them as `INCOMPLETE` (`HISTORICAL_UNBOUND` in the verification matrix). No historical row is backfilled or treated as current by label coincidence.

Re-verification must issue a new receipt using the current authoritative runner/provenance path and produce a complete, hash-bound criterion set. A stale verifier version, policy version, identity, or either definition hash also fails closed as `INCOMPLETE`.
