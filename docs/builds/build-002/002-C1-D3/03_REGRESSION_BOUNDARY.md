# Regression Boundary

D0, D1, and D2 semantics remain unchanged. D3 does not call
`bindExecutionAuthority`, does not create mutation leases, execution runs,
receipts, state commits, asset versions, or provider calls, and does not wire
the legacy transaction execution path. Future execution requires a fresh
currentness/recheck decision after any later material change.
