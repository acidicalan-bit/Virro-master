# BUILD 001-F7-R2.2 Finding

Baseline: `947d3800d72f95722d5259953e539d337e1044ed`.

R2.1 closed caller-supplied command-definition rebinding, but R2.1-V found a remaining provenance bypass: `evaluationContext()` returned the live `LocalRunnerAuthority` instance. A caller could replace `authority.verify`, forge a `RUNNER_RECORDED` receipt, and make `evaluateClaim` return `PROVEN`.

The security boundary was wrong because the capability that decides authoritative issuance validity escaped into caller-controlled code. R2.2 encapsulates that capability without changing command definitions, receipt semantics, R1 semantics, or application behavior.
