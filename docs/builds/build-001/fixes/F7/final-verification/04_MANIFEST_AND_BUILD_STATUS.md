# Manifest And BUILD 001 Status

The checked manifest is `assurance/build-001-evidence-manifest.json` and was
validated with:

`node scripts/assurance/generate-build001-manifest.mts --check`

Observed current summary:

```text
PROVEN       7
FAILED       0
NOT_PROVEN   1
SKIPPED      1
UNKNOWN      5
allCurrentCriteriaProven: false
```

The manifest preserves the historical F1 representation:

- `BUILD-001-F1-BEFORE / atomic-commit`: `FAILED` for the real pre-F1 SQL
  boundary, alongside its model result;
- current `BUILD-001 / atomic-commit`: `PROVEN` after F1;
- current `BUILD-001-F2` route isolation and SQL regression: `PROVEN`;
- remote RLS: `NOT_PROVEN` due boundary/environment/level mismatch;
- remaining remote lanes: `SKIPPED` or `UNKNOWN` with explicit reasons.

The current BUILD 001 assurance state is therefore partial and truthful. It
must not be reported as BUILD 001 `PASS` or `SECURITY VERIFIED`.
