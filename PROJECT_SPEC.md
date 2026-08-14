# Marketplace Digital Universal / Universal Digital Marketplace — Project Master

**PROJECT SPEC VERSION:** 1.4.0

**Date:** 2026-08-11

**Status:** [CURRENT]

**Authority:** `PROJECT_SPEC.md` is the current project orientation and architecture authority.

## 00. Document governance / how to use this spec

This is the canonical living project specification. It states current intended system truth and labels unvalidated product theses, experiments, plans, and deferrals explicitly. It is not a historical design document.

Detailed Build documents remain authoritative evidence for their frozen versions. If current code and this specification disagree, do not silently mutate either: raise `SPEC_CODE_DRIFT`, identify the discrepancy, and resolve it using this precedence:

1. frozen or currently validated architecture;
2. executable code and tests;
3. latest approved Build or experiment contract.

Knowledge labels used here are: `[FROZEN]`, `[CURRENT]`, `[VALIDATED]`, `[HYPOTHESIS]`, `[EXPERIMENT]`, `[PLANNED]`, `[DEFERRED]`, `[DEPRECATED]`, and `[REJECTED]`.

### AI-agent context loading rule

For a development task, read only:

1. `PROJECT_SPEC.md`;
2. the active Build or experiment contract;
3. detailed documents explicitly referenced by those files;
4. relevant implementation and tests.

Do not load every historical Build by default. Load historical documents only when the task depends on their evidence or frozen behavior.

### Drift rule

Any PR or Build that changes architecture, domain semantics, product guarantees, business model, or major behavior must either update this file or state `SPEC IMPACT: NONE`. No complex CI enforcement is required yet.

### Spec delta protocol

Every future Build contract must include a `SPEC DELTA` with `ADDS`, `CHANGES`, `DEPRECATES`, `DOES NOT CHANGE`, and `EXPERIMENTAL`. Before freezing the Build, reconcile this specification against the actual implementation and evidence.

## 01. Project identity

The Universal Digital Marketplace is a product thesis and execution architecture for turning human goals into finished, verifiable, stateful digital Outcomes. The current repository is an internal modular-monolith laboratory covering Intent Lab, the Outcome Transaction Kernel, Precision Edit, Preservation & Verification, human evaluation, and a narrow Spec-Anchored domain proof.

- Canonical product category: [CURRENT] **Marketplace Digital Universal**; English internal: **Universal Digital Marketplace**.
- Product thesis: [HYPOTHESIS] **Convertimos el trabajo digital en algo que simplemente puedes pedir.**
- Commercial thesis: [HYPOTHESIS] **The customer is buying back time, attention and execution risk.**
- Current product form: [CURRENT] internal web laboratory.
- Initial market direction: [CURRENT] B2C first.
- Repository application identity: [CURRENT] `intent-lab` v0.1.1; this name is narrower than the current project scope.

## 02. Problem

People express goals with incomplete, colloquial, contextual language. Probabilistic executors can misinterpret intent, broaden scope, overwrite accepted state, or produce plausible results without proof. Chat history alone is not reliable canonical state, and a first generated candidate is not automatically a completed outcome.

For creative editing, a local request commonly implies preservation of everything not authorized to change. Text-only prompting does not enforce that boundary. Conversely, exact pixel preservation can reduce useful perceptual quality. The runtime must separate intent, authorization, execution, evidence, machine verification, human acceptance, and commit.

## 03. Vision and category

[CURRENT] The category name is **Marketplace Digital Universal / Universal Digital Marketplace**. [HYPOTHESIS] Its defensible value is a marketplace of finished digital products/Outcomes powered by a provider-neutral Outcome Execution Runtime. The marketplace unit is an Outcome SKU backed by an immutable, versioned Outcome Blueprint; the runtime compiles each purchase/request into one hash-addressed Task Spec, gives each agent a bounded lens over that same spec, verifies same-spec evidence, and commits or delivers only authorized results. Marketplace demand, seller supply, buyer preference, cross-category effects, and commission economics remain unvalidated hypotheses.

Canonical positioning:

- Commercial: **Compra lo que necesitas hecho.**
- Architecture: **Cada producto tiene una fórmula versionada. Cada pedido genera una especificación. Cada entrega debe demostrar que cumple esa especificación.**
- Competitive: **No te vendemos una herramienta para que hagas el trabajo. Te vendemos el trabajo digital terminado.**

Accuracy guardrail: do not claim every generic AI requires a subscription, that experts cannot build these products, that generic AI always fails, or that every marketplace Outcome is superior.

The long-term protocol is:

```text
Intent → State → Authorized Delta → Execute → Verify → Human Grounding → Commit
```

It does not assume one giant model. Structured state, deterministic controls, small classifiers, provider execution, and human review may have different cost and reliability profiles.

## 04. Product value proposition

- [CURRENT] Represent likely human intent as a structured, validated contract.
- [VALIDATED] Preserve canonical history independently of model context.
- [VALIDATED] Prevent execution candidates from mutating canonical state directly.
- [VALIDATED] Require evidence and verification before commit.
- [EXPERIMENT] Determine when preservation by construction improves human acceptance.
- [HYPOTHESIS] Let consumers buy an outcome without learning model selection or prompt engineering.
- [HYPOTHESIS] Let experts and companies buy back scarce execution time even when they could build the result themselves.
- [HYPOTHESIS] Reduce buyer integration effort and residual execution risk through specialized, versioned production formulas and concrete evidence.
- [PLANNED] Improve accepted-result economics using routing, policy, evaluation, and regression data.

## 05. Product model

### Outcome

[CURRENT] A user-valued result with an explicit objective, constraints, evidence, acceptance condition, provenance, and canonical state transition. It is the intended consumer unit; it is not synonymous with one model response.

### Outcome Contract

[CURRENT] A machine-consumable agreement describing objective, expectations, context, requirements, preservation constraints, prohibited actions, authorized assumptions, high-impact ambiguities, acceptance tests, and definition of done. Intent Lab currently emits an Execution Contract; full commercial Outcome Contract semantics remain [PLANNED].

### Outcome SKU, Blueprint, and Marketplace Product Contract

- [CURRENT] An `OutcomeBlueprint` is the provider-neutral product/execution definition: identity, version chain, hash, SKU, variable policy (`FIXED`, `PARAMETERIZED`, `CONDITIONAL`), deliverable, capabilities, security, quality, budget, and verification requirements. Published versions are immutable in the current domain proof.
- [CURRENT] A `TaskSpec` is the versioned, hash-addressed transaction instruction compiled from one Blueprint plus customer/source facts. A READY spec is immutable and includes provenance, capabilities, criteria, security, and verifier policy.
- [CURRENT] A `MarketplaceProductContract` schema binds a future listing to an exact Blueprint version/hash and optional commission rate. It is a contract type only; no catalog, listing UI, payment, seller onboarding, or publication service exists.
- [PLANNED] An Outcome SKU is the customer-facing unit that a curated store may offer after value, ownership, and economics are validated.

### Project, Customer/Business Canon, and discovery

