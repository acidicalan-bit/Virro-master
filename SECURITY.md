# Security Policy

## Scope and current posture

This repository is an internal Universal Digital Marketplace / Digital Outcomes laboratory. It processes natural-language instructions, media assets, provider responses, structured specifications, evidence, and human evaluation data. Provider-neutral marketplace, Project/Canon, buyer-metric, and mobile interaction schemas are policy/domain foundations only. It is not approved for public multi-tenant or commerce use. Marketplace UI, seller onboarding, recommendations, payments, native clients, arbitrary seller code, and a seller-code sandbox are not implemented.

Security reports should identify the affected route, schema, migration, provider adapter, object key, or commit path; include reproducible steps and impact; and omit real credentials or private customer media. Do not open a public issue containing secrets or exploitable customer data. Send a private report to the repository owner through the private channel associated with this repository. There is no guaranteed response SLA or bug-bounty program unless separately agreed.

A finding is reportable when repository evidence supports a plausible path from an attacker-controlled boundary to credential/private-data disclosure, authorization or tenant bypass, capability escalation, unsafe provider/seller execution, evidence forgery, immutable-history/canonical-state mutation, stale commit, or material denial of service. General hardening ideas, speculative model-quality concerns, and maintainability issues without a security impact are not security findings, but may remain documented risks.

## Assets and trust boundaries

Protected assets include Supabase service-role and provider credentials, private media, database rows, immutable asset/Blueprint/Task Spec histories, canonical asset heads, evidence receipts, human evaluations, execution cost/provenance, and future tenant-owned Project/Canon/product/relationship, purchase, trust, and delivery records. Trust boundaries exist at the browser or future mobile-client/server boundary, server/Supabase boundary, server/provider boundary, customer or future seller data/compiler boundary, role-specific agent lenses, evidence/commit gate, and future discovery/commerce/delivery boundaries.

All browser, customer, provider, uploaded-file, copied identifier, Blueprint author, Project/Canon inference, future seller, deep-link, push-registration, client-capability, payment-callback, relationship, metric, and trust-claim inputs are attacker-controlled. Model output and an executor's claim that work is DONE are untrusted until validated and independently evidenced.

## Mandatory invariants

- Secrets remain server-only, are never hardcoded, logged, returned to the browser, or embedded in Blueprint/Task Spec values.
- Supabase tables remain deny-by-default under RLS/grants. Service-role use is confined to server composition and receives no user-authentication safety credit.
- Before external multi-user use, every durable object needs authenticated ownership/tenant binding and negative cross-tenant tests.
- Canonical state changes only through explicit verified commit flow; candidates, model output, study acceptance, and executor assertions cannot mutate canon directly.
- Published Blueprint versions and READY Task Specs are immutable and content-hashed. New meaning requires a new version/hash.
- The Spec Compiler cannot grant capabilities absent from a Blueprint allowlist or present in its denylist.
- Critical `UNKNOWN` input or evidence fails closed. It cannot be promoted silently to READY, PASS, or fact.
- Result, evidence, verification, and commit authorization must reference the same current Task Spec ID/hash and current canonical base head.
- Project and Canon context is tenant-bound, versioned, provenance-aware, and cannot bypass an Outcome transaction or mutate canon directly. `INFERRED` cannot silently become `APPROVED`.
- Customer/seller prose is data, not system instruction. Prompt injection cannot override FIXED policy, capabilities, verifier criteria, or commit rules.
- “Verified” or equivalent trust claims require concrete checks and evidence appropriate to product class; clients, sellers, executors, rankings, and metrics cannot mint the status.
- Payment, tenant, evidence, canonical state, and commit authority remain server-side. Client-supplied `paid`, `verified`, ownership, or canonical-head claims are ignored or rejected.
- Uploaded media is size/type bounded, stored privately under server-generated keys, and should be decoded/re-encoded before any future broad exposure.
- Deep-link mutations must eventually be signed, scoped, expiring, audience-bound, replay-resistant, and reauthorized at use time. Push payloads must not contain private prompt/media, signed delivery URLs, or sensitive results.
- Lost/shared devices and stolen sessions require revocation, short-lived scoped credentials, minimized client storage, and reauthorization for high-risk approval before public mobile use.
- Unknown token/cost values remain null/unknown, never fabricated as zero.
- Private chain-of-thought is neither stored nor accepted as evidence.

## Provider credentials and logs

Use environment variables documented in `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or provider API keys through `NEXT_PUBLIC_*`, client components, errors, fixtures, screenshots, or telemetry. Logs may contain opaque IDs, versions, hashes, latency, nullable cost, and validation/error categories; they must not contain secrets, signed URLs, full private prompts/media, or private model reasoning.

## Future seller and supply-chain boundary

Seller-authored executable code is untrusted and prohibited in the current runtime. A future seller intake system must use curated review, immutable artifacts, provenance/signatures, dependency and secret scanning, isolated build and execution, no ambient credentials, deny-by-default egress/filesystem/capabilities, resource limits, audit logs, revocation, and staged promotion. Documentation of these controls does not mean the sandbox exists.

## Future marketplace, trust, and mobile boundary

Broader buyer classes do not weaken authorization. Future Product + Problem + Project discovery, Customer/Business Canon, Product relationships, rankings, trust badges, CrossCategoryRepeatRate, mobile events, and buyer-value estimates must be tenant-bound, provenance-aware, resistant to seller/self-dealing and replay/metric fraud, and explicit about whether evidence is curated, observed, inferred, or hypothetical.

The phone is a control surface and the cloud is the execution authority. A client capability profile is descriptive input, not authorization. Checkout completion, verification, delivery access, high-risk approval, and tenant membership must be derived from trusted server/provider evidence and checked again on every mutation.

## Known limitations

- No end-user authentication, tenant ownership model, or complete tenant-aware RLS exists.
- Privileged server repositories can bypass RLS; compromise has broad database/storage blast radius.
- Blueprint/Task Spec registries and the Same-Spec Gate are deterministic in-memory proofs, not yet durable production controls.
- Marketplace Project/Canon/product/relationship and mobile interaction contracts have no persistence, authorization service, analytics pipeline, or public API.
- No payment authority, signed deep-link service, device/session revocation, push privacy control, resumable upload/job API, or scoped delivery/share service exists.
- Canonical head movement and StateCommit creation are not yet a single database transaction.
- Signed URLs expire; object keys and hashes, not preview URLs, are durable identities.
- Pixel evidence does not prove semantic correctness or human usefulness.

## Security change governance

Every Build must include a `SECURITY DELTA` naming changed trust boundaries, data/capabilities, threats, mitigations, tests, and residual risk. Security-relevant diffs require threat-model review, secret/dependency checks, authorization regression tests, and explicit documentation of unresolved limitations before freeze.

## BUILD 005 internal field beta delta

BUILD 005 adds field-outcome, preservation-strategy, human-acceptance, evaluation, and curated-regression records. They are server-write-only, RLS-enabled, tenant-labelled, append-only records anchored to a Blueprint/Task Spec hash. The internal route is disabled unless `FIELD_BETA_INTERNAL_ENABLED=true`; it never authorizes canonical state mutation and does not expose service-role credentials. Provider cost remains nullable when unreported. The existing missing tenant-authentication model, privileged service-role blast radius, and non-atomic canonical head/StateCommit operation remain P0/P1 debt; this beta is not approved for public multi-tenant use.
