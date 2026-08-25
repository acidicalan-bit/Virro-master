# BUILD 002-C1-D5-R1 Finding

R0 issued an immutable lease but could return an existing row after its
`valid_until` timestamp. R0 also checked only path membership and broad
operation families, so a same-path value or operation substitution was not
authoritatively rejected by the database boundary.

The R1 repair is forward-only from `a5a72e569e9412774f76fc7ccbcf4a922dcb1a87`.
The R0 migration remains byte-identical.
