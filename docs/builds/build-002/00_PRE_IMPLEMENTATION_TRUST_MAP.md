# BUILD 002 Pre-Implementation Trust Map

## Baseline and decision

- Baseline: `main` at `6bcc184e5821a09a511b461c94cd1a88fc920eb8`.
- Tree: `48d7b23e772d3ac3150091fd78cba5929973b8e0`.
- BUILD 001 release identity remains `f4d378b063f473d5ef25b057e11a68565be7c1ba`.
- Scope is documentation only. No runtime, migration, route, RLS, executor, or BUILD 001 change is made by this gate.

The implementation invariant is:

```text
no sufficient, qualified, current signal
 -> no DELEGATION_READY claim
 -> no execution reservation or provider/executor side effect
```

## Existing trust path

| Boundary | Actual input -> output | Authority / persistence | Mutability and binding | Fail-closed result | Classification |
| --- | --- | --- | --- | --- | --- |
| User intent -> `IntentCompiler` | `rawInput`, optional context/domain -> validated `IntentContract` and `intent_runs` row | Compiler validates Zod contract; repository is global and does not derive tenant authority | Contract is returned as a value; compiler/model/version metadata is persisted; no content hash | Invalid model output or provider failure rejects compilation | PARTIAL |
| Intent -> outcome request | Current production Field Beta accepts project, asset, instruction, source bytes, ROI, topology and task type directly; there is no persisted `IntentContract` link | Authenticated tenant authority is resolved by `/api/field-beta`; server creates project/asset | Caller controls request fields, server assigns tenant and IDs | Zod rejects malformed request; tenant/role checks reject unauthenticated requests | PARTIAL |
| Request -> `OutcomeBlueprint` | Field Beta publishes the precision-edit blueprint definition in memory | Server-owned definition; published object has canonical hash and immutable copy | Blueprint version/hash are generated server-side; publication timestamp is not hash material | Blueprint validation rejects malformed definitions | PROVEN |
| Blueprint -> `TaskSpec` | Compiler receives blueprint, transaction/source identity, instruction, ROI, customer parameters and runtime capabilities -> immutable hash-bound `TaskSpec` | Server compiler; TaskSpec registry/repository is server-side in current path | `TaskSpec.hash` covers semantic material; ID and createdAt are excluded from hash; status can be `READY`, `INPUT_REQUIRED`, or `REJECTED` | Invalid source/blueprint/previous spec, missing required input or capability returns reject/input required | PROVEN for current precision-edit semantics |
| Request -> transaction/resource | `PreservationVerificationService.runExperiment` creates project, asset, source `AssetVersion`, `OutcomeTransaction`, partial intent, patch and mutation lease | Tenant service-role bundle is created with trusted `ownerTenantId`; authority is passed separately | Rows are durable; transaction is moved to `PREPARED`, `READY`, `EXECUTING` before provider call | Storage/repository failure aborts the path; no readiness check exists | PARTIAL |
| TaskSpec -> authority | `bindExecutionAuthority` binds authenticated `AuthorityContext` to tenant/project/asset/transaction/base version/spec/mutation paths | `AuthorityContext` comes from Supabase Auth plus current membership; `ExecutionAuthority` is frozen | Exact TaskSpec hash and tenant/resource IDs are checked | Mismatch throws before provider invocation | PROVEN |
| Authority -> executor | Current Field Beta calls `baseRunner.runExperiment`; after source preflight and transaction/spec setup it invokes `executor.execute` | Provider selection is server configuration; `OpenAIImageEditExecutor` or explicitly controlled/fake executor | Executor receives server-assembled context; no readiness object exists | Provider/preflight/output failures mark transaction failure, but authority alone currently permits invocation | MISSING for BUILD 002 |
| Executor -> evidence | Provider output -> `ExecutionRun`, raw `CandidateAsset`, preservation artifacts, receipts and criterion evidence | Tenant repositories/storage and F7 provenance controls; service-role writes are scoped | Evidence is historical and hash/lineage bound; candidate bytes are not canonical state | Invalid output geometry/hash or storage failure fails the run | PROVEN for BUILD 001 path |
| Evidence -> verification/acceptance | Same-spec and criterion evidence -> `VerificationRun`; human feedback/acceptance -> durable acceptance | Server verifier and authenticated OWNER for acceptance | Verification/acceptance are historical; commit rechecks current OWNER | Missing/unknown/foreign evidence blocks verification/commit | PROVEN |
| Acceptance -> StateCommit/current head | Commit RPC locks current tenant/membership and canonical rows, reauthorizes OWNER, then atomically writes version/head/commit | PostgreSQL privileged RPC is the canonical authority | StateCommit and canonical versions are immutable; current head is updated only in RPC | Any failed precondition rolls back all canonical writes | PROVEN |

## Missing BUILD 002 boundary

There is currently no durable `Signal`, `SignalQualification`, or
`DelegationReadiness` boundary and no readiness-to-execution binding. `TaskSpec`
`READY` means the current precision-edit compiler found no missing inputs; it is
not a qualified, dependency-current delegation decision. A caller cannot create
an authoritative READY TaskSpec through the API, but a server path can invoke
the executor without a separate readiness assessment.

## Trust decisions for implementation

1. `OutcomeTransaction` is the readiness subject. It already exists before the
   first provider call, is tenant/resource rooted, and is the same identity used
   by `ExecutionRun`, evidence, verification, acceptance and StateCommit.
2. Requirements are compiled from the immutable, versioned `OutcomeBlueprint`
   and its security/policy definition. `TaskSpec.inputRequirements` is a
   hash-bound projection, not a second source of truth.
3. Signals and qualification are server-mediated. Provenance, criticality,
   accepted provenance, qualification and readiness are never caller fields.
4. Readiness is an immutable assessment snapshot plus a derived current-validity
   check. Only current `READY` may reserve execution; `READY_WITH_CONDITIONS`
   never silently delegates.
5. The execution gate is a PostgreSQL transaction that locks the
   `OutcomeTransaction` subject, revalidates exact requirement/signal/dependency
   hashes, and inserts an immutable readiness-execution reservation before any
   executor side effect. Signal/dependency writes use the same subject lock.
6. Readiness grants no tenant access, executor capability, storage access, OWNER
   authority, or canonical commit right. Existing BUILD 001 authority and commit
   reauthorization remain mandatory.

## Gate conclusion

The subject, requirement source, supported execution choke point, downstream
binding, fail-closed state model and TOCTOU strategy are resolved without
weakening F1-F9. Implementation may proceed only through the documented
sub-build sequence and independent verification gates.