- [CURRENT] The validated kernel `Project` is the execution workspace referenced by assets and transactions.
- [CURRENT] A provider-neutral `MarketplaceProject` schema is a non-executing planning projection that references the kernel Project, belongs to a tenant/customer or organization, and can mark a need complete only through an accepted Outcome transaction.
- [CURRENT] A `CustomerBusinessCanon` schema preserves `CUSTOMER_STATED`, `INFERRED`, and explicitly `APPROVED` provenance. It is domain-only and not persisted.
- [PLANNED] Discovery combines Product + Problem + Project. A future Digital Solution Graph may model versioned curated/observed/hypothetical relationships without making a graph database an architectural requirement.
- [HYPOTHESIS] Controlled serendipity and cross-category discovery can help buyers find useful Outcomes outside their specialty.

### Bundle

[PLANNED] A packaged group of related Outcomes, assets, policies, and delivery expectations. No Bundle runtime exists.

### Mission

[DEFERRED] A durable, multi-outcome objective that coordinates work across time while preserving canonical state and evidence. No Mission orchestration exists.

## 06. Business model

All commercial mechanics below are product decisions or hypotheses, not implemented billing behavior.

- Outcome Pricing: [HYPOTHESIS] price the completed outcome rather than raw tokens or model calls.
- PAYG: [CURRENT] intended default for occasional B2C use; [NOT IMPLEMENTED] in code.
- Wallet: [PLANNED] prepaid balance or credits with transparent outcome debits.
- Creator Pass: [PLANNED] subscription-like access for frequent creators without making subscription the only entry point.
- Curated Outcome Store: [PLANNED] precedes an open marketplace.
- Marketplace/API: [DEFERRED] until outcome quality, ownership, economics, and trust are demonstrated.
- Seller/commission model: [HYPOTHESIS] curated third parties may publish reviewed Blueprint versions and receive a disclosed commission. No seller account, settlement, payout, or commission calculation exists.

### Buyer economics

[HYPOTHESIS] Buyers compare `GENERATE`, `BUILD`, and `BUY OUTCOME`. The internal Outcome Advantage equation is:

```text
Outcome Price + Buyer Integration Effort + Residual Risk
vs
DIY Tool Cost + Buyer Time Cost + Expected Rework + Opportunity Cost + Residual Risk
```

The DIY AI Tax may include tool access, learning, specification, iteration, QA, rework, orchestration, and opportunity cost. It has no canonical numeric value. Developers buy back engineering time; designers production/iteration time; editors repetitive execution/technical QA; automation specialists commodity integration time; companies time-to-outcome and delivery risk; non-technical buyers receive a result without acquiring tool expertise.

This is a research/economics model, not a public guarantee. Value-based pricing must remain accessible, disclose the unit being purchased, and be tested against acceptance, effort, integration, and residual risk.

## 07. Non-negotiable principles

1. Natural language first; users do not need prompt-engineering vocabulary.
2. Meaning depends on text, context, domain, and available state.
3. Ask only when expected information value exceeds the cost of interruption.
4. Safe assumptions must be low-impact, reversible, and explicit; provisional is not canonical.
5. Local mutation preserves unmentioned state by default.
6. Canonical state is structured, versioned, and independent of LLM context.
7. Provider output is a candidate, not canonical truth.
8. No proof, no commit.
9. Machine verification and human acceptance are separate claims.
10. Pixel preservation is not semantic correctness.
11. Unknown cost is not zero.
12. Hypotheses and experimental observations must not be reported as validated product guarantees.
13. The Spec Compiler cannot enlarge a Blueprint's capability authority.
14. Critical UNKNOWN input or verification state cannot be represented as READY/PASS.
15. Executor results and verifier evidence must bind to the same Task Spec ID and hash.
16. Seller-authored executable code is untrusted and is not accepted or run by the current platform.
17. A Project or Canon record cannot bypass the normal Outcome transaction, evidence, acceptance, and commit path.
18. “Verified” requires concrete criterion-level evidence; no client, seller, or executor may mint verification status.
19. Mobile and desktop clients are control surfaces, never sources of payment, tenant, evidence, or canonical authority.

## 08. Canonical system architecture

[CURRENT] Modular monolith:

```text
Next.js UI / Route Handlers
        ↓
Application services and use cases
        ↓
Domain schemas, policies, state machines, scoring
        ↓
Provider/repository/storage ports
        ↓
OpenAI, Supabase Postgres/Storage, deterministic local engines
```

The domain must not depend on Next.js, Supabase, or proprietary provider SDKs. UI components call internal HTTP boundaries and do not access Supabase directly. Repositories own persistence mapping; adapters own provider communication.

[CURRENT] The generalized execution proof implements the narrow center of this provider-neutral target architecture:

```text
Outcome SKU → Outcome Blueprint → Spec Compiler → Task Spec → Spec Lenses → Governed Runtime → Evidence → Spec Gate → Commit/Delivery
```

The proof is intentionally narrow and compiles only the existing Precision Edit outcome. `Governed Runtime` means provider execution is bounded by capabilities and cannot mutate canon directly. `Delivery` is a scoped artifact action after authorization; it is not a second commit path. This work does not replace the runtime, add providers, or authorize BUILD 006.

## 09. Domain model

[CURRENT] Principal implemented entities:

- `IntentContract`, pragmatic signals, benchmark cases and evaluations;
- `Project`, `Asset`, immutable `AssetVersion`;
- `OutcomeTransaction`, `PartialIntent`, `SemanticPatch`, `MutationLease`;
- `ExecutionRun`, `EvidenceReceipt`, `VerificationRun`, `StateCommit`, `CostRecord`;
- media storage, semantic snapshots, image evidence, candidate assets;
- preservation policies, runs, evidence, preferences;
- preservation study cases, locked human intent, blind presentation, ratings, pairwise preference, acceptance;
- provider-neutral `OutcomeBlueprint`, `MarketplaceProductContract`, `TaskSpec`, provenance, Spec Lens, same-spec evaluation, and cross-agent evaluation contracts;
- universal marketplace category/product foundation, buyer audiences, problem/outcome tags, delivery modes, planning Project/Outcome needs, Product relationships, Customer/Business Canon, and deterministic CrossCategoryRepeatRate contracts;
- provider-neutral mobile interaction contracts for Intent input, Outcome configuration, job status, review, delivery, and client capabilities;
- [PLANNED][ACTIVE] field-beta strategies, outcomes, feedback, samples, golden cases, regression candidates.

Core distinctions:

- mutable asset identity versus immutable asset versions;
- requested intent versus authorized mutation;
- raw provider candidate versus deterministic derivative;
- evidence versus interpretation;
- machine verification versus human acceptance;
- experimental acceptance versus canonical commit.

## 10. Outcome Execution Runtime

[VALIDATED] The kernel lifecycle is:

```text
DRAFT → PREPARED → READY → EXECUTING → VERIFYING → VERIFIED → COMMITTED
                   ↓          ↓          ↓
                   ABORTED     FAILED ↔ REPAIRING
```

Commit requires a verified transaction, required evidence, authorized patch, current base head, no prior commit, and creation of a new immutable version. Rollback creates another version with provenance; it does not delete history.

[CURRENT LIMITATION] The application service coordinates multiple persistence writes. BUILD 004 explicitly records that canonical head movement and StateCommit creation are not yet one PostgreSQL RPC transaction.

[CURRENT] The foundation Same-Spec Gate rejects mismatched/stale Task Specs, unsupported or executor-only evidence, unauthorized capabilities, critical `UNKNOWN`, and stale canonical heads. Field Beta now projects Machine Same-Spec separately from Human Acceptance using the additive `verification_criterion_evidence` child model. PASS requires exact-set durable criterion receipts bound to tenant, transaction, execution, verification, Task Spec ID/hash, artifacts, and verifier/version/policy; aggregate status, hashes, and legacy `same_spec_status` cannot substitute. Historical BUILD 005-B evidence is unchanged and remains v1.4 Machine Same-Spec INCOMPLETE without retroactive receipts. The generic canonical commit path remains outside this beta and is not claimed as production-wired.

