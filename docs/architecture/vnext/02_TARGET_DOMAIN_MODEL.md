# Target Domain Reconciliation

## Target lifecycle mapped to the repository

| Target stage | Current implementation | Reconciliation |
| --- | --- | --- |
| Intent | `IntentContract`, `IntentCompiler`, pragmatic signals, `intent_runs` | Exists, but compiler output is a validated interpretation, not a durable sufficiency decision. |
| Authorized Context Lens | `AuthorityContext`, `SpecLens`, tenant-scoped repositories/storage | Bounded context exists; it must not be expanded into retrieval or broader access. |
| Scoped Operational Canon | No generic object. Some source versions, TaskSpec snapshots, policy definitions, and durable lineage act as local facts. | Defer a generic Canon; preserve exact snapshots and provenance. |
| Signal Requirements | Blueprint variables, TaskSpec `inputRequirements`, clarification requirements in IntentContract | Partial and split across intent/spec layers; no pre-execution readiness object. |
| Signal Qualification | Schema validation, spec linter, deterministic compiler, pragmatics | Partial: validity and missing inputs are checked, but no generic evidence-backed qualification decision exists. |
| Work Contract | No generic object above TaskSpec | TaskSpec is an execution-oriented Precision Edit contract, not yet a universal Work Contract. |
| Delegation Readiness | No durable state machine | BUILD 002 gap and selected scope. |
| Authority | AuthorityContext, ExecutionAuthority, MutationLease, current OWNER RPC locks | Proven reusable kernel. |
| Executor | `ExecutorPort`, image executor ports, fake/controlled/OpenAI implementations | Existing ports are reusable; universal plugin registry is premature. |
| Execution | ExecutionRun plus candidate/preservation services | Proven for current media path. |
| Evidence Requirements | Blueprint criteria/evidenceTypes and F6 verifier definition | Present as current schema, but generic requirement abstraction is not yet separated. |
| Evidence | EvidenceReceipt, CandidateAsset, PreservationEvidence, criterion evidence | Proven lineage and integrity; payloads remain specialized. |
| Evidence Qualification | Same-Spec Gate, F6 exact seven, F7 semantic/provenance assurance | Proven for current Precision Edit verifier; not universalized. |
| Verification | VerificationRun, field outcome status, assurance result semantics | Machine status is distinct from human acceptance; claim-local semantics are proven. |
| Human Acceptance | `field_feedback`, `candidate_preferences`, authenticated OWNER binding | Separate from machine verification; current representation is product-specific. |
| Outcome Observation | Feedback, evaluation samples/judgments, golden/regression cases, cost records | Exists as operational data and experiments, not causal learning. |
| Learning | No general learning engine | Defer. |

## TaskSpec decision

`WORK_CONTRACT_DECISION=B`: current immutable TaskSpec is an executor-oriented
implementation artifact under a broader future Work Contract, and it is also a
Precision Edit specialization. It must not be renamed into a universal
contract before a second independently bounded outcome type demonstrates the
shared fields.

### TASKSPEC_ROLE

TaskSpec binds one transaction, one blueprint version/hash, one source version
and hash, provenance-labelled values, constraints, capability grant, verifier
criteria, security policy, compiler identity and a content hash. It is the
correct immutable input to the current executor/verifier path.

### TASKSPEC_GAPS

- No generic `WorkContract` identity independent of the Precision Edit compiler.
- No explicit delegation-readiness decision or evidence set before compilation.
- `status=READY` means required values are resolved, not that a human or system
  has established sufficient signal for safe delegation.
- `inputRequirements` and `clarificationRequirements` are not one durable,
  provenance-bound requirement model.
- Capabilities are granted to the execution path but are not themselves a
  readiness proof.

### TASKSPEC_FIELDS_TO_PRESERVE

Transaction/source/blueprint identity and hashes, version chain, provenance of
values, constraints, capabilities, security profile, verification policy,
compiler identity, rejection reasons, input requirements, criteria, and the
canonical content hash.

### TASKSPEC_FIELDS_TOO_DOMAIN_SPECIFIC

`image/png` source assumptions, normalized ROI, image dimensions, pixel
preservation variables, `PRECISION_IMAGE_EDIT`, `P0_RAW/P3_HARD` strategy
identifiers, image provider metadata, and the seven creative assertions.

### TASKSPEC_FIELDS_MISSING_FOR_DELEGATION

An explicit requirement set with source/provenance, qualification result,
dependency snapshot, readiness state, blocking reason, expiry/invalidation
links, and a decision subject. These belong to BUILD 002 readiness, not an
unreviewed TaskSpec rename.

## Authority reconciliation

The current model composes correctly:

```text
AuthorityContext (who/tenant)
  + ExecutionAuthority (which execution, capabilities, paths)
  + MutationLease (what paths/effects)
  + current tenant_memberships and tenants (durable current authority)
  + commit-time OWNER locks (whether commit is still authorized)
```

It answers who may request and execute, what may be accessed or mutated, and
which current OWNER may commit. Revocation makes cached context stale at the
commit boundary. No additional DelegationAuthority object is justified yet;
BUILD 002 readiness must be a prerequisite, not a replacement for this model.

## Evidence reconciliation

EvidenceReceipt is an execution observation. CandidateAsset and preservation
records are media artifacts and transformation evidence. Criterion evidence
is the exact binding layer. VerificationRun is an aggregate claim, but it is
not proof by status alone. F6's seven assertions are the complete material
definition for the current Precision Edit verifier; they are an example
verifier definition, not universal Virro assertions.

The generic rule is preserved:

```text
No compatible evidence -> no verification claim -> no commit.
```

## Canonical state

`AssetVersion` plus an immutable `StateCommit` is the reusable Outcome State
Version and commit-proof kernel. The current `state.media` payload and
candidate storage metadata are media-specialized representations inside that
generic envelope. Execution artifacts never become canonical merely because
they exist; the commit RPC creates a new immutable version and history row.
