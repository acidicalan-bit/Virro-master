# Invention Disclosure Registry

Purpose: preserve dated internal descriptions of potentially differentiating system combinations. This is engineering provenance, not a legal conclusion about novelty, patentability, inventorship, ownership, or freedom to operate. Generic concepts such as version control, hashes, capability lists, schemas, and QA gates are established techniques; disclosures focus on integrated domain-specific combinations.

## ID-001 — Spec-anchored cross-agent outcome execution

- Recorded: 2026-08-11
- Status: internal disclosure; unvalidated defensibility hypothesis
- Contributors: project team; formal inventorship review not performed
- Problem: specialized probabilistic/deterministic agents can drift when they reconstruct requirements from prose or pass free-form summaries.
- Combination: immutable provider-neutral Outcome Blueprint; deterministic compilation into one versioned/hash-addressed Task Spec; role-specific least-authority lenses that retain the same spec identity/hash; result and criterion evidence bound to that hash; fail-closed Same-Spec Gate composed with canonical stale-head and explicit acceptance controls.
- Technical effect: reduces silent cross-agent requirement drift and blocks evidence generated for another or modified specification from authorizing canonical state.
- Control/data flow: Blueprint + customer/source facts → Spec Compiler → Task Spec ID/hash → bounded role lenses → result/evidence with issuer and criterion identity → Same-Spec/stale-head/acceptance gate → commit authorization.
- Likely prior art: typed workflow definitions, capability systems, content-addressed artifacts, event sourcing, Git-style versioning, policy-as-code, signed build provenance, and evidence-based CI gates. Novelty is not established.
- Public-disclosure status: described in this internal repository work product as of the recorded date; repository visibility and external public disclosure have not been legally investigated.
- Trade-secret alternative: retain compiler policies, role projections, acceptance/evidence datasets, failure corpus, and provider-specific performance calibration as confidential operational know-how.
- Current reduction to practice: Precision Edit deterministic compiler/lenses/gate and regression tests in this repository.
- Limitations: in-memory proof only; no production orchestration or durable signing.

## ID-002 — Declarative Outcome SKU with executable policy classes

- Recorded: 2026-08-11
- Status: internal disclosure; marketplace value unvalidated
- Problem: a marketplace listing can describe benefits while leaving execution authority, evidence, and version semantics ambiguous.
- Combination: bind an Outcome SKU/product contract to one immutable Blueprint version/hash containing FIXED, PARAMETERIZED, and CONDITIONAL inputs; deliverable; capability policy; security profile; quality criteria; budget; provenance; and evidence/verification policy. Changes create a new version chain rather than silently altering sold behavior.
- Technical effect: makes the sold digital outcome reproducible and auditable while preventing silent mutation of fixed terms or execution authority.
- Control/data flow: curated seller declaration → normalized Blueprint → lint/security/conformance review → immutable version/hash → Marketplace Product Contract/SKU binding → transaction Task Spec compilation.
- Likely prior art: package manifests, API schemas, infrastructure-as-code, digital product catalogs, workflow templates, smart-contract versioning, policy bundles, and software attestations. Novelty is not established.
- Public-disclosure status: described in this internal repository work product as of the recorded date; repository visibility and external public disclosure have not been legally investigated.
- Trade-secret alternative: keep Blueprint authoring heuristics, conformance fixtures, pricing/commission data, ranking signals, and review thresholds confidential.
- Current reduction to practice: schemas, publisher, version-chain registry, deterministic Precision Edit Blueprint.
- Limitations: no store, publication workflow, commercial transaction, or seller system.

## ID-003 — Preservation-aware same-spec verification

- Recorded: 2026-08-11
- Status: internal disclosure; builds on frozen BUILD 004 evidence
- Problem: generated creative edits may preserve exact pixels yet fail human perception, or may look useful while violating hard state guarantees; independent agents may evaluate different implicit tasks.
- Combination: topology/preservation policy expressed as Task Spec variables and bounded preservation lens; deterministic evidence for measurable constraints; human acceptance as a distinct criterion; all evidence references the same spec hash and current base version; critical UNKNOWN and stale evidence block commit.
- Technical effect: permits exact technical preservation and human usefulness to coexist as separate proof dimensions while preventing either from silently substituting for the other.
- Control/data flow: source/version + ROI/topology → Task Spec → provider RAW candidate + deterministic preservation derivative → pixel/provenance evidence + independent human judgment → same-spec gate → explicit canonical commit.
- Likely prior art: image masks/compositing, regression testing, perceptual QA, version control, human-in-the-loop review, and policy-based workflow gates. Novelty is not established.
- Public-disclosure status: BUILD 004 and this internal repository work product contain the current description; repository visibility and external public disclosure have not been legally investigated.
- Trade-secret alternative: retain topology policy, coupled-band heuristics, pixel↔human divergence corpus, verifier thresholds, and accepted-result economics as confidential know-how/data.
- Current reduction to practice: frozen preservation engine plus new Blueprint/Task Spec/gate proof; not yet integrated end-to-end.

## Registry procedure

Add a new append-only entry when a Build introduces a materially new technical combination. Link source/tests/evidence, distinguish conception from reduction to practice, name contributors subject to later review, and preserve superseded disclosures rather than rewriting history.
