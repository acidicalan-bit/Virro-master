# Complete Verifier Definition

The authoritative source remains `src/application/outcome/specification/verification-definition.ts`.

The material verifier now includes seven ordered assertion definitions, each with an ID, scope, semantic version, and deterministic semantic rule:

1. `SOURCE_IMMUTABLE`
2. `DIMENSIONS_MATCH`
3. `RAW_CANDIDATE_EXISTS`
4. `PRESERVED_CANDIDATE_EXISTS`
5. `PROVENANCE_VALID`
6. `LOCKED_OUTSIDE_EXACTLY_PRESERVED`
7. `EDIT_REGION_HAS_CHANGE`

It also binds methodology `creative-assertions-v0.1` and the `all-required-assertions-must-pass` rule. The policy definition remains separately bound to the three criterion mappings and preservation versions.

Newly issued records also carry the aggregate `machineVerificationStatus` alongside the seven executed assertion results; qualification requires the aggregate to agree with those results.

The four global-only assertions are not converted into business criteria. Their executed results are carried alongside the canonical verifier binding so qualification cannot ignore them.
