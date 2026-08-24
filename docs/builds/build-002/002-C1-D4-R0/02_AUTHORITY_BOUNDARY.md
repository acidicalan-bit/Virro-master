# Authority Boundary

The only public operation is a narrow identity-selector call to
`build002_grant_execution_authority`. The returned value is a frozen,
non-capability fact. The live SQL capability token, D0 marker, D3 admission,
catalog rows, graph rows, and TaskSpec row remain private to the SECURITY
DEFINER transaction.

The legacy `ExecutionAuthority`/`bindExecutionAuthority` model is not used by
D4 and is not a source of truth. D4 grants no mutation paths and cannot start
execution.
