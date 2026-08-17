# Binding Design

## Binding fields

Each newly issued criterion-evidence record carries:

- `verifierId`, `verifierDefinitionHash`
- `policyId`, `policyDefinitionHash`
- the existing display-compatible `name`, `version`, and `policyVersion`

Hashes are SHA-256 over recursively canonicalized JSON: object keys are sorted, array order is preserved, and non-finite values are rejected.

## Persistence and enforcement

The binding is stored in the existing `verification_criterion_evidence.verifier` JSONB column and mirrored in `verification_runs.details.verificationDefinition`. The existing insert-only immutability trigger remains the database write boundary. Qualification recomputes the authoritative binding and compares every identity/version/hash field exactly; caller-supplied details or callbacks are not trusted.

No migration was required because the existing JSONB column and insert-only trigger already enforce durable storage and immutability.
