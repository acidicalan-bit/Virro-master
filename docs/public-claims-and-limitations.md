# Public claims and limitations

Last reviewed: 2026-07-16
Scope: public website, public demo, assisted audit funnel and enterprise demo workspace.

## Claim policy

Virro must distinguish the delivery model wherever a capability is described:

- **Available:** the public informational surface or implemented demo behavior exists.
- **Available with guidance:** Virro can provide the outcome through an assisted, bounded engagement.
- **Pilot:** the capability requires a validated client scope, configuration and human review.
- **Planned:** product direction or technical foundation exists, but no productive self-service capability is claimed.
- **Future vision:** category direction only; it must not be presented as current product behavior.

## Current public positions

| Surface or capability | Public status | Permitted claim | Required limitation |
| --- | --- | --- | --- |
| Flow Understanding Audit | Available with guidance | Virro can map one bounded transfer and deliver evidence, limitations and recommendations. | Scope, sources, privacy, retention and deletion must be agreed before client material is reviewed. |
| Signal Sufficiency | Available with guidance | Virro can state that available evidence is insufficient for a reliable verdict. | Insufficient signal is not a zero score and must not produce a forced verdict. |
| Readiness and Change Integrity | Available with guidance | Virro can identify directional gaps and dependent artifacts requiring confirmation. | Findings remain probabilistic and require human review. |
| Product Delivery | Pilot | The demo shows how product intent, criteria and QA evidence can be structured. | Demo data does not establish client outcomes or productive integration. |
| Design Delivery | Available with guidance | An assisted review can map brief, version, assets, restrictions and approval evidence. | No productive Figma connector is claimed. |
| Operational Handoff | Pilot | Virro can structure receiver, expected action, dependencies, evidence and acceptance. | A handoff is not accepted until the receiver confirms it can act. |
| Jira connector | Planned | Jira is the first native-connector candidate and the site demonstrates the intended read-only model. | No productive self-service Jira connector is claimed. |
| API and events | Planned | A technical foundation may be validated per pilot. | Public availability, production SLA and broad compatibility are not claimed. |
| AI Understanding | Future vision | The site may describe evidence and context requirements for AI-assisted work. | No autonomous decision, hallucination prevention or productive AI integration is claimed. |
| Public enterprise demo | Simulated | Visitors can explore the product model with controlled data. | No demo score, classification or outcome represents a real client result. |

## Privacy claims by runtime

- **Public form:** receives only submitted contact and workflow fields; it does not analyze attachments. The request contract schedules the lead record for deletion after 90 days, subject to the configured delivery channel honoring that policy.
- **Assisted audit:** retention, deletion, approved sources and access are defined per engagement. The public site cannot promise one universal raw-data policy for every engagement.
- **Virro Core safe-mode foundation:** the code models transient raw processing and safe-signal retention. Production controls, tenant isolation and operational deletion require validated deployment evidence before they are described as generally available.
- Virro must not claim certifications, productive connectors, cross-client learning controls, SLAs or customer outcomes without current supporting evidence.

## Infrastructure dependencies before production activation

- Configure and verify webhook or Resend delivery for audit requests.
- Configure distributed rate limiting for serverless production using the documented Redis REST variables.
- Verify the 90-day lead deletion workflow in the receiving system; the website records the policy but cannot enforce deletion in an external inbox or CRM.
- Validate DNS, email authentication, monitoring, alerting and incident ownership.
- Run deployed-environment accessibility, security-header and form-delivery checks before promotion.

## Review rule

Any new public metric, integration, certification, customer outcome or retention statement must be added to this document with its evidence owner, current status and limitation before publication.
