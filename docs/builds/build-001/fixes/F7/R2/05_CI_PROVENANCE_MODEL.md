# BUILD 001-F7-R2 - CI provenance model

## Current status

`CI_ATTESTED` and `REMOTE_ENVIRONMENT_ATTESTED` are expressible requirement classes, but no local or manifest path can satisfy them. A locally constructed CI-shaped receipt remains `NOT_PROVEN`. No remote workflow was executed for R2.

A future CI authority must verify repository identity, commit SHA, workflow/ref, job/run identity, build/spec/criterion hash, command/result, artifacts, and an external attestation before issuing `CI_ATTESTED`. Merely reading caller-set `GITHUB_*` environment variables is not sufficient.

## Action integrity

All third-party actions in `.github/workflows/assurance.yml` are pinned to full commits resolved from their official v6 tags:

- `actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803`;
- `pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86` (peeled v6 tag commit);
- `actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38`.

Comments preserve the human-readable major version. This hardens workflow dependency identity but does not prove that CI ran or attest its output.
