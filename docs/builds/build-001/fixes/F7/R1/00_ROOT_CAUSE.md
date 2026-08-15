# BUILD 001-F7-R1 - Root cause

## Validated failure

F7 stored human descriptions for subject, control and boundary, but `evaluateClaim` selected receipts only by `buildId + specId + criterionId`. A PASS qualified when its declared level was numerically equal to or above the claim requirement.

Consequently, preserving three IDs while replacing the exercised semantics produced false proof:

- an unrelated E5 workflow proved E4 cross-tenant RLS;
- E4 Storage proved E4 RLS;
- an E3 PostgreSQL trigger proved E3 HTTP authentication;
- an unrelated E5 workflow proved E3 atomicity.

The pre-fix R1 reproducer executed these four cases. All four returned `PROVEN` and failed the required `NOT_PROVEN` assertions.

## Root cause

Evidence level was acting as a universal quality order. The schema could describe semantics, but descriptions were neither stable identifiers nor evaluator inputs. Criterion semantics also lacked a versioned immutable identity, so an old receipt could survive a control or boundary change under the same criterion ID.

## R1 scope

R1 fixes only deterministic semantic qualification for development assurance. It does not change product EvidenceReceipt, runtime product behavior, migrations, RLS, Storage, F3-F6, CI architecture or provenance artifact verification.
