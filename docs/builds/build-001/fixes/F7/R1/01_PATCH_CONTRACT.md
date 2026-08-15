# BUILD 001-F7-R1 - Patch contract

## Required claim definition

Every claim requires all of these fields; no omission means "any":

- exact `buildId`, `specId` and `criterionId`;
- positive `criterionVersion` and computed `criterionDefinitionHash`;
- typed `subjectId`, `controlId` and `requiredBoundaryId`;
- non-empty explicit `acceptedEnvironmentClasses`;
- `minimumEvidenceLevel`;
- `independenceRequirement`.

Human `subject` and `control` remain non-authoritative metadata.

## Required receipt dimensions

Every receipt records criterion version/hash, typed subject/control/boundary/environment, actual evidence level, result, executor, verifier and independence. Human boundary/environment descriptions remain visible but cannot grant authority.

## Status contract

- compatible PASS -> `PROVEN`;
- compatible FAIL -> `FAILED`;
- incompatible PASS or FAIL -> `NOT_PROVEN`;
- definition-bound environment skip -> `SKIPPED`;
- definition-bound UNKNOWN/NOT_RUN -> `UNKNOWN`;
- no compatible execution -> never `PROVEN`.

Several receipts are not combined into a stronger virtual receipt. Every receipt must independently satisfy one explicit criterion clause.
