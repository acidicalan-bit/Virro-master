# Product Positioning

## Category

**Work Assurance** is the public category. Virro is the assurance layer for work: it keeps people, tools, and AI aligned around the same current, authorized understanding of what must happen and verifies that execution matches what was agreed.

This category is distinct from project management, observability, documentation generation, AI copilots, and workflow automation. Virro does not own the work system of record or the executor. It owns the assurance boundary between intent, current context, authorization, execution evidence, and human acceptance.

## Message hierarchy

1. **Keep work aligned across people, tools and AI.**
2. **From scattered context to verifiable work.**
3. **Delegate to AI without losing intent.**

Recommended hero support copy:

> Virro turns scattered requirements, decisions, and source changes into one versioned work state—then shows whether a person or AI has enough current, authorized context to move.

Recommended clarification:

> Virro connects to the tools your team already uses. It does not replace them.

## Public product story

```text
INTENT
  ↓
AUTHORIZED CONTEXT
  ↓
SIGNALS + DEPENDENCIES
  ↓
READINESS CANDIDATE
  ↓
WORK CONTRACT + AUTHORITY
  ↓
HUMAN / AI EXECUTOR
  ↓
EVIDENCE + VERIFICATION
  ↓
HUMAN ACCEPTANCE
  ↓
OUTCOME
```

The website must never imply that this entire chain is currently one generally available production product. Every named capability must carry `available`, `pilot`, `planned`, or `conceptual` status.

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
- Virro keeps the important meaning synchronized.
- It shows what is missing or stale before work moves.
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

A first-time visitor must understand that Virro:

1. connects work across tools;
2. maintains a current authorized state;
3. determines whether work has sufficient support to move;
4. prevents human and AI delegation from silently drifting.

If the page only communicates “advanced AI” or “cool infrastructure,” it fails.

## Rejected claims and framings

- “Eliminate hallucinations,” “guarantee correctness,” or “prevent every mistake.”
- Readiness expressed as 0–100 confidence.
- Generic “single source of truth” without authority, version, and provenance semantics.
- “Available today” for an end-to-end readiness gate.
- Named integrations, customers, savings, uptime, security certifications, or SLAs without evidence.
- AI prompt box, chatbot, generative marketing copy, or provider calls on the public website.
