# Persisted Binding and Immutability

The criterion binding is inserted into the existing `verification_criterion_evidence.verifier` JSONB column. Qualification reloads criterion evidence and consumes that persisted verifier object, then compares it with a fresh repository binding; it does not use caller-supplied replacement data.

`verification_runs.details.verificationDefinition` is written as an audit copy. It is not read by `deriveMachineSameSpecFromDurableEvidence` and is therefore not a second authoritative policy source. The criterion-evidence row has the existing `verification_criterion_evidence_immutable_update` trigger backed by `build005_immutable_insert_only()`, plus service-role-only insert/select grants and the unique run/criterion key.

No new migration was added. The verification-run audit JSON itself has no equivalent insert-only trigger in the inspected migrations; it is non-authoritative and cannot repair or override immutable criterion evidence. Historical records are not rewritten or backfilled.
