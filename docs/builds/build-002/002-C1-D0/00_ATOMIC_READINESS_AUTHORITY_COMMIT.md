# BUILD 002-C1-D0 Atomic Readiness Authority Commit

C1-D0 adds the first durable authority boundary above BUILD 002-B history.
Dependency snapshots, qualifications, and readiness rows remain immutable
historical artifacts until they are linked by an immutable
`build002_readiness_authority_commits` marker.

The marker is created only by the `service_role` SECURITY DEFINER RPC
`build002_commit_readiness_authority`. The function locks the active tenant,
the principal membership, the PREPARED outcome transaction, the source asset,
and the source asset version. It then revalidates the C0 binding and published
catalog, compares the complete canonical requirement and signal graph with
the current database state, reuses or inserts immutable graph rows, and writes
the authority marker last in one PostgreSQL transaction. Any error rolls back
the whole function call.

C1-D0 never changes `OutcomeTransaction.status`, never writes Signals, never
calls execution or delegation policy, and does not expose an HTTP route. A
successful commit proves authority at the database commit instant only;
later changes can make the marker stale and must be revalidated by C1-D1.

The application port accepts trusted internal material only. Its adapter
validates the BUILD002 domain hashes and current evaluator, performs one RPC,
and reads back the marker and linked artifacts. It does not accept a `Request`
or caller-supplied authority callback.
