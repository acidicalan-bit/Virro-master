# BUILD 001-F9 Finding

`PreservationRun` lifecycle completion was attached to the shared
`enforce_execution_reference_lineage()` trigger. That function rejects every
UPDATE with `TRUST_STATE_COMMIT_IMMUTABLE`, so the supported preservation path
could insert a run but could not record its preserved candidate, zones, status,
timing, or completion timestamp.

The shared trigger remains correct for immutable evidence, verification, and
candidate artifacts. The defect is limited to the PreservationRun lifecycle
boundary.
