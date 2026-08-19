# Architecture Gaps and Readiness Boundaries

## Signal Sufficiency Gap

The repository has several partial signal mechanisms:

- `IntentContract` records interpreted meaning, explicit facts, implicit
  expectations, assumptions, ambiguities and clarification requirements.
- `analyzePragmatics` derives domain signals such as slang, frustration and
  preservation intent.
- `OutcomeBlueprint` declares parameter variables, criticality and unknown
  input policy.
- `DeterministicPrecisionEditSpecCompiler` produces `READY`, `INPUT_REQUIRED`
  or `REJECTED` and records `inputRequirements`.

These are not one generic decision. Schema validity is not evidence that a
delegation is sufficiently specified. There is no durable object that states
which signals were required, how each was qualified, what source/provenance
supports it, what dependency snapshot was used, or when readiness becomes
stale.

Required next boundary: an explicit, non-numeric readiness state that fails
closed when a critical signal is absent, unknown, contradictory or stale.

## Operational Canon Gap

Some values are already durable snapshots: source AssetVersion, TaskSpec and
Blueprint hashes, preservation policy/version, verifier definition and
artifact lineage. They provide local truth for one execution. The repository
does not have a generic Scoped Operational Canon with provenance states
`OBSERVED`, `USER_STATED`, `SYSTEM_DERIVED`, `INFERRED`, `CONFIRMED`, and
`UNKNOWN`, nor a common invalidation graph. BUILD 002 does not need that broad
Canon to establish signal readiness. It should use explicit dependency hashes
and timestamps in the smaller readiness model; a general Canon is DEFERRED.

## Authorized Context Lens

`AuthorityContext`, `SpecLens`, role-specific capabilities and tenant-scoped
factories already provide bounded context. The lens filters values and
criteria; it cannot enlarge TaskSpec capabilities. This is sufficient for
BUILD 002's readiness evaluation if readiness only reads already-authorized
context. Retrieval, RAG, private-context expansion and generic graph storage
are not justified.

## Executor abstraction gap

`ExecutorPort`, `ImageEditExecutor`, controlled/fake executors and OpenAI/image
adapters demonstrate a useful port boundary. Execution fingerprints currently
live in run metadata and receipts. A universal executor plugin system is not
proven necessary. BUILD 002 should not modify executor authority or create a
registry; readiness must be independent of which executor is later selected.

## Outcome observation and learning

Feedback, evaluation samples/judgments, regression candidates, golden cases
and CostRecord are real observations. They do not establish causal effects,
economic optimization or learning policy. Unknown cost remains nullable and
must not be converted into zero. Learning is DEFERRED without violating the
constitution.

## Governance gap

The release was promoted with a normal fast-forward and no force push, but
repository evidence in this gate does not prove that GitHub branch protection,
PR-only changes or required checks are enabled. Before BUILD 002 code, require
those controls as release governance. No GitHub settings are changed here.

## Dependency order

```text
Signal Requirement + Qualification + Readiness
  -> a real pre-execution delegation boundary
  -> only then consider generic Work Contract or Canon
  -> only with a second domain consider executor/evidence generalization
```

This order minimizes new authority surface and makes the next invariant
independently testable.
