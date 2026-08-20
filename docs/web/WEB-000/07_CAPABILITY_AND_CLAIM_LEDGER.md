# Capability and Claim Ledger

## Public status type

```ts
type CapabilityStatus = "available" | "pilot" | "planned" | "conceptual";
```

- **available:** deployed, supported, and evidenced for the stated audience/environment.
- **pilot:** implemented in a bounded path but not generally available.
- **planned:** approved implementation direction, not yet usable.
- **conceptual:** explanatory model or scenario; no availability implication.

Internal proof is not automatically “available.” Marketing must map engineering evidence to a public status and audience before publishing.

## Capability ledger at baseline

| Capability | Public status | Evidence | Boundary |
| --- | --- | --- | --- |
| Deterministic intent compilation | pilot | Root Intent Lab and `/api/compile` | Internal lab; provider configuration may be required |
| Versioned Blueprint / Task Spec and same-spec checks | pilot | Current domain/application proof and Field Beta path | Narrow Precision Edit proof, not horizontal GA |
| Tenant-derived authority for Field Beta | pilot | Authenticated `/field-beta`; server-derived membership/tenant | Repository states public multitenant readiness is not established |
| Persistent signal requirement catalog | pilot | BUILD002 C0-B persistence | No public configuration surface |
| Server-owned requirement authority | pilot | BUILD002 C0-D | Internal server boundary |
| Complete persisted signal-universe resolution | pilot | BUILD002 C1-A | Read-only; does not ingest/qualify/execute |
| Server-derived dependency snapshot | pilot | BUILD002 C1-B | In-memory, non-atomic candidate; no persistence |
| Deterministic readiness candidate | pilot | BUILD002 C1-C and native PostgreSQL test | In-memory; no delegability, persistence, provider call, or transaction transition |
| Authoritative readiness commit / execution gate | planned | Explicitly owned by later C1-D | Not present at requested baseline |
| Non-ready work cannot execute | planned | Acceptance criterion in execution-reachability document | Not a current property at baseline |
| Stale dependency detection | pilot | C1-B/C1-C source-head and qualification logic | Internal capability, not a public integration |
| Evidence / verification / human acceptance / canonical commit | pilot | BUILD001/Field Beta evidence and commit controls | Narrow supported path; not proof of universal product availability |
| Jira, Slack, GitHub, Figma integrations | conceptual | Used only as explanatory inputs in WEB-000 | No connector availability was established |
| Verified Documentation product | conceptual | Authorized-view architecture proposed here | Not a current product surface |
| Work Assurance showroom | planned | WEB-002 recommendation | Deterministic, no provider call |

## Material claim ledger

| Proposed claim | Classification | Allowed public wording / action |
| --- | --- | --- |
| “Virro is the assurance layer for work.” | CONCEPTUAL category | Allowed as positioning, paired with explicit capability status |
| “Keep work aligned across people, tools and AI.” | CONCEPTUAL thesis | Allowed as desired outcome, not guaranteed result |
| “Virro computes deterministic readiness candidates.” | SUPPORTED_BY_CURRENT_PRODUCT | Allowed with “pilot/internal capability” and candidate/non-authoritative boundary |
| “Readiness uses current requirements, signals, provenance and dependency bindings.” | PROVEN at baseline | Allowed in technical explanation of C1-C candidate evaluation |
| “A READY result authorizes execution.” | REJECT at baseline | C1-C explicitly makes no delegability decision |
| “Non-ready work cannot execute.” | PLANNED | Do not use as current claim until the shared choke point is proven |
| “Virro detects when a bound source version changes.” | SUPPORTED_BY_CURRENT_PRODUCT | Allowed for the bounded dependency-snapshot/readiness path |
| “Virro automatically updates every downstream tool.” | NOT_PROVEN | Reject |
| “Virro works with Jira/Slack/GitHub/Figma today.” | NOT_PROVEN | Use generic source categories or mark examples conceptual |
| “Virro replaces Jira, GitHub, Slack, or Notion.” | REJECT | State the opposite |
| “Virro creates verified documentation from one current work state.” | CONCEPTUAL | Present only as planned product model |
| “Virro verifies execution against the approved specification.” | SUPPORTED_BY_CURRENT_PRODUCT | Scope to existing same-spec/Field Beta proof; do not imply universal GA |
| “Human acceptance is separate from execution evidence.” | PROVEN | Allowed as a trust principle and current narrow proof |
| “Virro prevents AI hallucinations.” | REJECT | Impossible/unbounded claim |
| “Virro guarantees correct outcomes.” | REJECT | Impossible/unbounded claim |
| “Virro is enterprise secure.” | NOT_PROVEN | Replace with exact authority/provenance controls |
| “Tenant isolation is complete.” | NOT_PROVEN | Current docs preserve explicit limitations |
| “SOC 2 / ISO 27001 / HIPAA compliant.” | NOT_PROVEN | Do not display |
| “Reduces cost/rework/time by X%.” | NOT_PROVEN | Do not publish without a governed measurement source |
| “Trusted by [customer/logo].” | NOT_PROVEN | Do not publish without permission and evidence |

## Evidence display contract

Any material assertion in a product mock may expose:

- provenance class;
- source identity;
- actor/authority when applicable;
- captured/evaluated timestamp;
- source and derived version;
- dependency/content hash abbreviation;
- capability status.

## Prohibited proof substitutes

No fake metrics, customers, testimonials, logo rails, certifications, integration availability, uptime, SLAs, or ROI. When proof is absent, show the product mechanism and label the scenario `CONCEPTUAL WORKFLOW`, `SCENARIO`, or `PRODUCT DEMO`.

## Readiness state model

Public states may include:

`READY`, `READY_WITH_CONDITIONS`, `NEEDS_CONTEXT`, `INSUFFICIENT_SIGNAL`, `HUMAN_REVIEW_REQUIRED`, `STALE`, `BLOCKED_BY_POLICY`, and `UNKNOWN`.

The baseline domain directly evidences `READY`, `INSUFFICIENT_SIGNAL`, and `HUMAN_REVIEW_REQUIRED` in readiness output; other public labels require mapping review before implementation. Never convert the model to a 0–100 score.
