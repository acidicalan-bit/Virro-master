# BUILD 001-F7-R1.1 - Finding

## Baseline

Exact remediation baseline: `501db46c421a351be789555dd1a09ca3252bb541`.

## Validated finding

R1 treated the receipt field `independence: INDEPENDENT_VERIFIER` as authoritative. A matching PASS receipt with the same executor and verifier could therefore satisfy an independent-verifier criterion and produce `PROVEN`.

The persistent pre-fix test reproduced this result: expected `NOT_PROVEN`, received `PROVEN`.

## Root cause

Independence was modeled as a caller-supplied label rather than a relationship derived from stable participant and execution-context identifiers.

All independently verified R1 subject, control, boundary, environment, criterion hash and evidence-level semantics remain outside this finding.
