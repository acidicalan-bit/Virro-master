# BUILD 002-C1-D5-R1 Reverification Input

Base product: `a5a72e569e9412774f76fc7ccbcf4a922dcb1a87`

Required native evidence is a fresh PostgreSQL 17 replay of 39 migrations,
including a positive exact-match grant, expired-row rejection, same-path value
substitution, operation substitution, parameter substitution, concurrent
identical retry, tamper readback, ACL, and zero-consequence checks. D0 through
D4 and the full regression suite remain required. This document does not claim
those runtime gates before they execute on the final R1 SHA.
