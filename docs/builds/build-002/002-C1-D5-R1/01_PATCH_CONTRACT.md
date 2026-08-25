# BUILD 002-C1-D5-R1 Patch Contract

Only an exact `SET_ATTRIBUTE` mutation is admissible in R1. The
`transaction_patches` row and its `partial_intents` row must belong to the
same transaction, use the same exact path, use the same operation, and carry
the same JSON value as the unique non-UNKNOWN TaskSpec value for that path.

`ADJUST_ATTRIBUTE` is rejected because the current TaskSpec schema does not
encode an authoritative adjustment delta. No semantic meaning is inferred.
