# D4-R0 Contract

`build002_grant_execution_authority` is a SECURITY DEFINER, service-role-only
operation. Selectors are limited to principal, membership, admission,
TaskSpec ID, and TaskSpec hash. The server locks and revalidates all current
material, reads the immutable TaskSpec snapshot, intersects its capability
grant with the published Blueprint policy, sorts and deduplicates it, and
persists one append-only authority fact. Mutation paths are always empty.

The D4 fact is an authority marker only. It does not create an executor,
MutationLease, ExecutionRun, EvidenceReceipt, StateCommit, provider call, or
transaction status transition. Currentness after commit remains a later
revalidation concern.
