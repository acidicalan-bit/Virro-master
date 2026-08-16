# BUILD 001-F7-R2 - Provenance trust model

## Classes

- `DECLARED_ONLY`: fixtures, manual documents, imports, and static manifests; no execution authenticity claim.
- `RUNNER_RECORDED`: a local repository runner observed source, command result, contexts, and artifacts during the current process.
- `CI_ATTESTED`: reserved for a trusted CI issuance/verification boundary; unavailable locally.
- `REMOTE_ENVIRONMENT_ATTESTED`: reserved for actual remote environment evidence; out of scope and unavailable.

Compatibility is explicit per criterion, not ordinal.

## Local trust boundary

The local runner improves integrity and source/execution binding but is controlled by the same local user and repository process. It does not provide cryptographic actor authenticity or external attestation. No signing key boundary exists, so R2 must not add decorative signatures.

## Trusted facts

For `RUNNER_RECORDED`, authority comes from a live issuance registry held by the runner, not serialized receipt fields. Git HEAD/dirty state, child-process exit, runner-created contexts, exact artifact bytes, and canonical receipt digest are runner observations.

Actor identity is limited to runner components/local execution identity and is not externally authenticated. CI and remote claims remain `NOT_PROVEN` without a real external authority.
