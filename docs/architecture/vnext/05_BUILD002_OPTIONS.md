# BUILD 002 Options

Candidates were ranked against architectural necessity, dependency order,
risk reduction, reusability, implementation size, independent verification,
and buyer-value relevance.

| Rank | Candidate | Assessment | Decision |
| --- | --- | --- | --- |
| 1 | A. Signal Requirement + Signal Qualification + Delegation Readiness | First missing trust boundary before TaskSpec/execution; small enough to specify and verify; directly reduces rework and unsafe assumptions. | SELECTED |
| 2 | B. Generic Work Contract above TaskSpec | Architecturally plausible, but no second outcome type proves shared fields. Risk of renaming Precision Edit artifacts into false universality. | DEFER |
| 3 | F. Evidence Requirement abstraction | Valuable after a second verifier or contract exists; current F6/F7 already prove the current path. | DEFER |
| 4 | C. Scoped Operational Canon | Broad and dependency-heavy; exact snapshots already cover current trust needs. | DEFER |
| 5 | D. Authorized Context Lens | Existing primitives are sufficient and proven; retrieval would broaden authority surface without a requirement. | KEEP_EXISTING_PRIMITIVES |
| 6 | E. Executor generalization | Existing ports and adapters are adequate; universal orchestration is premature. | DEFER |
| 7 | G. Learning/economic or marketplace platform | No direct BUILD 002 trust invariant and no causal/economic evidence. | DEFER/REJECT |

## Selection test

The selected candidate is the only option that creates a new invariant before
execution without requiring a new authority subsystem, a generic graph, or a
universal plugin model. It can be tested using deterministic fixtures and the
existing tenant/context primitives before any executor is invoked.
