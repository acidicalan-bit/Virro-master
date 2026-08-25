# BUILD 002-C1-D5-R2-V1

Independent verification is rooted directly at product SHA
`eb739b58c77ee7a114c24a7392e3a569190f84a8`. The verifier branch contains only
verification tests, evidence documentation, and its dedicated workflow.

The native harness provisions a fresh PostgreSQL 17 database, replays all 40
migrations, exercises the exact critical and non-critical `SET_ATTRIBUTE`
contract, checks denied inputs, validates retry/freshness/readback behavior,
measures ACLs and consequence deltas, and runs predecessor native checks.

This branch is never merge-authorized. It does not change product code,
migrations, runtime configuration, or the production database.
