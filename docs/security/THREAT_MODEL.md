# Threat Model — Spec-Anchored Platform Foundation v0.1

## Scope

This model covers the internal modular monolith, Supabase/Postgres and private media boundary, model/provider adapters, Outcome Blueprint and Task Spec compilation, role-specific Spec Lenses, evidence verification, and canonical commit authorization. Public marketplace, seller onboarding, payment rails, and arbitrary seller execution are outside the implemented scope; their proposed boundary is documented because it affects architectural choices.

## Security objectives

1. Preserve confidentiality of credentials, private media, customer context, and private operator policy.
2. Preserve integrity and immutability of canonical state, Blueprint/Task Spec versions, evidence, and evaluation history.
3. Prevent capability/authority escalation through input, model output, seller content, or agent handoff.
4. Fail closed on critical unknowns, stale specs, stale heads, missing proof, and evidence/spec mismatch.
5. Retain provider/model/policy/provenance/cost facts without inventing unknown values.

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

Supabase service-role and provider keys cross only server-side adapter boundaries. A future seller-artifact boundary is hostile and must be isolated from both.

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

## Security assumptions

- Server environment and deployment configuration protect secrets.
- Existing providers and Supabase are trusted infrastructure but their outputs/errors are untrusted data.
- The current application is operated as an internal lab with trusted operators; this does not substitute for user/tenant authorization.
- SHA-256 collision resistance is sufficient for current content addressing; hashes provide integrity binding, not signer identity.

## Review triggers

Re-review this model before public users, auth/tenant RLS, durable Blueprint publication, new outcome compilers, additional providers, payments, seller onboarding, executable seller artifacts, public APIs, semantic verifiers, or changes to canonical commit.

Repository: app-generativa-ia
Version: base-24f09defd605426638fe87a4b0da78ebad97bbb3+spec-foundation-v0.1-working-snapshot