## 11. Human grounding / intent handling

[CURRENT] Intent Lab accepts natural language plus optional context and produces a Zod-validated, versioned `IntentContract`. It separates explicit facts, implicit expectations, safe assumptions, provisional decisions, ambiguities, clarification requirements, prohibited questions/actions, preservation constraints, interaction mode, creative freedom, confidence, and next action.

[CURRENT] Supported interaction modes are `ASSUME`, `SHOW_OPTIONS`, `ASK`, `EXECUTE`, and `EXPLORE`. Human Pragmatics extracts contextual signals without treating slang as a universal dictionary. A provider-neutral `IntentModel` boundary supports a frozen heuristic baseline and an OpenAI structured-output adapter.

[CURRENT] Blind evaluation locks human meaning before revealing candidates. [NOT VALIDATED] There is not yet enough labeled evidence to claim broad human-intent accuracy.

## 12. Transaction / canonical state

[VALIDATED] Canonical state lives in immutable `AssetVersion` records and a single asset head, not solely in model messages. Transactions carry the base version. A stale transaction cannot advance an asset whose head changed after preparation. Provider executions create candidates and evidence only. Explicit approval plus verification creates a new version and commit record.

## 13. Mutation Lease / preservation

[CURRENT] A `MutationLease` assigns attribute-path authority such as mutable, coupled, preserve, or hard lock. Partial intent avoids inventing unspecified desired state.

[FROZEN] BUILD 004 geometric preservation defines `CORE`, `COUPLED`, and `LOCKED_OUTSIDE`. `PRESERVED` retains RAW pixels in CORE, feathered source/RAW pixels in COUPLED, and byte-exact source pixels in LOCKED_OUTSIDE. This is preservation by construction, not a semantic dependency graph.

[HYPOTHESIS] Edit topology (`LOCAL_INDEPENDENT`, `LOCAL_COUPLED`, `STRUCTURAL`, `GLOBAL`) should determine preservation strength. BUILD 005 is intended to test a versioned P0–P3 preservation ladder; its initial mapping is not learned or validated.

## 14. Verification / Evidence / No Proof No Commit

[VALIDATED] Evidence receipts and verification runs are distinct from execution. BUILD 004 emits required Creative Assertions for source immutability, dimensions, candidate existence, provenance, exact locked-outside preservation, and technical change inside CORE.

`EDIT_REGION_HAS_CHANGE` proves only thresholded pixel change. It does not prove that the requested object, identity, text, style, or aesthetic was correct. Human approval cannot bypass a failed hard-preservation invariant. Human study acceptance never performs a canonical commit.

## 15. Hallucination containment

- [CURRENT] Strict Zod validation rejects malformed structured model output.
- [CURRENT] One bounded repair attempt is permitted for invalid Intent output; corrupt contracts are not silently persisted as valid.
- [CURRENT] Explicit facts, assumptions, ambiguities, prohibited actions, and preservation constraints are separate fields.
- [VALIDATED] Executors cannot directly change canonical state.
- [CURRENT] Deterministic evidence and database constraints enforce claims that can be measured exactly.
- [PLANNED] Semantic/perceptual verification for claims that pixel metrics cannot establish.
- [REJECTED] Treating private chain-of-thought as product state or proof.

## 16. Provider execution abstraction

[CURRENT] `IntentModel`, `ExecutorPort`, and `ImageEditExecutor` are provider-neutral application ports. OpenAI adapters implement real Intent compilation and image editing; deterministic fake adapters support tests. UI, persistence contracts, and canonical transaction semantics do not depend directly on OpenAI SDK types.

[FROZEN] BUILD 004 uses one provider generation to create RAW and derives PRESERVED locally. Comparison methodology must not regenerate one side. [PLANNED] Provider routing is deferred until outcome data supports it.

[CURRENT] `SpecCompilerPort` and `CrossAgentExecutorPort` define provider-neutral boundaries. `IMAGE_EXECUTOR`, `PRESERVATION_ENGINE`, and `VERIFIER` receive projections of one Task Spec ID/hash with role-bounded fields and capabilities; private operator policy is excluded from executor lenses.

## 17. Learning / evaluation / regression architecture

[CURRENT] Deterministic benchmarks score declared concepts, forbidden questions, assumptions, and interaction mode. Missing semantic evidence is marked for manual review.

[CURRENT][EXPERIMENT] Blind Intent evaluation and Preservation Value Study persist randomized identity, isolated ratings, pairwise preference, corrections, and independent acceptance. Feedback changes session/context data, not deployed model weights in real time.

[PLANNED] Aggregate accepted/rejected outcomes offline to improve small parsers, verifiers, routing, and preservation policy. Golden/regression case support is active BUILD 005 work, not a current guarantee.

## 18. Outcome Store / marketplace

[PLANNED] Start with a curated Outcome Store where each listing defines input requirements, exact Blueprint version/hash, provider/policy compatibility, quality evidence, price, seller provenance, and commission terms. Discovery is Product + Problem + Project, not product-only. Digital-good classes currently modeled are Outcome Blueprint, Outcome Bundle, Verification Profile, and Creative Preset; the marketplace foundation also distinguishes finished Outcomes, bundles, verification services, and digital deliverables.

[CURRENT] Minimal domain contracts version the canonical category, audience, outcome category, tags, delivery mode, Project needs, Canon provenance, platform invariants, and product relationships. [HYPOTHESIS] A Digital Solution Graph and controlled serendipity may improve relevance and cross-skill discovery. No graph database, recommendation engine, catalog persistence, ranking, public listing UI, marketplace payouts, or network effect is implemented.

## 19. Creator Blueprint system

[CURRENT] The Blueprint schema packages typed variables, constraints, deliverable, capability allow/deny policy, security profile, quality criteria, budget, evidence, and verification policy. Published versions are content-hashed and append-only in the in-memory proof registry. [PLANNED] Durable publication, curated review, creator tooling, signing/attestation, and payout. No seller code execution or payout system is implemented.

## 20. API / interoperability

[CURRENT] Internal Next.js route handlers expose compilation, feedback, Execution Contracts, benchmarks, blind evaluation, Precision Edit, and Preservation Study. Domain ports are the primary interoperability boundary.

[PLANNED] A public API may expose Outcome Contracts, transaction status, evidence, provenance, and delivery artifacts. It must preserve authorization, idempotency, versioning, and ownership. Direct database access is not the public API.

[CURRENT] Provider-neutral client contracts include idempotency keys, immutable Blueprint/TaskSpec/base-version references, media/file references, review decisions, delivery actions, and capability profiles. They define future API shape only. A client cannot set `paid`, `verified`, evidence, tenant, canonical head, or commit state.

## 21. Web / mobile product direction

[CURRENT] Responsive internal web labs exist. Mobile is a **first-class product surface** and an architecture requirement, while native apps remain unimplemented and unauthorized. The distinction is mobile-first experience versus native-first implementation.

The operating model is `phone = control surface / cloud = factory`: canonical state, execution, credentials, evidence, payment authority, and commit remain server-side. [PLANNED] M0 is responsive mobile-first web over the same domain/API contracts. [DEFERRED] M1 PWA features require measurable value; M2 native iOS/Android requires a separate approved Build.

