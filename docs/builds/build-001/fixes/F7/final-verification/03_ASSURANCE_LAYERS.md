# Assurance Layers

R1 semantic admissibility and R2 provenance integrity remain separate gates.

R1 checks subject, control, boundary, environment, evidence level, criterion
version/hash, accepted provenance class, artifact requirements and structural
independence. R2 verifies authoritative local issuance, exact command
definition, source revision and clean tree, observed result, artifact bytes,
receipt integrity and replay/staleness conditions. R2.2 keeps the authority
capability private behind the runner context identity.

The composition checks demonstrated:

- valid provenance for the wrong subject/control/boundary/version does not
  bypass semantic qualification;
- semantically exact data without authoritative issuance does not bypass
  provenance qualification;
- structurally independent verifier status is not inferred from provenance,
  and valid provenance does not repair an independence failure;
- E3 evidence and provenance class are not collapsed into an E4 claim;
- several insufficient receipts cannot be aggregated into sufficient proof.

No cryptographic signature, remote service, production credential, or E4
claim was introduced or used by this verification.
