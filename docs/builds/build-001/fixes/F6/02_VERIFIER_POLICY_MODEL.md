# Authoritative Verifier and Policy Model

## Authoritative sources

`src/application/outcome/specification/verification-definition.ts` is the sole source for the Precision Edit material definitions. The material objects are private module state. Public callers receive only a validated value snapshot from `precisionEditVerificationBinding()`.

## Material verifier definition

The definition binds verifier id `precision-edit-same-spec-verifier`, version `0.1.0`, methodology `creative-assertions-v0.1`, required assertions `EDIT_REGION_HAS_CHANGE`, `SOURCE_IMMUTABLE`, and `PROVENANCE_VALID`, and the rule that all required assertions pass.

## Material policy definition

The policy binds id `precision-edit-criterion-evidence-policy`, mapping version `precision-edit-criterion-evidence-v0.1`, preservation policy/evidence versions, the exact three criterion/type/issuer tuples, and the qualification rule requiring the exact criterion set and artifact bindings.

Display labels remain compatibility fields. They are not sufficient for qualification without both definition hashes.