Mobile UX law: a normal Outcome should be discoverable and requestable with minimal typing and no provider/model selection; approved Project/Canon context may reduce input; interrupted jobs, review, correction, delivery, and scoped sharing must work from a compact client. [HYPOTHESIS] The Situational Execution Gap creates demand when a buyer has intent or urgency but lacks the time, attention, environment, or specialized tools to execute.

## 22. Persistence / database / storage

[CURRENT] Supabase Postgres is the configured source of truth. SQL migrations are versioned under `supabase/migrations`; repositories isolate Supabase from domain and UI. Supabase Storage has a private `media` bucket for immutable source/candidate objects, addressed by server-generated keys and content hashes.

[CURRENT] In-memory repositories and storage exist only for development and deterministic tests. Production is expected to fail explicitly when required Supabase configuration is absent.

[CURRENT LIMITATION] Signed preview URLs expire; object keys and SHA-256 hashes are durable identities. PNG support is bounded to the decoder formats documented by BUILD 004.

## 23. Security / ownership / RLS

[CURRENT] Tables use RLS, public roles are revoked where migrations specify, and privileged reads/writes occur in server-only repositories using `SUPABASE_SERVICE_ROLE_KEY`. Service-role credentials and OpenAI keys must never enter browser bundles or logs. No user authentication or tenant ownership model exists; this is an internal lab.

[CURRENT][VALIDATED] Preservation Study intent/presentation locking uses a server-only RPC that preserves append-only table privileges without requiring `UPDATE`. Supabase access has a bounded retry only for the exact transient error `JWT issued at future`. Study transaction IDs are trimmed and strictly validated as UUIDs at UI, HTTP, and application boundaries with a human-readable error.

[PLANNED] Before multi-user exposure: authenticated ownership fields, tenant-aware RLS policies, least-privilege server functions, and explicit access tests.

[CURRENT] Root `SECURITY.md`, repository threat model, seller supply-chain policy, and standards mapping define the intended security boundary. Customer/seller text is data, never authority. Blueprint capabilities are deny-by-default, embedded secrets are rejected, verifier evidence is bound to the same Task Spec hash, and critical unknowns fail closed. Future seller code is treated as untrusted and would require isolated intake, static/dynamic analysis, signed immutable artifacts, scoped credentials, egress denial, and explicit promotion; none of that runtime exists today.

[PLANNED] Marketplace/mobile exposure additionally requires tenant-bound Project/Canon/product data, session/device revocation, server-authoritative payment and verification, signed/expiring/replay-resistant deep links, private push content, upload ownership, scoped delivery URLs, fraud-resistant trust metrics, and high-risk approval authorization. These are requirements, not claims of implementation.

## 24. Observability / provenance

[CURRENT] Intent runs capture compiler/schema versions, provider/model, latency, structured output, and token usage when reported. Media execution retains transaction, source version, execution, provider/model, policy/methodology, candidate hashes, evidence, verification, preference, acceptance, and commit lineage.

Do not log secrets or private model reasoning. Unknown tokens/cost remain unknown. Model/provider versions and deployed policies must be retained so results are reconstructable.

[CURRENT] Cross-agent evaluation records executor/provider versions, Task Spec ID/hash, requested capabilities, result/evidence, violations, acceptance, latency, and nullable cost. `OBSERVED`, `CUSTOMER_STATED`, `INFERRED`, `APPROVED`, and `UNKNOWN` provenance are preserved; a critical UNKNOWN never becomes fact silently.

## 25. Monetization / economics

[NOT IMPLEMENTED] There is no billing, checkout, wallet, subscription, payout, or marketplace runtime.

[HYPOTHESIS] The relevant unit economics are cost per accepted outcome, acceptance lift, repair/regeneration cost, latency to acceptance, and gross margin per Outcome—not cost per raw generation alone. Pricing must disclose the outcome unit and avoid implying unknown provider cost is zero.

[HYPOTHESIS] Buyer economics must also compare BuyerEffortToAcceptedOutcome, EstimatedBuyerTimeSaved, RemainingIntegrationEffort, BuyReason, and the AlternativePath the buyer would otherwise choose. No value or time-saved number may be fabricated.

## 26. Metrics / North Stars

Proposed North Stars are [HYPOTHESIS] until field volume establishes usefulness:

- accepted outcomes per active user;
- first-pass human acceptance rate;
- cost per accepted outcome;
- median time to accepted outcome;
- human correction rate;
- verified commit success without stale/provenance violations.

Supporting metrics include Intent/context accuracy under labeled evaluation, question precision, implicit-constraint accuracy, preservation acceptance lift, RAW/PRESERVED preference, failure tags, provider latency, token usage, and reliable cost coverage. Do not invent semantic accuracy or scientific confidence.

`CrossCategoryRepeatRate` is the share of consecutive accepted-purchase transitions by the same buyer, within a declared measurement window, whose Outcome category differs. It records category versions and a transition matrix. Same-category repeat, clicks, views, abandoned configuration, and unaccepted purchases do not count. No success threshold exists yet.

Future buyer/mobile instrumentation includes BuyerEffortToAcceptedOutcome, EstimatedBuyerTimeSaved, RemainingIntegrationEffort, BuyReason, AlternativePath, listing/configuration/checkout events, accepted order, correction, delivery, repeat, cross-category repeat, and urgent selection. Collection must minimize sensitive device/customer data.

## 27. Current Reality

### IMPLEMENTED

| Capability | Status | Repository evidence |
| --- | --- | --- |
| Intent Lab and versioned Intent Contract | [CURRENT] | `src/domain/intent-contract.ts`, application services, `/` |
| Human pragmatics and Execution Contract | [CURRENT] | `src/domain/human-pragmatics.ts`, `src/domain/execution-contract.ts` |
| Deterministic benchmark and blind human evaluation | [CURRENT] | `src/domain/benchmark.ts`, `src/application/blind-evaluation-service.ts`, `/blind-eval` |
| Outcome Transaction Kernel | [FROZEN][VALIDATED] | tag `outcome-transaction-kernel-v0.1.0`, kernel tests |
| Precision Edit with real OpenAI image adapter | [FROZEN] | tags `precision-edit-v0.1.0` and `precision-edit-v0.1.1` |
| Supabase Postgres repositories and private Storage | [CURRENT] | migrations, Supabase adapters, server composition |
| Pixel diff and zone metrics | [FROZEN][VALIDATED] for deterministic calculation | BUILD 003.2/004 tests and evidence calculator |
| Preservation by Construction | [FROZEN][VALIDATED] for exact locked-outside pixels | tag `preservation-verification-v0.1.0` |
| Immutable RAW/PRESERVED candidate model | [FROZEN] | BUILD 004 persistence and provenance |
| Creative Assertions and machine verification | [FROZEN] | BUILD 004 service/tests |
| Explicit human preference/approval | [FROZEN] | BUILD 004; preference separate from commit |
| Blind Preservation Value Study harness | [CURRENT][EXPERIMENT] | commit `d4c1ae5`, `/preservation-study` |
| RLS/RPC, transient JWT, and UUID integrity corrections | [CURRENT][VALIDATED] | migrations `20260811183000`/`20260811190000`, retry/route tests |
| One recorded pixel↔human divergence case | [VALIDATED] as an observation | `.build-004-final-report.json` |
| Spec-anchored platform foundation | [CURRENT][VALIDATED] as deterministic proof | `src/domain/outcome/specification`, `src/application/outcome/specification`, foundation tests |
| Universal marketplace domain foundation | [CURRENT] as schemas/definitions only | `src/domain/marketplace`, marketplace foundation tests |
| Mobile interaction contracts | [CURRENT] as provider-neutral schemas only | `src/domain/marketplace/mobile-contracts.ts` |
| Production dependency security gate | [CURRENT] | Next.js/ESLint config 16.3.0; `pnpm audit --prod` reports no known vulnerabilities at foundation handoff |

