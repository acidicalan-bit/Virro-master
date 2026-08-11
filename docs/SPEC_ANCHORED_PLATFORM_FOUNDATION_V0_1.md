# Spec-Anchored Platform Foundation v0.1

## Outcome

This foundation generalizes the repository's control-plane contracts while preserving Precision Edit as the only execution proof. It does not build Marketplace UI, payments, seller onboarding, arbitrary seller-code execution, new providers, new preservation algorithms, or BUILD 006.

Implemented:

- strict provider-neutral Outcome Blueprint, Marketplace Product Contract, Task Spec, provenance, and cross-agent evaluation schemas;
- immutable content-hashed Blueprint/Task Spec version registries for deterministic proof/testing;
- narrow deterministic Precision Edit Spec Compiler with `FIXED`, `PARAMETERIZED`, and `CONDITIONAL` rules;
- role-specific `IMAGE_EXECUTOR`, `PRESERVATION_ENGINE`, and `VERIFIER` lenses over the same Task Spec ID/hash;
- Spec Linter for missing/contradictory criteria, fixed overrides, forbidden capabilities, secrets, invalid hashes, critical unknowns, and proofless commit policy;
- Same-Spec Gate with `PASS`, `FAIL`, `UNKNOWN`, and `NOT_APPLICABLE`; critical UNKNOWN fails closed; executor DONE is not evidence;
- cross-agent evaluation records and six mandatory adversarial fixtures;
- security policy, threat model, seller supply-chain boundary, standards map, and invention-disclosure registry.
- dependency hardening to Next.js 16.3.0 / `eslint-config-next` 16.3.0, resolving the audited high-severity transitive `sharp` and `postcss` advisories without adding a new framework.

## SPEC DELTA

### ADDS

- Universal Digital Outcomes Marketplace vision and Outcome SKU terminology.
- Outcome Blueprint, Marketplace Product Contract, Task Spec, Spec Compiler, Spec Lens, Spec Gate, cross-agent evaluation, and digital-good classes.
- Marketplace seller/commission as explicit hypotheses.
- Same-spec, critical-unknown, capability-subset, and seller-code invariants.

### CHANGES

- Precision Edit becomes the first narrow compiler proof for a generalized runtime rather than the universal product boundary.
- Blueprint design moves from purely planned to a current deterministic schema/registry proof.
- Provider execution abstraction now includes cross-agent spec and evidence ports.

### DEPRECATES

- Free-form agent-to-agent prose as sufficient execution authority.
- Treating an executor's DONE assertion as completion evidence.

### DOES NOT CHANGE

- Frozen BUILD 002–004 behavior and tags.
- One-provider-generation RAW/PRESERVED methodology.
- Human acceptance remains separate from machine verification.
- BUILD 005 remains incomplete and unfrozen.

### EXPERIMENTAL

- Marketplace demand, seller supply, commission economics, and cross-provider value are hypotheses.
- In-memory registries prove semantics only; they are not production persistence.

## SECURITY DELTA

### Assets

- Server/provider credentials, private media, canonical state, immutable Blueprint/Task Spec history, evidence, evaluation data, provenance, and nullable cost.

### Attacker inputs

- Browser/customer parameters, future seller-authored declarative content, uploaded-media metadata, provider/model output, executor results, and evidence claims.

### Trust boundaries

- Blueprint author/customer data enters a deterministic compiler.
- Agents receive bounded role lenses rather than full product/private policy.
- Result/evidence crosses a same-spec verification boundary.

### Privileges and secrets

- Capability grants are intersections of Blueprint authority, role authority, and runtime availability. Service-role/provider credentials remain server-only and never enter specs/lenses. Embedded secret-like values fail before a Task Spec can be produced.

### Dependencies

- Next.js and `eslint-config-next` move from 16.2.12 to 16.3.0 so production resolution uses patched `postcss`/`sharp`; no new framework or runtime service is added.

### Abuse cases

- FIXED override, capability escalation, prompt injection, embedded secrets, private-policy leakage, forged/mismatched/stale evidence, fake DONE, critical UNKNOWN, and stale-head commit.

### Controls

- strict schemas, deny policy, provenance, content hashes, immutable registries, deterministic linter/compiler, lens subsets, evidence-type allowlists, same-spec and stale-head gates, adversarial fixtures, root security policy, and threat model.
- runtime Task Spec hash revalidation, evidence issuer/verifier role checks, secret fail-fast without retaining the rejected value, locale-independent canonical ordering, and a production-dependency audit with no known vulnerabilities after the minimal Next.js update.

### Tests

- 32 focused foundation regressions plus the complete 198-test repository suite cover required Blueprint, compiler, provenance, lens, evidence, stale-state, prompt-injection, secret, preservation, PROJECT_SPEC, and immutability cases. Existing authz/RLS/RPC integrity tests remain in the full suite.

### Residual risk

- The proof is not wired into the production transaction service or durable Supabase records.
- Hashes bind content but do not identify a signer.
- Service-role blast radius and missing tenant ownership remain.
- No safe seller-code sandbox exists; seller executable artifacts remain prohibited.

## Cross-agent evaluation contract

Every evaluation stores executor/version/provider, Task Spec ID/hash, capabilities, result/evidence, violations, acceptance, latency, and nullable cost. Required fixtures are missing critical input, FIXED conflict, customer-data prompt injection, fake DONE, stale spec, and forbidden capability. Cross-provider performance is not claimed until real adapters execute identical specs and evidence is reviewed.

## Current limitations and handoff

Persist Blueprint/Task Spec version chains, add signer/attestation identity, wire Same-Spec authorization into the production commit path atomically, and add tenant ownership before external exposure. Any such Build must include SPEC DELTA and SECURITY DELTA and re-run the threat/security diff gates. Completion of this foundation does not authorize BUILD 006.
