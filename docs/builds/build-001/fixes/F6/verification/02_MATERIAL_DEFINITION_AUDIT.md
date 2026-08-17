# Material Definition Audit

## Authoritative sources

`verification-definition.ts` owns private material objects and returns a newly parsed binding snapshot. Caller labels are compatibility metadata; qualification compares the server-selected binding fields and hashes.

## Verifier coverage

The fingerprint includes methodology `creative-assertions-v0.1`, three named assertions, and an all-required-pass rule. This is **insufficient** for the repository verifier: `creative-assertions.ts` marks seven assertions as required and the global status checks every required assertion. `DIMENSIONS_MATCH`, `RAW_CANDIDATE_EXISTS`, `PRESERVED_CANDIDATE_EXISTS`, and `LOCKED_OUTSIDE_EXACTLY_PRESERVED` are material status inputs but are absent from the F6 material definition.

This omission is the decisive F6 failure. A change to one of those four assertion implementations can alter PASS/FAIL without changing the verifier fingerprint.

## Policy coverage

The policy fingerprint includes the three criterion/type/issuer tuples, preservation versions, and exact-set qualification rule. It covers the current criterion derivation path, but cannot repair the verifier coverage gap above.
