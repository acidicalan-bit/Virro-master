# C5 Requirement Authority Options

## Verified gap

`OutcomeBlueprint` contains identity/version/hash, variables, criticality,
capabilities, quality criteria, security policy, and verification policy. It
does not encode the complete BUILD002-A requirement semantics:
`acceptedProvenance`, `qualificationRule`, `dependencySelectors`, or an exact
requirement-set binding. `compileSignalRequirement` needs those fields and
there is no deterministic authoritative mapping that supplies them today.

Therefore `BLUEPRINT_ALONE_CAN_COMPILE_REQUIREMENTS = NO`.

## Rejected authorities

- **Caller-provided SignalRequirement:** untrusted input; BUILD002-B can verify
  integrity but cannot establish source authority.
- **BUILD002-B persisted SignalRequirement:** immutable compiled evidence, not
  the upstream definition authority.
- **TaskSpec.inputRequirements:** downstream executor projection; it lacks
  complete Signal semantics and must not become upstream authority.
- **raw_request:** user material, not a versioned requirement definition.
- **OutcomeBlueprint.variables alone:** missing provenance, qualification, and
  dependency semantics.
- **LLM-generated requirements:** non-deterministic and not authoritative.
- **Jira/Slack/inferred fields:** adapter material, never Core authority.

## Options

| Option | Result |
|---|---|
| A. Extend OutcomeBlueprint | Backward-compatible at first glance, but conflates product capability contract with readiness requirements and risks BUILD001 specialization changes. |
| B. Separate immutable OutcomeRequirementProfile bound to Blueprint | Preserves Blueprint/TaskSpec boundaries, supports exact versioning and policy binding, and generalizes across product workflows. Requires two new immutable artifacts and a binding. **Selected.** |
| C. Generic unbound RequirementSet | Reusable but loses exact product source lineage and makes policy/Blueprint mismatch easier. Rejected for C0. |

Option B best fits the repository: it leaves BUILD001 Blueprint/TaskSpec
behavior unchanged, supplies the missing BUILD002-A semantics, supports future
Product→Dev, Design→Dev, Development→QA, Sales→Delivery, Human→AI, and AI→Human
profiles, and keeps connectors outside the Core. Policy remains nullable for
C0 rather than inventing a policy engine.
