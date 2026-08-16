# BUILD 001-F7-R2 - Receipt and artifact integrity

## Source and dirty policy

For runner evidence, `resultSha`, legacy immutable ref, and runner-observed `sourceSha` must agree. Qualification re-reads current Git HEAD and worktree status. Dirty source or a different HEAD invalidates provenance. Static `DECLARED_ONLY` result SHA fields remain metadata and cannot satisfy a runner requirement.

The manifest-level misleading `resultSha` was replaced with `evidenceHistoryThroughSha`, which describes the historical evidence covered rather than claiming the manifest's own self-referential commit.

## Artifacts

Criteria explicitly choose `NONE` or `AT_LEAST_ONE`. Runner paths are normalized repository-relative paths; absolute paths, traversal, missing/non-file artifacts, and real paths escaping the repository are rejected. Each relied-on file binds exact bytes, byte length, and SHA-256. Revalidation detects deletion, replacement, or mutation.

Exact-byte mode intentionally distinguishes CRLF from LF for evidence artifacts.

## Receipt integrity

`VIRRO_CANONICAL_JSON_V1` recursively sorts object keys, preserves array order and string bytes, and emits compact JSON independent of formatting or host EOL. SHA-256 covers every receipt field except the digest container itself. The authority also retains the issued digest and artifact bindings, so an attacker cannot mutate and merely recompute the public digest.

## Signature decision

No signature was added. There is no protected signing key unavailable to the same local user/process that controls source, command, receipt, and artifacts. A local signature would not add authenticity. Stronger cryptographic attestation remains a CI/remote concern.
