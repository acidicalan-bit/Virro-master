# Reverification Input

Base: `f80debf1e3ff63ee9e9d8ba322a2670e2eac8519`.

Independent verification must replay all 36 migrations on PostgreSQL 17,
exercise the cross-principal laundering case, semantic signal/requirement/
source/membership/transaction/TaskSpec drift cases, normal and concurrent
idempotent retries, direct table/RPC ACL attacks, TaskSpec immutability and
the zero-consequence boundary. It must run the existing D0-D3 suites and the
full assurance, typecheck, lint and production-build gates on this exact R1
descendant. No verifier branch is created by the implementation task.
