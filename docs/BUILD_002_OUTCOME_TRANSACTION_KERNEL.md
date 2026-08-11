# BUILD 002 — Outcome Transaction Kernel v0.1

## Architecture

The Outcome Transaction Kernel implements a minimal but real transactional kernel capable of representing, executing via a deterministic fake executor, verifying, committing, aborting, and rolling back an Outcome Transaction.

### Core Product Principle

```
Human Request → Partial Intent → Authorized Mutation → Execution → Evidence → Verification → Commit
```

**Primary rule: NO PROOF, NO COMMIT.**

## Domain Model

### Entities

1. **Project** — Groups assets for organizational purposes
2. **Asset** — Mutable entity with immutable version history
3. **AssetVersion** — Immutable snapshot of asset state at a point in time
4. **OutcomeTransaction** — Transactional unit of work with controlled lifecycle
5. **PartialIntent** — Represents only known desired changes without inventing unspecified state
6. **SemanticPatch** — Provider-neutral patch operation (SET_ATTRIBUTE, DELETE_ENTITY, TRANSFORM_ENTITY, ADJUST_ATTRIBUTE)
7. **MutationLease** — Authorization of effects by attribute path (MUTABLE, COUPLED, PRESERVE, HARD_LOCK)
8. **ExecutionRun** — Deterministic execution that never modifies canonical state directly
9. **EvidenceReceipt** — Immutable proof of execution results
10. **VerificationRun** — Structured verification of execution correctness
11. **StateCommit** — Atomic commit that advances asset head
12. **CostRecord** — Persisted cost tracking per transaction

## State Machine

### Transaction Lifecycle

```
DRAFT → PREPARED → READY → EXECUTING → VERIFYING → VERIFIED → COMMITTED
                   ↓          ↓          ↓
                   REPAIRING ←┘          ↓
                              ↓          ↓
                              FAILED → ABORTED
```

### Valid Transitions

| From | To |
|------|-----|
| DRAFT | PREPARED, ABORTED |
| PREPARED | READY, ABORTED |
| READY | EXECUTING, ABORTED |
| EXECUTING | VERIFYING, FAILED, ABORTED |
| VERIFYING | VERIFIED, REPAIRING, FAILED, ABORTED |
| REPAIRING | EXECUTING, FAILED, ABORTED |
| VERIFIED | COMMITTED, ABORTED |
| COMMITTED | (terminal) |
| FAILED | ABORTED |
| ABORTED | (terminal) |

Invalid state transitions fail explicitly.

## Commit Invariants

COMMIT is impossible unless:
- Transaction is VERIFIED
- Required evidence exists
- Verification passed
- Patch is authorized (no HARD_LOCK violations)
- Base version still equals current asset head (stale write protection)
- Transaction has not previously committed
- Resulting version can be created atomically

## Rollback Semantics

Rollback does not delete history. It creates a new AssetVersion whose state is derived from a previous approved version and records provenance.

## Database Schema

### Tables

- `projects` — Project records
- `assets` — Mutable assets with current version reference
- `asset_versions` — Immutable version history
- `outcome_transactions` — Transaction records with status
- `partial_intents` — Partial intent records
- `transaction_patches` — Semantic patch operations
- `mutation_leases` — Authorization leases
- `execution_runs` — Execution records
- `evidence_receipts` — Evidence receipts
- `verification_runs` — Verification records
- `state_commits` — Commit records
- `cost_records` — Cost tracking

### Row Level Security

All tables have RLS enabled. No anon/authenticated policies are created. All reads and writes go through server-side repositories using the service role.

## Future Provider Integration Points

The `ExecutorPort` interface is the integration point for real media providers:

```typescript
export interface ExecutorPort {
  readonly name: string;
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}
```

The `FakeExecutor` is the deterministic initial implementation. Real providers (image generation, video, etc.) will implement this interface.

## Known Limitations

1. No image/video generation integration yet
2. No marketplace functionality
3. No payment system
4. No creator system
5. No external orchestration frameworks
6. Single executor per transaction (no parallel execution)
7. No retry logic for failed executions
8. No notification system for transaction status changes

## File Structure

```
src/
  domain/outcome/
    index.ts
    project.ts
    asset.ts
    asset-version.ts
    outcome-transaction.ts
    partial-intent.ts
    semantic-patch.ts
    mutation-lease.ts
    execution-run.ts
    evidence-receipt.ts
    verification-run.ts
    state-commit.ts
    cost-record.ts
  application/
    outcome/
      outcome-transaction-service.ts
    ports/
      outcome/
        executor-port.ts
    ports/repositories.ts (updated)
  infrastructure/
    executors/
      fake-executor.ts
    persistence/
      outcome/
        in-memory-outcome-repositories.ts
        supabase-outcome-repositories.ts
  tests/
    outcome/
      outcome-transaction-kernel.test.ts
supabase/migrations/
  20260810000000_build_002_outcome_transaction_kernel.sql
```

## Quality Gate Results

- ✅ lint — 0 errors, 0 warnings
- ✅ typecheck — 0 errors
- ✅ tests — 59 passed (44 existing + 15 new)
- ✅ build — production build successful
