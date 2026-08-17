# Fix Evidence

## Focused matrix

`tests/outcome/criterion-machine-evidence.test.ts` passes 17/17, including:

- positive complete machine evidence;
- valid semantic failure remains `FAILED`;
- verifier version mismatch;
- verifier-definition hash mismatch;
- policy-definition hash mismatch;
- historical unbound evidence;
- caller-spoofed identifiers/hashes;
- canonical fingerprint stability and change detection;
- exact criterion-set, lineage, tenant, task-spec, and artifact checks.

The existing F7 tests continue to require authoritative provenance, so copying a public binding snapshot does not create authoritative issuance. R2.1 command identity/hash checks remain unchanged.

## Boundary classification

- material definitions: `PRIVATE_AUTHORITY`;
- binding return value: `SAFE_SNAPSHOT`;
- `precisionEditVerificationBinding()` and qualification function: `PUBLIC_OPERATION`;
- display labels and caller details: non-authoritative metadata.

No unnecessary verifier/policy registry or mutable definition object is exposed.
