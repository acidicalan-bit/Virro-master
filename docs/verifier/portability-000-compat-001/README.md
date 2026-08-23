# PORTABILITY-000-COMPAT-001 Independent Verification

This verifier is evidence-only. It is based directly on product
`dcc56e16f79973009909eb701b31073adc65d31e` and does not alter product files.

The verifier checks the exact four-file product delta, the framework-only
`VERCEL === "1"` build adapter, the six-value build truth table, conservative
portability claims, OCI source identity, and the recorded live Vercel
observations in `vercel-observation.json`.

The ten disposable attacks cover loose Vercel markers, removal of the
non-Vercel standalone path, application/configuration environment leakage,
claim strengthening, branded preview aliases, and digest-as-OCI identity.
Every attack must make the verifier exit nonzero; no attack is report-only.

The Vercel observation was collected with `vercel list --all --json`,
`vercel inspect --logs`, and direct requests to the exact preview. The
observation is a snapshot of those external facts, not product configuration.