### NOT IMPLEMENTED

- [NOT IMPLEMENTED] Payments, PAYG charging, wallet, Creator Pass, subscriptions, or billing.
- [NOT IMPLEMENTED] Outcome Store, public marketplace, recommendations engine, Creator Studio, seller payments/payouts, or Blueprint tooling.
- No marketplace UI, public product catalog, listing publication workflow, seller onboarding, commission settlement, graph database, or arbitrary seller-code sandbox is implemented.
- [NOT IMPLEMENTED] Supabase persistence or production runtime wiring for Blueprint/Task Spec registries and the Same-Spec Gate; current registries are deterministic in-memory proofs.
- [NOT IMPLEMENTED] Marketplace Project/Canon/product/relationship persistence or buyer/mobile analytics.
- [NOT IMPLEMENTED] Native iOS/Android applications, production PWA, mobile checkout, push delivery, or device/session management.
- [NOT IMPLEMENTED] Video/audio generation, persistent characters, teams, or social features.
- [NOT IMPLEMENTED] Advanced semantic/perceptual image verification, segmentation, identity embeddings as hard generation constraints, or automatic band optimization.
- [NOT IMPLEMENTED] Multi-provider router, distributed orchestration, queues, vector database, or microservices.
- [NOT IMPLEMENTED] End-user authentication, ownership, or tenant RLS.
- [NOT IMPLEMENTED] Complete BUILD 005 field beta, validated preservation ladder, or 30-case Product Gate decision.

### SPEC_CODE_DRIFT

1. The repository package identity remains `intent-lab@0.1.1`, narrower than implemented scope through Product Gate 004 and the domain foundations. Renaming it is outside this reconciliation.
2. BUILD 002's historical “no image generation integration” limitation was true at freeze and is superseded by Precision Edit. It is not current behavior and must remain historical evidence.
3. The validated kernel `Project` is an execution workspace, while the marketplace proposal uses Project as a buyer planning/discovery primitive. The code preserves the kernel entity and adds an explicitly separate `MarketplaceProject` projection rather than silently changing validated transaction semantics.
### Resolved drift

- [CURRENT] Unknown execution/evidence cost is nullable end-to-end. Migration `20260811190000_preserve_unknown_execution_cost.sql` converts only historical zeroes whose execution metadata explicitly has `costReported: false`; unmarked zeroes are preserved rather than guessed. A numeric `0` now means a reported zero.
- [CURRENT] The Preservation Study RPC no longer depends on `UPDATE` privilege, transient future-issued JWT errors use a bounded exact-match retry, and copied transaction IDs are normalized and UUID-validated at all input boundaries.
- [CURRENT] The category is now named Marketplace Digital Universal / Universal Digital Marketplace without claiming marketplace implementation.
- [CURRENT] Mobile is now a first-class product surface while native implementation remains separately deferred and unauthorized.

### SPEC DELTA — Universal Marketplace reconciliation v1.3.0

**ADDS:** canonical category; finished-Outcome positioning; Generate/Build/Buy Outcome economics; DIY AI Tax and Outcome Advantage hypotheses; Product + Problem + Project discovery; MarketplaceProject and Customer/Business Canon contracts; Digital Solution Graph hypothesis; CrossCategoryRepeatRate; controlled serendipity; buyer-persona value; mobile-first surface, M0/M1/M2, mobile contracts/metrics/security baseline.

**CHANGES:** marketplace framing becomes the explicit Universal Digital Marketplace category; discovery becomes Product + Problem + Project; competitive framing becomes a finished-result alternative; Mobile changes from a deferred client concept to first-class product surface while native remains deferred.

**DEPRECATES:** product-only discovery as the complete marketplace model; framing the buyer only as someone who lacks AI skill.

**DOES NOT CHANGE:** No Proof No Commit; Outcome Transaction Kernel; canonical state rules; provider-neutral boundaries; tenant/RLS requirements; Blueprint/Task Spec/Spec Gate direction; frozen tags; Precision Edit evidence; narrow validation strategy.

**EXPERIMENTAL:** cross-agent portability; Digital Solution Graph; controlled serendipity; cross-category flywheel; trust/ranking effects; buyer time/effort advantage; mobile conversion; urgent Outcome demand; native retention.

## 28. Frozen Builds

Hashes are dereferenced commit hashes verified from repository tags.

| Build | Status | Tag | Commit |
| --- | --- | --- | --- |
| Intent Lab heuristic baseline / BUILD 001 history | [FROZEN] | `intent-lab-heuristic-baseline-v0.1.0` | `1d3353c340fbded158047c680f00204671bc4838` |
| Outcome Transaction Kernel / BUILD 002–002.1 | [FROZEN] | `outcome-transaction-kernel-v0.1.0` | `b82b395cde85cc881a7d64c80ff3bf4a90db5d48` |
| Precision Edit / BUILD 003.1 | [FROZEN] | `precision-edit-v0.1.0` | `de979e004b63fa1dcd00e0ef1806075e1db8f233` |
| Precision Edit pixel diff / BUILD 003.2 | [FROZEN] | `precision-edit-v0.1.1` | `1c61ec272db48e575dc8bdd502c973b24b0403a1` |
| Preservation & Verification / BUILD 004 | [FROZEN] | `preservation-verification-v0.1.0` | `f622ea1e46e900b60ff3127e59b0de909a677059` |

Product Gate 004 is implemented at commit `d4c1ae5` but has no verified frozen tag and remains `[EXPERIMENT]`.

## 29. Active Build / Experiment

- Preservation Value Study: [EXPERIMENT][ACTIVE]. Harness and 30-case plan exist; the required 30 completed evaluations and Product Gate decision do not.
- BUILD 005-B Precision Edit Field Beta + Preservation Ladder: [VALIDATED][CURRENT internal]. Field-ready evidence includes durable real-provider records, fresh-context recovery, Supabase persistence, and an internal human acceptance YES. It remains internal/controlled, is not a public marketplace, and does not authorize canonical commit, commerce, or BUILD 006.
- Spec-Anchored Platform Foundation v0.1: [CURRENT][ACTIVE until frozen]. It generalizes contracts and same-spec controls while using Precision Edit as the only deterministic compiler proof. It does not activate a marketplace or supersede BUILD 005 evidence collection.

No BUILD 006 is authorized by completion of these activities.

## 30. Roadmap

1. [ACTIVE] Finish and validate Product Gate 004 evidence collection.
2. [ACTIVE] Complete BUILD 005 within its contract; freeze only after tests, migrations, field flow, docs, and spec reconciliation.
3. [PLANNED] Use real acceptance/failure data to decide whether the preservation ladder has strong, conditional, no, or negative signal.
4. [PLANNED] Prioritize perceptual/semantic verification only where observed divergence justifies its cost.
5. [PLANNED] Validate consumer Outcome configuration and responsive mobile-first M0 without starting marketplace commerce.
6. [DEFERRED] Monetization, public marketplace, creator economics, PWA/native clients, and provider routing until outcome value and unit economics are evidenced.

