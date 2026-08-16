# BUILD 001-F7-R2 - Finding

## Baseline

R2 starts at independent verification commit `0c3465b5f288d90fad7dd2ae2150146da7352a70`, whose parent is the verified R1.1 candidate `1f4b1ad3c6a7073dd7b1083a3e25862c9f76755a`.

## Vulnerable path

Any caller can construct a `DevelopmentEvidenceReceipt`, pass schema validation, and reach `evaluateClaim`. Qualification trusts receipt-supplied actor IDs, context IDs, source SHA, command result, artifact references, and provenance kind. No authoritative issuer or external issuance record exists.

A syntactically perfect manual receipt can therefore copy valid semantic fields, claim PASS, name nonexistent artifacts, and obtain `PROVEN`.

## Root cause

Declared metadata and runner-observed facts share one representation and one authority level. Receipt integrity, current source state, command execution, and artifact existence/integrity are not verified.
