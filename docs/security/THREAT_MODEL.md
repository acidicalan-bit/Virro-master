# Threat Model — Universal Marketplace Spec-Anchored Foundation v0.2

## Scope

This model covers the internal modular monolith, Supabase/Postgres and private media boundary, model/provider adapters, Outcome Blueprint and Task Spec compilation, role-specific Spec Lenses, evidence verification, canonical commit authorization, and domain-only Universal Marketplace/mobile contracts. Public marketplace, seller onboarding, recommendation/ranking, payment rails, native clients, and arbitrary seller execution are outside the implemented scope; their proposed boundaries are documented because they affect architectural choices.

## Security objectives

1. Preserve confidentiality of credentials, private media, customer context, and private operator policy.
2. Preserve integrity and immutability of canonical state, Blueprint/Task Spec versions, evidence, and evaluation history.
3. Prevent capability/authority escalation through input, model output, seller content, or agent handoff.
4. Fail closed on critical unknowns, stale specs, stale heads, missing proof, and evidence/spec mismatch.
5. Retain provider/model/policy/provenance/cost facts without inventing unknown values.
6. Prevent Project/Canon inference, discovery relationships, trust signals, buyer metrics, and client metadata from becoming hidden authority or false fact.
7. Keep tenant, commerce, verification, high-risk approval, and delivery authority server-side across web/mobile clients.

## Trust boundaries and data flow

```text
untrusted browser/customer/seller/provider data
                    |
                    v
          Next.js server boundary
                    |
       validation + Spec Compiler
                    |
       immutable Task Spec + hash
          /          |          \
 image lens   preservation lens  verifier lens
          \          |          /
       result/evidence receipts
                    |
        Same-Spec + stale-head gate
                    |
      explicit acceptance / commit
                    |
      Supabase + private Storage
```

Supabase service-role and provider keys cross only server-side adapter boundaries. A future seller-artifact boundary is hostile and must be isolated from both. Future discovery/Canon and mobile/commerce boundaries accept attacker-controlled relationship, metric, session, deep-link, push, upload, payment-callback, and capability inputs; none confers authority by itself.

## Primary threat scenarios

| ID | Threat | Impact | Implemented controls | Residual risk / next control |
| --- | --- | --- | --- | --- |
| T-01 | Customer/seller prompt injection attempts to replace policy or request code/secrets. | Capability escalation, data exposure, unsafe action. | Strict schemas; prose treated as data; FIXED override denial; capability allow/deny; embedded-secret linter; bounded lenses. | Model/provider may still interpret hostile prose; integrate policy enforcement at every production adapter. |
| T-02 | Compiler hallucinates a critical fact or treats UNKNOWN as known. | Wrong task executed silently. | Explicit provenance; UNKNOWN carries no value; critical UNKNOWN blocks READY. | Current compiler is narrow/deterministic; future probabilistic compilers require calibrated extraction and human approval paths. |
| T-03 | Executor requests a forbidden capability or claims DONE. | Unauthorized side effects or false completion. | Lens authority subset; denied capabilities; DONE/EXECUTOR_ASSERTION cannot satisfy evidence. | Production orchestrator not yet wired to these contracts. |
| T-04 | Evidence is forged, replayed, or attached to another/stale Task Spec. | Invalid canonical commit. | Evidence/result bind Task Spec ID/hash; unknown/duplicate criteria rejected; stale spec/head checks; critical fail-closed gate. | Durable nonce/receipt signing and database uniqueness are not implemented for new spec records. |
| T-05 | Blueprint version is mutated after publication. | Customers and agents execute different terms under one identity. | Content hash; immutable in-memory version registry; previous-version hash chain. | Needs durable append-only storage, authorization, and publication signatures. |
| T-06 | Cross-role lens leaks private policy or enlarges authority. | Secret/policy disclosure or unsafe execution. | Role projections; private fields excluded; capability subset assertion. | Audit every future lens/schema field and adapter serialization. |
| T-07 | Service-role key or server route is compromised. | Broad row/storage read-write bypassing RLS. | Server-only environment boundaries; no client key exposure; documented least-privilege/RLS direction. | High blast radius remains; add auth ownership, scoped RPCs, key rotation, and negative tenant tests before public use. |
| T-08 | Malicious/oversized/polyglot upload exploits decoder or leaks through signed URL. | DoS, RCE in decoder, privacy breach. | MIME/size policy; private bucket; server-generated keys/hashes. | Add magic-byte verification, safe decode/re-encode, malware scanning, quotas, and isolated media processing. |
| T-09 | Provider response or logs expose secrets/private content. | Confidentiality breach. | Structured validation; no chain-of-thought storage; secret/log policy. | Add redaction tests, telemetry allowlist, retention/deletion policy, and provider data-processing review. |
| T-10 | Seller dependency/build artifact is malicious or compromised. | Code execution, credential theft, supply-chain compromise. | Seller code prohibited; documented future intake controls. | No sandbox exists; do not accept arbitrary seller artifacts until separately reviewed/implemented. |
| T-11 | Unknown cost is coerced to zero or evidence metadata is altered. | Incorrect economics and routing. | Nullable cost/provenance; unknown-is-not-zero invariant; hash-bound evaluation records. | Provider billing reconciliation is not implemented. |
| T-12 | Race advances canonical head after verification. | Stale overwrite or split state. | Current-head check in kernel and same-spec authorization proof. | Head movement and StateCommit still need a single database transaction/RPC. |
| T-13 | Cross-tenant Project/Canon disclosure or mutation. | Private context exposure; one tenant influences another's execution. | Domain records require tenant/owner identity; Canon provenance is explicit. | Authenticated ownership, tenant RLS, service-role minimization, and negative tenant tests are not implemented. |
| T-14 | Canon inference is promoted to approved fact. | Silent specification drift in future Outcomes. | `INFERRED` is distinct; `APPROVED` requires explicit actor/time metadata. | No persistence or approval workflow exists; every compiler use must revalidate provenance/version. |
| T-15 | Seller/client forges trust, ranking, acceptance, or buyer-value metrics. | Fraudulent discovery and misleading quality/economic claims. | Same-spec evidence model; accepted-purchase-only metric contract; trust language policy. | Public verifier profiles, append-only analytics, anti-fraud controls, and recomputation are not implemented. |
| T-16 | Lost/shared device, stolen session, replayed deep link, or sensitive push triggers/leaks action. | Account takeover, private-data exposure, unauthorized approval/delivery. | Client contracts carry immutable/idempotent refs and no secrets. | Session revocation, high-risk re-auth, signed expiring audience-bound links, replay defense, and private push are not implemented. |
| T-17 | Client forges `paid`, `verified`, tenant membership, evidence, or canonical state. | Unpaid delivery, cross-tenant access, proofless commit. | Strict client contracts reject extra authority fields; commit gate remains server-side. | Future checkout and every mutation must derive authority from trusted server/provider records. |
| T-18 | Mobile upload or delivery share is hostile, cross-tenant, or overbroad. | Parser compromise, private-media disclosure, persistent unauthorized access. | Narrow PNG size/type checks, private Storage, server-generated keys, expiring previews. | Magic-byte/re-encode pipeline, resumable ownership binding, malware isolation, scoped share/revocation tests are missing. |