## 31. Hypothesis Registry

| ID | Statement | Status | Evidence | Validation method | Decision impact |
| --- | --- | --- | --- | --- | --- |
| H-001 | Consumers prefer buying an Outcome to learning AI tools. | [HYPOTHESIS] | None in repository. | B2C conversion/retention study against tool-oriented flow. | Product positioning and UX. |
| H-002 | PAYG/outcome pricing improves conversion for occasional users. | [HYPOTHESIS] | None; no billing exists. | Controlled pricing experiment with real payment intent. | Default monetization. |
| H-003 | The Runtime improves accepted-result economics. | [HYPOTHESIS] | Technical controls exist; no field cohort. | Compare cost/time/attempts per accepted result. | Runtime investment and pricing. |
| H-004 | Preservation requirements differ by edit topology. | [HYPOTHESIS] | One divergence case; 30-case plan incomplete. | Stratified human acceptance by topology and strategy. | Preservation ladder policy. |
| H-005 | Deterministic HARD preservation reduces unauthorized pixel change. | [VALIDATED] for locked-outside pixels only. | E-002/E-003 and deterministic tests. | Re-run byte/pixel invariants across fixtures. | Keep P3 as a technical option. |
| H-006 | Marketplace creators can package expertise as Outcome Blueprints. | [HYPOTHESIS] | No product evidence. | Curated creator pilot with acceptance/economics. | Store/marketplace roadmap. |
| H-007 | Acceptance/failure data can improve routing and policy. | [HYPOTHESIS] | Evaluation schemas exist; insufficient field volume. | Offline policy evaluation and held-out regression. | Learning architecture. |
| H-008 | A perceptual layer adds value where pixel and human judgment diverge. | [HYPOTHESIS] | E-004 demonstrates divergence, not solution value. | Compare deterministic-only vs gated perceptual verification. | BUILD 006+ scope decision. |
| H-009 | Curated Blueprint sellers can create valuable supply and sustain disclosed commission economics. | [HYPOTHESIS] | No seller or commercial evidence. | Curated pilot after runtime/security readiness. | Marketplace sequencing and commission model. |
| H-010 | Same-spec, bounded-agent contracts reduce cross-agent drift and false completion claims. | [HYPOTHESIS] with deterministic control proof. | Contract/gate tests cover structural failures only. | Cross-provider replay plus human/evidence audit. | Runtime orchestration design. |
| H-011 | Buyers pay to recover time, attention, and execution risk even when they possess the skill to build. | [HYPOTHESIS] | Buyer-economics model only. | Compare Generate/Build/Buy paths using accepted outcomes and measured effort. | Positioning and pricing. |
| H-012 | Cross-skill breadth creates useful cross-category repeat. | [HYPOTHESIS] | Metric contract only; no purchase data. | Accepted-purchase cohorts with category-version transition matrix. | Horizontal category breadth. |
| H-013 | Product + Problem + Project discovery improves relevance without hiding provenance. | [HYPOTHESIS] | Domain/documentation only. | Discovery experiment with task success and false-trust review. | Discovery architecture. |
| H-014 | Mobile closes a Situational Execution Gap for urgent or constrained buyers. | [HYPOTHESIS] | Responsive labs are not product evidence. | M0 funnel, effort, interruption recovery, and accepted Outcome analysis. | Mobile sequencing. |
| H-015 | Native capabilities improve retention beyond responsive web/PWA. | [HYPOTHESIS] | No native client exists. | Compare only after M0/M1 value is evidenced. | M2 authorization. |

## 32. Decision Registry

| ID | Decision | Status | Date/version | Reason | Alternatives rejected | Revisit trigger |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | B2C first. | [CURRENT] | 2026-08-11 / spec 1.0.0 | Validate direct human outcome value. | Enterprise-first, API-first. | B2C evidence is negative or enterprise pull is material. |
| D-002 | Outcome, not model, is the consumer unit. | [CURRENT] | spec 1.0.0 | Users care about completed goals. | Model/tool catalog as primary UX. | Users consistently demand direct model control. |
| D-003 | PAYG is the intended default. | [CURRENT][HYPOTHESIS] | spec 1.0.0 | Reduce commitment for occasional use. | Subscription-only. | Pricing evidence contradicts H-002. |
| D-004 | Curated store before open marketplace. | [PLANNED] | spec 1.0.0 | Control quality and provenance early. | Immediate open marketplace. | Curation blocks supply after quality is proven. |
| D-005 | Modular monolith initially. | [CURRENT][VALIDATED] | BUILD 001 onward | Minimum operational complexity and clear boundaries. | Microservices/distributed orchestration. | Scale or team boundaries create measured need. |
| D-006 | Supabase for initial data and object storage. | [CURRENT] | BUILD 001/003 | Reproducible Postgres, RLS, private Storage. | Custom infrastructure, distributed stores. | Reliability, portability, or cost evidence demands change. |
| D-007 | Domain and execution contracts remain provider-neutral. | [CURRENT][VALIDATED] | BUILD 001 onward | Avoid rewriting product semantics per provider. | Direct SDK coupling in UI/domain. | Port abstraction demonstrably blocks required capability. |
| D-008 | One canonical state source with immutable history. | [CURRENT][VALIDATED] | BUILD 002 | Prevent context drift and destructive overwrite. | Chat transcript or provider state as canon. | No planned revisit. |
| D-009 | No foundation-model training yet. | [CURRENT] | spec 1.0.0 | System/evaluation work precedes costly weight training. | Per-user live fine-tuning. | Sufficient labeled data and measurable model bottleneck. |
| D-010 | One provider generation for RAW/PRESERVED comparisons. | [FROZEN] | BUILD 004 | Preserve a valid experimental control. | Regenerate PRESERVED independently. | A different experiment explicitly replaces the methodology. |
| D-011 | Human acceptance remains separate from machine verification. | [CURRENT][VALIDATED] | BUILD 002/004 | Technical proof does not establish usefulness. | Automatic acceptance from pixel metrics. | No planned revisit; mechanisms may evolve. |
| D-012 | One immutable Task Spec hash anchors executor, preservation, verifier, and commit evidence. | [CURRENT] | spec 1.1.0 | Prevent cross-agent drift and stale/fabricated proof. | Free-form agent handoffs. | Evidence shows unacceptable rigidity. |
| D-013 | Seller-authored executable code is untrusted and prohibited in the current runtime. | [CURRENT] | spec 1.1.0 | Limit supply-chain and credential blast radius. | Direct seller plugin execution. | A reviewed sandbox design passes security gates. |
| D-014 | Canonical category is Marketplace Digital Universal / Universal Digital Marketplace. | [CURRENT] | spec 1.2.0 | Name the horizontal finished-digital-Outcome category explicitly. | Generic model/tool marketplace framing. | Only by an approved category decision. |
| D-015 | Product value is buying back time, attention, and execution risk. | [CURRENT][HYPOTHESIS] | spec 1.2.0 | Applies to experts, companies, and non-technical buyers without demeaning DIY. | Skill-gap-only positioning. | Buyer evidence contradicts the model. |
| D-016 | Mobile is first-class, but M0 is responsive web and native needs a separate Build. | [CURRENT] | spec 1.2.0 | Preserve shared server/domain authority and validate value before platform duplication. | Native-first implementation. | M0/M1 evidence proves native-only value. |

