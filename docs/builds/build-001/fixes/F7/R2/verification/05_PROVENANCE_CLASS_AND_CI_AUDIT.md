# Provenance class and CI audit

## Class compatibility

`DECLARED_ONLY`, `RUNNER_RECORDED`, `CI_ATTESTED`, and `REMOTE_ENVIRONMENT_ATTESTED` are explicit compatibility classes, not a numeric ladder. Locally promoted CI/remote receipts returned `NOT_PROVEN` with `ATTESTED_PROVENANCE_AUTHORITY_UNAVAILABLE`. Structural independence alone did not satisfy runner provenance.

The manifest keeps existing F1/F2 receipts at `DECLARED_ONLY`; it does not upgrade historical evidence. No real CI receipt or remote E4 receipt exists.

## CI and action pins

All six action uses in `.github/workflows/assurance.yml` are 40-character immutable SHAs. No mutable `@vN` remains in the assurance chain. Human-readable `# v6` comments do not alter execution. Permissions remain `contents: read` and were not broadened.

Local tests establish only CI provenance logic. Actual `CI_ATTESTED` remains `NOT_PROVEN` because no remote workflow issuance was executed.

## Signature and authenticity claims

No signing implementation or fake PKI was added. Documentation explicitly states that a local digest provides tracked integrity, not external authenticity or non-repudiation. Protected signing, authenticated actor identity, and external attestation remain unavailable.

## Canonicalization, CRLF, and result SHA

Canonical JSON produced identical values for reordered properties, compact/pretty formatting, and LF/CRLF text. The actual generated manifest was converted to 3,006 CRLF endings; `pnpm assurance:check` still passed, and the original bytes were restored.

Exact-byte artifacts remained EOL-sensitive. Runner receipts derive `resultSha` from observed Git HEAD and validate it against the runner observation. The manifest's former misleading top-level current `resultSha` is now the historical `evidenceHistoryThroughSha`; historical declared receipts retain their recorded result SHAs without claiming current runner authority.
