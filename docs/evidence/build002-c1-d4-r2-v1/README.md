# BUILD002 C1-D4-R2-V1 Independent Verification

This directory contains evidence-only verifier material for the exact
product commit `72c0faab064b7609583bfaaf4cea883f7de098fd`.

The verifier test provisions an isolated PostgreSQL database, replays the
repository migration set, exercises the production canonical JSON/hash
functions and TypeScript TaskSpec/authority code, and checks rejection,
currentness, retry, tamper, ACL, identity, and zero-consequence properties.
It is intentionally separate from the authored D4 test and does not modify
product code or migrations.

The dedicated workflow is
`.github/workflows/build002-c1-d4-r2-v1-verifier.yml`. A final verdict is
valid only when the workflow head SHA equals the verifier commit SHA and the
workflow conclusion is successful.