## 33. Evidence Ledger

| ID | Observation | Interpretation | Does not prove | Source |
| --- | --- | --- | --- | --- |
| E-001 | BUILD 003.2 added real pixel-level diff metrics and observed broad provider pixel change beyond a requested local region. | Prompt-only locality can be weak and warrants measurement. | Semantic drift proportional to changed pixels; general provider failure rate. | commits `8705ed2`, `1c61ec2`; Precision Edit tests/smoke |
| E-002 | In the BUILD 004 real case, RAW changed-pixel ratio in LOCKED_OUTSIDE was `0.7485844849`. | The provider output differed broadly at the configured pixel threshold. | That 74.86% of objects/meaning changed or RAW looked worse. | `.build-004-final-report.json`; BUILD 004 doc |
| E-003 | The corresponding PRESERVED candidate had LOCKED_OUTSIDE changed-pixel ratio `0`, with exact channel preservation assertions passing. | Preservation by Construction enforced its hard pixel invariant for the case. | Semantic correctness, natural boundaries, or requested-edit success. | `.build-004-final-report.json`; tag `preservation-verification-v0.1.0` |
| E-004 | Human preference was `TIE` despite the large RAW↔PRESERVED pixel difference; PRESERVED was explicitly accepted and committed. | Pixel improvement and human preference can diverge; approval and preference are distinct. | That preservation has no value, always has value, or a perceptual model will solve the gap. | `.build-004-final-report.json`, tag `PIXEL_HUMAN_PERCEPTION_DIVERGENCE` |

## 34. Technical debt

- Make canonical head movement and StateCommit creation a single database-enforced atomic operation.
- Complete authenticated ownership and tenant RLS before external multi-user exposure.
- Bring scoped architecture/limitations docs up to date while retaining their historical authority.
- Version-control the full active BUILD 005 contract; do not rely only on an external instruction artifact.
- Establish policy/golden-case immutability and replay evidence before claiming field learning.
- Add semantic/perceptual verification only after measurable failure clusters justify it.
- Persist Blueprint/Task Spec version chains and Same-Spec Gate evidence before claiming production durability.
- Integrate same-spec commit authorization into the existing transaction service without weakening stale-head protection.
- Persist tenant-owned MarketplaceProject/Canon versions and approval history only after auth/RLS design is approved.
- Add a client-independent resumable job resource, idempotency records, and scoped delivery records before M0 commerce.
- Define trust-claim evidence profiles and anti-fraud review before public discovery/ranking.

## 35. Risks

- Intent compilation can move ambiguity into a less visible layer and create silent errors.
- Exact preservation may create seams, cut shadows/geometry, or suppress necessary coupled change.
- Pixel metrics can be mistaken for semantic quality.
- Small human studies can be overinterpreted as scientific validation.
- Privileged service-role architecture is unsafe for public multi-tenant use without ownership RLS.
- Expiring URLs or missing provenance can make evidence irreproducible.
- Provider/model changes can invalidate unversioned comparisons.
- Outcome pricing can hide unfavorable cost tails if acceptance and repair costs are not measured.
- Premature marketplace, routing, or distributed infrastructure can obscure the core value test.
- Blueprint confusion, capability escalation, forged/stale evidence, prompt injection, and future seller supply-chain compromise can turn a specification layer into a hidden authority-escalation path.
- Project/Canon inference can become a silent cross-tenant or stale-context authority source if ownership, provenance, and approval are not enforced.
- Mobile sessions, deep links, push payloads, uploads, and client-supplied commerce state create new spoofing/privacy risks before public exposure.
- Buyer-value and time-saved estimates can become misleading marketing if treated as measured facts without accepted-outcome evidence.

## 36. IP / defensibility strategy

[HYPOTHESIS] Defensibility is not any individual pattern—state versioning, deltas, verification, and priority rules are established engineering. Potential defensibility lies in the integrated Outcome protocol, domain-specific state/Mutation Lease schemas, accepted-result evidence, topology-aware preservation/routing policy, regression corpus, Blueprint packaging, and reliable economics across providers.

Protect by maintaining versioned contracts, provenance, evaluation methodology, policy history, proprietary outcome-quality data, and dated invention disclosures. Do not claim exclusivity over generic software-engineering concepts. The disclosure registry is evidence of internal conception, not a patentability or freedom-to-operate opinion.

## 37. Deferred / rejected ideas

- [DEFERRED] Open marketplace, payouts, public API, native iOS/Android, production PWA, video/audio, persistent characters, model router, complex auth, teams/social, subscriptions, wallet, vector/graph search, semantic AI verification, segmentation, identity constraints, and automatic band optimization.
- [REJECTED] Kubernetes, Kafka, Redis, Temporal, microservices, or external queues without measured need.
- [REJECTED] Raw provider output directly mutating canonical state.
- [REJECTED] Treating every assumption as permanent state.
- [REJECTED] Asking the human every missing detail.
- [REJECTED] Claiming pixel metrics are semantic correctness.
- [REJECTED] Live per-click model-weight updates as the feedback mechanism.
- [DEFERRED] Arbitrary seller code intake/execution until a separately reviewed isolated sandbox and supply-chain control plane exists.

## 38. Change Log

Append new entries; do not rewrite historical entries.

| Date | Spec version | Build/decision | Summary | Affected sections |
| --- | --- | --- | --- | --- |
| 2026-08-11 | 1.0.0 | Project governance initialization | Created canonical spec from code, tests, docs, tags, active work, and approved product direction. Registered current reality, invariants, hypotheses, decisions, evidence, drift, and spec-delta governance. | 00–39 |
| 2026-08-11 | 1.1.0 | Spec-Anchored Platform Foundation v0.1 | Added provider-neutral Blueprint/Task Spec contracts, deterministic Precision Edit compiler, role lenses, Same-Spec Gate, cross-agent records, security/supply-chain governance, and explicit marketplace limitations. | 03–39, invariants |
| 2026-08-11 | 1.2.0 | Universal Marketplace + Buyer Value + Mobile-First reconciliation | Closed canonical category/name, buyer value thesis, Product/Problem/Project discovery, Project/Canon/metric/mobile domain contracts, mobile-first M0 boundary, and corresponding security model without expanding runtime scope. | 01–39, invariants |
| 2026-08-11 | 1.3.0 | Pre-merge Project Master version alignment | Aligned the Project Master and reconciliation delta version with the incorporated Mobile-first v1.3 material. This is a provenance-only correction with no architecture, runtime, schema, or validated-behavior change. | Document metadata, Change Log |
| 2026-08-13 | 1.4.0 | Project Governance & Architecture Reconciliation | Separated machine verification, machine Same-Spec conformance, human acceptance, outcome acceptance, and canonical commit eligibility; reconciled demonstrated recovery/testing/security/API/documentation doctrine without expanding marketplace scope. | Status semantics, architecture, security, testing, governance |

## 39. Documentation index

