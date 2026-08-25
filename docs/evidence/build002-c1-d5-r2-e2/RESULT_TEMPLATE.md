# E2 Evidence Result

The authoritative result is emitted by the dedicated CI workflow for the exact
R2 product SHA `eb739b58c77ee7a114c24a7392e3a569190f84a8`.

Required evidence fields:

- `E1_FAILURE_REPRODUCED_ON_R1`
- `E1_FIX_REPRODUCED_ON_R2`
- `CRITICAL_TRUE_AUTHORIZED`
- `CRITICAL_FALSE_AUTHORIZED`
- `UNKNOWN_VALUE_REJECTED`
- `MISSING_VALUE_REJECTED`
- `PG_INCONSISTENT_READBACK`
- `TS_INCONSISTENT_READBACK`
- `ZERO_CONSEQUENCE`

No field is manually authored as a pass; values must come from the native
evidence tests and the workflow conclusion.
