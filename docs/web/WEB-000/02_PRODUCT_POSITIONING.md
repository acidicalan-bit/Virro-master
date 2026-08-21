# Product Positioning

## Category

**Work Assurance** is the public category. It positions Virro as the assurance layer for work: a product model designed to keep people, tools, and AI aligned around the same current, authorized understanding of what must happen and to verify execution against what was agreed. Current public capability remains bounded by the status and evidence in the Claim Ledger.

This category is distinct from project management, observability, documentation generation, AI copilots, and workflow automation. Virro does not own the work system of record or the executor. It owns the assurance boundary between intent, current context, authorization, execution evidence, and human acceptance.

## Message hierarchy

1. **Keep work aligned across people, tools and AI.**
2. **From scattered context to verifiable work.**
3. **Delegate to AI without losing intent.**

Recommended hero support copy:

> Virro brings scattered requirements, decisions, and source changes into a versioned work-state model—then shows readiness separately from authority, delegability, and execution.

Recommended clarification:

> Virro connects to the tools your team already uses. It does not replace them.

## Public product story

```text
INTENT
  ↓
CURRENT CONTEXT
  ↓
SIGNALS + DEPENDENCIES
  ↓
READINESS
  ↓
WORK CONTRACT
  ↓
AUTHORITY
  ↓
DELEGABILITY
  ↓
HUMAN / AI EXECUTION
  ↓
EVIDENCE + VERIFICATION
  ↓
HUMAN ACCEPTANCE
  ↓
OUTCOME
```

The website must never imply that this entire chain is currently one generally available production product. Readiness does not grant authority, delegability, permission, or execution. Every named capability must carry `available`, `pilot`, `planned`, or `conceptual` status.

## Audience framing

### CTO / platform buyer

- Problem: work truth fragments across tools and autonomous executors.
- Placement: assurance layer between systems of record and execution.
- Readiness: a state decision derived from required, current, provenance-compatible signals—not a confidence score.
- Change: a changed source invalidates dependent work and exposes the propagation path.
- AI: the same authority and evidence rules apply to human and AI executors.
- Trust: every material state can expose source, timestamp, version, hash/binding, and evaluator.

### Nontechnical buyer

- The tools your team uses can disagree.
- Virro's product model is designed to keep the important meaning synchronized.
- A labeled product demo can show what is missing or stale without granting authority or permission to execute.
- It records why a decision was made and what changed.

## Human / AI balance

The website should depict `Human → Human`, `Area → Area`, `Human → AI`, `AI → Human`, and `AI → AI` as variants of the same assurance problem. AI is an executor class, not the center of the system. The center is the **Work State**.

## Documentation story

“Verified Documentation” means multiple authorized views derived from the same current work state. It is not “AI writes your docs.” Show the same intent rendered as a developer contract, QA criteria, stakeholder summary, and agent instruction, each with a binding to the same source version.

## CTA strategy

- Primary: **Join pilot** or **Request access**
- Secondary: **See how Virro works**
- Do not route users into Intent Lab, Field Beta, or a production form until access, capability status, privacy, and operational ownership are explicitly ready.

## Ten-second acceptance test

A first-time visitor must understand the product thesis, without confusing it with current availability:

1. connects work across tools;
2. represents a current, versioned work state with a distinct authority boundary;
3. evaluates whether applicable readiness requirements are satisfied without deciding authority, delegability, or execution;
4. exposes stale or unsupported context before later delegation and execution stages.

If the page only communicates “advanced AI” or “cool infrastructure,” it fails.

## Rejected claims and framings

- “Eliminate hallucinations,” “guarantee correctness,” or “prevent every mistake.”
- Readiness expressed as 0–100 confidence.
- Generic “single source of truth” without authority, version, and provenance semantics.
- “Available today” for an end-to-end readiness gate.
- Named integrations, customers, savings, uptime, security certifications, or SLAs without evidence.
- AI prompt box, chatbot, generative marketing copy, or provider calls on the public website.
