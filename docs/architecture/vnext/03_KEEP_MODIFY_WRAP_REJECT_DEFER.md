# KEEP / MODIFY / WRAP / REJECT / DEFER Classification

Classification is based on the release tree, not on an imagined future
framework.

| Component or recommendation | Classification | Boundary decision |
| --- | --- | --- |
| AuthorityContext | KEEP | Retain authenticated request identity and tenant membership snapshot; never treat it as durable commit authority. |
| ExecutionAuthority | KEEP | Retain immutable execution envelope and capability subset. |
| MutationLease | KEEP | Retain path-level mutation controls; compose rather than replace. |
| Commit-time OWNER RPC | KEEP | Retain current database membership locks and F1 delegation. |
| Tenant repository factory | KEEP | Retain mandatory trusted tenant scope and global/tenant separation. |
| Storage namespace and server store | KEEP | Retain server-mediated generated tenant keys; verify deployed policy separately. |
| OutcomeTransaction | KEEP | Retain lifecycle and transaction identity. |
| Asset/AssetVersion/StateCommit | KEEP | Retain immutable version history and atomic canonical transition. |
| OutcomeBlueprint | KEEP | Retain versioned policy/capability/criteria source. |
| TaskSpec | MODIFY | Keep immutable compiled form, but document it as Precision Edit execution contract beneath any future generic Work Contract. |
| Generic Work Contract | DEFER | Do not invent a second abstraction until another outcome type proves shared semantics. |
| EvidenceReceipt | WRAP | Keep receipt integrity and lineage; expose a future generic Evidence envelope above operation-specific fields. |
| Criterion evidence | WRAP | Keep exact criterion bindings; add generic Evidence Requirement/Qualification vocabulary only when a second verifier needs it. |
| F6 seven assertions | KEEP | Keep as the Precision Edit verifier definition; REJECT its use as universal assertions. |
| F7 assurance model | KEEP | Keep semantic/provenance/independence separation for development assurance. |
| VerificationRun | WRAP | Keep persisted machine result; distinguish claim qualification from aggregate status in future generic APIs. |
| Human Acceptance / field feedback | KEEP | Keep separate from machine verification and reauthorize accepting OWNER at commit. |
| Generic AcceptanceRecord | DEFER | A useful future vocabulary, but current acceptance is still Field Beta-specific. |
| ExecutorPort | KEEP | Existing port is provider-neutral enough for current execution. |
| Image executor ports | KEEP | Preserve as capability specialization beneath the port. |
| Universal plugin/marketplace executor registry | REJECT | No evidence requires a public plugin system or multi-executor orchestration now. |
| Controlled/fake executors | KEEP | Test and controlled lanes; not production authority. |
| OpenAI/image provider adapters | WRAP | Keep adapters behind ports and record provider identity; do not promote provider assumptions to domain truth. |
| Preservation ladder and ROI | KEEP | Valid Precision Edit capability specialization. |
| Generic knowledge graph / RAG Canon | REJECT | No demonstrated need; it would broaden context and authority surfaces. |
| Scoped Operational Canon | DEFER | Preserve exact source/spec/policy snapshots first; do not build a generic graph. |
| Signal Requirement / Qualification / Readiness | MODIFY | BUILD 002 should add a narrow generic pre-execution model with explicit provenance. |
| IntentContract confidence | MODIFY | Keep as interpretation metadata; do not use numeric confidence as readiness. |
| Pragmatic signal analysis | KEEP | Useful input to requirements, not authoritative qualification by itself. |
| Feedback, golden cases, regression candidates | KEEP | Preserve observation and regression evidence. |
| Learning engine / causal optimizer | DEFER | Observed correlation is not causality; no BUILD 002 objective requires learning. |
| Billing, payments, business optimization | DEFER | Cost records remain observations; unknown cost stays unknown. |
| New UI, mobile app, universal SDK | DEFER | No trust or readiness invariant requires them. |

## Precision Edit leakage classification

| Leakage | Classification | Reason |
| --- | --- | --- |
| ROI and normalized pixel zones | ACCEPTABLE_CAPABILITY_SPECIALIZATION | Correct inside the image preservation capability. |
| `RAW_PROVIDER` / `PRESERVED` candidate types | ACCEPTABLE_CAPABILITY_SPECIALIZATION | Artifact lifecycle is media-specific and explicitly named. |
| Image dimensions, PNG, storage metadata | ACCEPTABLE_CAPABILITY_SPECIALIZATION | Needed by current media executor and evidence. |
| Seven creative assertions | ACCEPTABLE_CAPABILITY_SPECIALIZATION | F6 binds them to one verifier definition; do not generalize. |
| Field Beta policy/strategy ladder | ACCEPTABLE_CAPABILITY_SPECIALIZATION | Product experiment layer, not trust-kernel semantics. |
| TaskSpec's image source and ROI fields | NEEDS_ADAPTER | A future Work Contract can map generic deliverables into this compiler without changing current proof. |
| Media fields inside generic AssetVersion state | NEEDS_ADAPTER | Keep envelope generic and map media state through a capability adapter. |
| Field feedback and candidate preference in generic acceptance language | DEFERRED_CLEANUP | Current boundaries are valid; generalize only with a second domain. |
