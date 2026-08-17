# F6-R1 Patch Contract

## In scope

- Bind all seven required Precision Edit verifier assertions.
- Record the executed assertion outcomes in the canonical criterion-evidence verifier JSON.
- Require complete global assertion evidence during qualification.
- Return `FAILED` for an authoritative failed required assertion and `INCOMPLETE` for missing/insufficient assertion evidence.
- Preserve the existing policy binding, F7 provenance/independence/authority controls, and insert-only persistence.

## Out of scope

No F3, BUILD 001-R, new infrastructure, signature scheme, migration, product redesign, or unrelated runtime behavior.

Global requirements remain global; no artificial business criterion was added for the four previously unmapped assertions.
