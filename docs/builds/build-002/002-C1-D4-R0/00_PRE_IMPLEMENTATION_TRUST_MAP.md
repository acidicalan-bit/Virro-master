# BUILD 002-C1-D4-R0 Pre-Implementation Trust Map

## TaskSpec authority decision

TaskSpec authority is **PERSISTED_IMMUTABLE**. The authoritative source is
`public.field_outcomes.task_spec_snapshot`, joined through the exact
`transaction_id`, with `task_spec_id`, `task_spec_version`, `task_spec_hash`,
`source_version_id`, `source_sha256`, and blueprint identity columns. The
BUILD 005 insert-only trigger and BUILD 001 trust-lineage trigger bind that
snapshot to the transaction owner, asset, source version, and TaskSpec
identity. The in-memory `InMemoryTaskSpecRegistry` is not an authority source.

| Boundary | Authority source | Client input | Server-derived state | Constraints / RLS | Classification |
|---|---|---|---|---|---|
| Tenant | `tenants.id/status` | principal and membership IDs only | tenant from locked membership and transaction | FK, active status, tenant RLS | PROVEN |
| Resource | transaction, asset, current asset version | transaction identity only | locked transaction, asset, and current version | owner FKs and lineage triggers | PROVEN |
| D0 authority | readiness authority commit | commit/admission identity | locked commit and graph rows | immutable marker, RPC-only insert | PROVEN |
| D3 admission | `build002_delegability_admissions` | admission identity | locked admission and current graph | immutable, exact transaction/tenant FKs | PROVEN |
| TaskSpec | `field_outcomes.task_spec_snapshot` | TaskSpec ID/hash selector | snapshot and hash columns loaded by transaction join | immutable insert-only + trust lineage | PROVEN |
| Capability grant | D4 RPC | none | normalized subset of published blueprint capabilities | append-only D4 table, private token | MISSING before D4 |
| Execution consequence | no D4 write path | none | explicitly false/zero | no executor, lease, run, receipt, or commit writes | PROVEN |

The D4 RPC will lock, in order, tenant/current membership, transaction,
asset/current version, C0 binding, D0 marker, D3 admission, current graph
tables, and the TaskSpec row. It derives every capability and mutation-path
field. Callers cannot provide a graph, readiness, currentness, capability,
mutation path, evaluator, or callback.

## Design change recorded before implementation

The originally proposed caller-provided TaskSpec payload is removed. D4
accepts only principal, membership, admission, TaskSpec ID, and TaskSpec hash
selectors; all evidence and grants are reconstructed from the persisted
immutable row inside the serialized RPC transaction.
