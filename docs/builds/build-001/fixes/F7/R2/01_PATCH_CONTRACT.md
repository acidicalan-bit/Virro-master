# BUILD 001-F7-R2 - Patch contract

## Security invariant

A receipt cannot manufacture authoritative provenance by copying convincing fields. Runner-recorded provenance is eligible only when a repository runner actually issued the receipt and the evaluator receives the runner's live authority context.

## Narrow enforcement boundary

- criteria explicitly list compatible provenance classes;
- persisted/manual receipts remain `DECLARED_ONLY`;
- a single local runner observes clean Git state, executes the command, derives result and participants, verifies artifacts, and records issuance;
- evaluation verifies current source, artifact bytes, canonical receipt digest, and the non-serializable issuance record;
- unsupported CI/remote classes remain unproven.

## Compatibility

R1 semantic dimensions and structural independence remain unchanged. Existing F1/F2 manifest evidence stays valid only at its committed declared provenance class. Product EvidenceReceipt, application runtime, Supabase, migrations, F3-F6, and E4 execution remain untouched.

## Failure policy

Dirty source, stale HEAD, missing/replaced artifacts, absent authority, insufficient provenance class, command failure misrepresentation, or receipt mutation cannot produce `PROVEN` for runner-recorded requirements.
