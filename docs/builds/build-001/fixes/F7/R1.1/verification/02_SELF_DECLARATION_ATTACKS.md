# BUILD 001-F7-R1.1-V - Self-declaration attacks

## Results

For an `INDEPENDENT_VERIFIER` criterion, structurally non-independent receipts remained `NOT_PROVEN` with every metadata value accepted by the schema:

- `IMPLEMENTER`;
- `INDEPENDENT_VERIFIER`;
- `AUTOMATED_GATE`.

Unsupported `INDEPENDENT` and boolean `true` declarations were rejected by the strict schema. The removed legacy `independence` property was also rejected.

## Presentation attacks

With identical stable actor IDs, changing executor/verifier display names, casing, labels, human-readable identifiers, and free-form role descriptions did not alter the result: `NOT_PROVEN`.

The positive control used a misleading `declaredIndependence: IMPLEMENTER` label with genuinely distinct typed participants and still produced `PROVEN`. This counter-test demonstrates that the declaration is ignored in both directions.
