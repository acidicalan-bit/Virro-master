# Artifact and receipt integrity verification

## Path containment and existence

The independent harness rejected traversal, absolute paths, an in-repository junction to an external directory, missing files, directories, and broken junction paths. `realpath` containment and regular-file checks enforce the repository root.

A manual receipt for a missing future artifact remained `NOT_PROVEN` after the file was later created because it still lacked an issuance record. Legitimate issuance requires the artifact to exist.

## Exact-byte integrity

- Same-path, same-size replacement produced `ARTIFACT_INTEGRITY_MISMATCH`.
- SHA-256, not size, detected the replacement.
- Restoring the exact original bytes made the original receipt valid again. The model proves current exact-byte equality, not uninterrupted artifact custody.
- LF and CRLF artifact bytes produced different digests, as required by `EXACT_BYTES`.

## Receipt mutation and replay

Independent mutations covered result, actor, context, role, command, arguments, artifact path, artifact digest, artifact size, source SHA, baseline SHA, criterion hash, boundary, control, and environment. Each failed qualification or strict schema validation; schema-valid authoritative mutations did not become `PROVEN`.

Cross-build, cross-spec, and cross-criterion replays with matching claim metadata were rejected as `ISSUED_RECEIPT_MUTATED`. Copied receipt IDs/digests and lost process authority also failed closed.