- [`README.md`](./README.md) — current local setup, environment, routes, and validation commands.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — [CURRENT] modular-monolith boundaries, historical Intent flow, target spec architecture, and client authority boundary.
- [`docs/CURRENT_STATE.md`](./docs/CURRENT_STATE.md) — [VOLATILE] last verified repository/evidence snapshot; reverify before mutation.
- [`docs/governance/CANON_OWNERSHIP_MAP.md`](./docs/governance/CANON_OWNERSHIP_MAP.md) — [CURRENT] source-of-truth ownership and stale-document actions.
- [`docs/governance/STATUS_SEMANTICS_CURRENT_MODEL.md`](./docs/governance/STATUS_SEMANTICS_CURRENT_MODEL.md) — [CURRENT] status semantics and matrix.
- [`docs/governance/API_GOVERNANCE.md`](./docs/governance/API_GOVERNANCE.md) — [CURRENT] internal API baseline and pre-public design gate.
- [`docs/governance/TESTING_GOVERNANCE.md`](./docs/governance/TESTING_GOVERNANCE.md) — [CURRENT] boundary/recovery testing doctrine.
- [`docs/architecture/UNIVERSAL_MARKETPLACE_MODEL.md`](./docs/architecture/UNIVERSAL_MARKETPLACE_MODEL.md) — [CURRENT] universal target architecture and narrow implementation boundary.
- [`docs/product/UNIVERSAL_MARKETPLACE_POSITIONING.md`](./docs/product/UNIVERSAL_MARKETPLACE_POSITIONING.md) — [CURRENT] category, positioning, discovery, trust language, and messaging guardrails.
- [`docs/product/BUY_VS_BUILD_VS_GENERATE.md`](./docs/product/BUY_VS_BUILD_VS_GENERATE.md) — [CURRENT] buyer economics and future measurement definitions.
- [`docs/product/MOBILE_FIRST_PRODUCT_SURFACE.md`](./docs/product/MOBILE_FIRST_PRODUCT_SURFACE.md) — [CURRENT] mobile-first decision, architecture audit, M0/M1/M2, security, and instrumentation plan.
- [`docs/BUILD_002_OUTCOME_TRANSACTION_KERNEL.md`](./docs/BUILD_002_OUTCOME_TRANSACTION_KERNEL.md) — [HISTORICAL][FROZEN] kernel architecture and its Build 002 quality evidence.
- [`docs/BUILD_004_PRESERVATION_VERIFICATION_V0_1.md`](./docs/BUILD_004_PRESERVATION_VERIFICATION_V0_1.md) — [HISTORICAL][FROZEN] BUILD 004 policy, algorithm, evidence, and commit invariants.
- [`docs/PRODUCT_GATE_004_PRESERVATION_VALUE_STUDY_V0_1.md`](./docs/PRODUCT_GATE_004_PRESERVATION_VALUE_STUDY_V0_1.md) — [CURRENT][EXPERIMENT] blind study protocol, metrics, and limitations.
- [`docs/BLIND_EVALUATION_FORMAT.md`](./docs/BLIND_EVALUATION_FORMAT.md) — blind Intent evaluation import contract.
- [`docs/BLIND_EVAL_DATA_RENDERING_AUDIT.md`](./docs/BLIND_EVAL_DATA_RENDERING_AUDIT.md) — [HISTORICAL] rendering/data-isolation audit evidence.
- [`docs/LIMITATIONS.md`](./docs/LIMITATIONS.md) — [HISTORICAL][SCOPED] Build 001.1 limitations; not the complete current-project limitation register.
- [`docs/SPEC_ANCHORED_PLATFORM_FOUNDATION_V0_1.md`](./docs/SPEC_ANCHORED_PLATFORM_FOUNDATION_V0_1.md) — [CURRENT] implementation boundary, SPEC DELTA, SECURITY DELTA, and handoff.
- [`SECURITY.md`](./SECURITY.md) and [`docs/security/`](./docs/security/) — [CURRENT] disclosure policy, threat model, seller supply chain, and standards mapping.
- [`docs/ip/INVENTION_DISCLOSURES.md`](./docs/ip/INVENTION_DISCLOSURES.md) — [CURRENT] dated internal invention-disclosure registry.
- `supabase/migrations/` — [CURRENT] reproducible database schema, constraints, grants, RLS, and RPC history.
- `tests/` — [CURRENT] executable evidence for implemented behavior; passing tests do not by themselves validate commercial hypotheses.

## Architectural Invariant Registry

| ID | Invariant | Status | Enforcement/evidence |
| --- | --- | --- | --- |
| INV-001 | NO PROOF, NO COMMIT. | [VALIDATED] | Kernel service/state machine/tests. |
| INV-002 | Canonical state cannot live solely in LLM context. | [VALIDATED] | Asset/immutable AssetVersion/head model. |
| INV-003 | Historical canonical versions are immutable. | [VALIDATED] | Append-only version/rollback semantics. |
| INV-004 | A probabilistic executor cannot directly mutate canonical state. | [VALIDATED] | Candidate/evidence then verified commit. |
| INV-005 | A stale transaction cannot overwrite the current head. | [VALIDATED] | Base-version check and stale-write tests. |
| INV-006 | Machine verification is not human acceptance. | [VALIDATED] | Separate records/actions in BUILD 004 and study. |
| INV-007 | Unknown cost is not zero. | [CURRENT] | Nullable execution/evidence/candidate fields; no CostRecord when unknown; explicit historical backfill criteria. |
| INV-008 | Deployed/versioned policy behavior is immutable. | [CURRENT] | Frozen BUILD 004 policy; BUILD 005 must persist policy definition/version. |
| INV-009 | RAW experimental control is preserved when comparison methodology requires it. | [VALIDATED] | One provider execution; immutable candidates. |
| INV-010 | Experimental acceptance cannot silently create canonical state. | [VALIDATED] | Preservation Study never invokes approval/commit. |
| INV-011 | Human intent must be locked before blind output disclosure. | [VALIDATED] for harness integrity | Atomic intent/presentation flow and tests. |
| INV-012 | Blind candidate identity and order remain stable on resume. | [VALIDATED] for harness integrity | Persisted presentation mapping. |
| INV-013 | HARD locked-outside preservation is byte-exact or verification fails. | [VALIDATED] for deterministic engine | Creative Assertion and pixel tests. |
| INV-014 | Hypotheses and descriptive metrics cannot be presented as semantic/scientific validation. | [CURRENT] | Manual-review labels and gate docs. |
| INV-015 | A Spec Compiler cannot grant a capability absent from the Blueprint allowlist or present in its denylist. | [VALIDATED] for deterministic proof | Compiler/linter tests. |
| INV-016 | Critical UNKNOWN input or verification status blocks READY/commit. | [VALIDATED] for deterministic proof | Task Spec schema and Same-Spec Gate tests. |
| INV-017 | Result, evidence, verification, and commit authorization bind to the same current Task Spec ID/hash. | [VALIDATED] for deterministic proof | Same-Spec Gate and stale-spec/head tests. |
| INV-018 | Seller/customer content is data, not executable authority; seller code is untrusted. | [CURRENT] | Blueprint security profile, linter, SECURITY/threat model; no seller runtime exists. |
| INV-019 | Project/Canon planning context cannot bypass Outcome transaction, evidence, acceptance, or canonical commit. | [CURRENT] as domain proof | MarketplaceProject completion validation and Canon provenance tests. |
| INV-020 | “Verified” cannot be minted by a client, seller, or executor without criterion-level evidence. | [CURRENT] | Strict client contracts plus Same-Spec Gate; public trust UI not implemented. |
| INV-021 | Client surface does not own payment, tenant, evidence, or canonical authority. | [CURRENT] as contract rule | Strict mobile/client schemas; production auth/payment controls remain planned. |
