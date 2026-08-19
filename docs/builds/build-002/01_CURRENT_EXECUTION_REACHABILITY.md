# Current Execution Reachability

## Supported production entrypoint

`POST /api/field-beta` with `action: "run"` is the only supported production
execution entrypoint found in the repository.

1. `resolveRequestAuthority` derives the principal from Supabase Auth and
   resolves the requested/current tenant membership through the user-scoped
   client.
2. `createFieldBetaService(authority)` requires an authenticated authority in
   non-test environments and creates tenant-scoped service-role repositories
   and tenant-prefixed storage.
3. `FieldBetaService.run` validates the request, publishes the server-owned
   precision-edit blueprint, creates the transaction through the base runner,
   compiles and verifies the TaskSpec, and checks the same-spec evidence.
4. `PreservationVerificationService.runExperiment` performs source preflight,
   creates the tenant-owned project/asset/version/transaction/patch/lease,
   binds `ExecutionAuthority` when a TaskSpec and authority are present, and
   invokes the selected image executor.

The first external side effect is the call to `executor.execute` in
`PreservationVerificationService.runExperiment`. BUILD 002 must gate immediately
before that call, after the subject, requirements, signals, qualification,
authority and exact TaskSpec/source bindings are known.

## Legacy and lab surfaces

| Surface | Reachability | Classification |
| --- | --- | --- |
| `/api/precision-edit` | Always returns `410 LEGACY_CANONICAL_PATH_DISABLED`; points to Field Beta | Retired, no bypass |
| `/api/transaction-lab` | Uses in-memory repositories and `FakeExecutor`; `legacyRouteDisabledResponse` unless non-production plus explicit internal flag | Lab-only bypass, not supported production execution |
| `/api/preservation-study` and `/api/preservation-study/media` | Guarded by the same legacy flag; its service-role study path has no tenant authority | Lab/legacy bypass, must remain disabled in production |
| `OutcomeTransactionService.executeTransaction` | In-memory legacy service reachable only through transaction lab route | Lab-only; must not be treated as a BUILD 002 production path |
| `ImageEditService` | Application class has no production route/import reachability in the current tree | Unused legacy/application surface; audit if reintroduced |
| Fake/controlled executors | Selected only by explicit server configuration; controlled path rejects production | Test/staging fixtures, not a new production authority |

## Choke-point requirement

The current supported path has one provider/executor call site. The BUILD 002
gate must be a server-side method at that call site or a single service invoked
by it. Any future route that invokes an executor, preservation runner, or
provider must call the same gate. A route that bypasses the gate is not a
supported execution path and must fail closed or remain behind the legacy guard.

## Reachability finding

Before BUILD 002 implementation, `TaskSpec.status === READY` and valid
`ExecutionAuthority` are insufficient to prove signal sufficiency. The current
path can reach the executor without a `DelegationReadiness` record. Therefore
`NON_READY_CANNOT_EXECUTE` is not a current property; it is the explicit
post-implementation acceptance criterion for the shared choke point.
