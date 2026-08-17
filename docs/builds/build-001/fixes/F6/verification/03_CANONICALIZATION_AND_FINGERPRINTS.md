# Canonicalization and Fingerprint Review

`canonicalize` sorts object keys, preserves array order, rejects non-finite numbers, and hashes with SHA-256.

The implementation does **not** sort arrays despite the earlier summary wording. This is correct for the current arrays: required assertion order and criterion mapping order are treated as ordered sequences in the material representation. The function therefore preserves order-sensitive semantics; reordered arrays produce different fingerprints.

Independent focused checks passed for:

- verifier/policy binding hashes are 64-character lowercase SHA-256 values;
- object property insertion order does not change a fingerprint;
- material field changes do change a fingerprint;
- mutating a returned binding snapshot does not alter a subsequent authoritative snapshot.

These gates pass, but deterministic hashing of an incomplete material definition does not close F6.
