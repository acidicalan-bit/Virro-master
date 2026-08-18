# BUILD 001-F9 Evidence

The focused disposable PostgreSQL/PGlite test proves the baseline INSERT and
UPDATE failure, then proves the F9 lifecycle transition and all required
immutable-field, candidate-binding, evidence-receipt, verification-run, and
candidate-asset controls after the fix.

The deterministic remote producer subsequently crossed the F9 update boundary;
its next failure was a later preservation-evidence boundary, not the lifecycle
trigger.
