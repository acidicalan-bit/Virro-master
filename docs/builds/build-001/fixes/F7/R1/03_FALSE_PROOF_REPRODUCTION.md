# BUILD 001-F7-R1 - False-proof reproduction

## Before patch

The verifier encoded four required attacks against baseline `2b6196a382565267069f836f878a82d80df9f223`.

| Attack | Baseline observed | Required |
|---|---|---|
| unrelated E5 workflow -> E4 RLS | PROVEN | NOT_PROVEN |
| E4 Storage -> E4 RLS | PROVEN | NOT_PROVEN |
| E3 PostgreSQL trigger -> E3 HTTP auth | PROVEN | NOT_PROVEN |
| unrelated E5 workflow -> E3 atomicity | PROVEN | NOT_PROVEN |

Pre-fix result: 4 tests failed because all received `PROVEN`.

## After patch

`tests/assurance/semantic-evidence-qualification.test.ts` preserves those attacks and adds:

- same criterion ID with changed control/version/hash;
- same criterion ID with changed boundary/version/hash;
- stale definition hash rejection;
- 10 x E1 cannot prove E3;
- E2 plus E3 cannot prove E4;
- positive F1 E3 and F2 E2 controls.

Post-fix focused result: all semantic attacks return `NOT_PROVEN`; both positive controls return `PROVEN`.

An adversary can still lie in every typed field and fabricate provenance. R1 does not claim to authenticate receipts; that validated provenance issue remains open.
