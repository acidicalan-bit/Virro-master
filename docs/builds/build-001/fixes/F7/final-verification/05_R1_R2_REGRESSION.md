# R1 And R2 Regression

R1 semantic coverage and the complete provenance coverage were run from the
candidate worktree.

| Suite | Result |
| --- | --- |
| `tests/assurance` (R1, R2, R2.1, R2.2) | 7 files, 92/92 passed |
| focused R2.2 + R2.1 (previous candidate verification) | 2 files, 17/17 passed |
| `tests/security tests/assurance` | 13 files, 139/139 passed |
| composition matrix harness | 1 test, passed |

The R2.2 authority encapsulation remains in force: the public evaluation
context exposes only a frozen `contextId`; copied, recreated, proxied or
caller-injected contexts do not resolve the private `WeakMap` authority.
R2.1 command IDs and command-definition hashes remain exact and fail closed.

No implementation, application, migration, dependency or test source was
changed for this verification; the matrix harness was disposable and removed.