## Abuse cases required in regression

- Missing critical input.
- Attempted FIXED-rule override.
- Prompt injection carried in customer data.
- Fake DONE without criterion evidence.
- Stale Task Spec and stale canonical base head.
- Forbidden capability request.
- Evidence carrying a different Task Spec hash.
- Critical verification result left UNKNOWN.
- Embedded provider/service credentials.
- Marketplace Project need marked complete without an accepted Outcome transaction.
- Canon inference silently promoted to approved.
- Seller/product configuration weakening platform invariants.
- Client-supplied payment or verification authority.
- Cross-tenant Project/Canon access, replayed deep-link mutation, and overbroad delivery URL when those surfaces are implemented.

## Security assumptions

- Server environment and deployment configuration protect secrets.
- Existing providers and Supabase are trusted infrastructure but their outputs/errors are untrusted data.
- The current application is operated as an internal lab with trusted operators; this does not substitute for user/tenant authorization.
- SHA-256 collision resistance is sufficient for current content addressing; hashes provide integrity binding, not signer identity.
- Mobile capability declarations, Project/Canon inferences, Product relationships, trust claims, and buyer metrics are untrusted descriptive data.

## Severity calibration

- **Critical:** remotely reachable theft of server/provider credentials; arbitrary seller code escaping into the control plane; unauthenticated cross-tenant canonical commit or payment/delivery authority at public scale.
- **High:** cross-tenant private media or Project/Canon access; forged verification that authorizes commit/delivery; reusable approval deep link; stale-write bypass; broad service-role exposure.
- **Medium:** bounded tenant data disclosure, metric/trust manipulation without canonical mutation, upload denial of service within limited scope, or private push metadata exposure.
- **Low:** information leakage limited to non-sensitive version/configuration data, missing defense-in-depth with no reachable authority boundary, or rate/availability degradation confined to the internal lab.

Current internal-only operation reduces exposure but does not remove reportability for plausible credential, canonical-integrity, or private-data paths. Hypothetical marketplace/mobile threats without an implemented reachable surface remain architectural risks rather than current vulnerabilities.

## Review triggers

Re-review this model before public users, auth/tenant RLS, durable Blueprint/Project/Canon publication, discovery/ranking/trust claims, new outcome compilers, additional providers, payments, mobile sessions, deep links, push, resumable uploads/jobs, delivery sharing, seller onboarding, executable seller artifacts, public APIs, semantic verifiers, or changes to canonical commit.

## Foundation 1.5 Phase A delta

Field Beta now has a server-side Auth-to-membership boundary: verified
Supabase claims produce an `AuthenticatedPrincipal`; only an active durable
membership for an active tenant produces `AuthorityContext`. Tenant locators,
emails, metadata and resource UUIDs do not grant access. The Phase A migration
uses `ON DELETE RESTRICT` for principal references so account deletion cannot
silently erase membership or evidence history. Full REAL_AUTH two-tenant,
Storage, recovery and active-lineage RLS proof is explicitly deferred to Phase
B; no public multi-tenant claim is made.

Repository: app-generativa-ia
Version: branch-codex/spec-anchored-platform-foundation-v0.1+universal-marketplace-v1.2-working-snapshot
