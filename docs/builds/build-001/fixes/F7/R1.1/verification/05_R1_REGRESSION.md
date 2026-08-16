# BUILD 001-F7-R1.1-V - R1 regression

## Semantic suite

`tests/assurance/semantic-evidence-qualification.test.ts`: 16/16 passed.

The original four false-proof attacks all remained `NOT_PROVEN`:

1. unrelated E5 workflow versus E4 tenant RLS;
2. E4 Storage versus E4 RLS;
3. E3 PostgreSQL trigger versus E3 HTTP authentication;
4. unrelated E5 workflow versus E3 atomicity.

Control and boundary semantic changes invalidated old receipts through version/hash binding. Five omission cases (`subjectId`, `controlId`, `boundaryId`, `environmentClass`, and `criterionDefinitionHash`) were rejected. Ten E1 receipts did not aggregate into E3, and E2 plus E3 did not aggregate into E4.

F1 E3 and F2 E2 semantic positive controls both remained `PROVEN` under their committed criteria.
