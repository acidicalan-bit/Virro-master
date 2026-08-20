# BUILD 002-C1-C Readiness Candidate

This phase resolves a server-owned, in-memory qualification and readiness
candidate from the C0-D requirement authority, the complete C1-A signal
universe, and the C1-B dependency snapshot.

The resolver takes one trusted evaluation instant and uses it for every
qualification and for the readiness record. Requirements, signals, evaluator
identity, tenant, transaction, dependency hash, and readiness subject are all
derived from those trusted inputs. Request body, query, headers, historical
qualifications, policy state, and caller-supplied clocks have no authority.

The result is deeply immutable and is explicitly marked
`NON_ATOMIC_CANDIDATE_EVALUATION`. C1-C performs no execution, provider call,
delegability decision, transaction status transition, or persistence. A later
phase must own any atomic commit and operational authorization.

The native E3 test applies all repository migrations once to disposable
PostgreSQL 17, exercises a positive READY candidate, and checks that the
database remains write-free.

The focused matrix covers C1-C1 through C1-C30: positive READY, zero-signal
MISSING, UNKNOWN, incompatible provenance, contradiction, human review,
future evidence, invalid windows, expired evidence, stale dependency,
requirement/universe mismatch, dependency hash mismatch, tenant and
transaction mismatch, duplicate and omitted references, evaluator/time
replay, order stability, exact subject binding, hash checks, deep immutability,
caller-request injection, and the no-write/no-delegability boundary.

## R1 Repair

C1-C-R1 compares the authoritative and snapshot requirement-definition hash
sets independently of requirement ID order. The authored alpha/beta
counterexample records `R1_COUNTEREXAMPLE_PRE_FIX=FAIL` on the original
candidate and `R1_COUNTEREXAMPLE_POST_FIX=PASS` here. Duplicate authoritative
definition hashes remain malformed and fail closed.

The native E3 fixture persists a tenant, project, asset, current version,
transaction, C0 catalog/binding artifacts, and BUILD002 signal material in a
fresh PostgreSQL 17 database. Candidate evaluation remains read-only; row
counts and transaction status are compared before and after both READY and
non-READY evaluations.

C1-C adds internal application/server assurance capability, so
`APPLICATION_RUNTIME_CHANGED=YES_INTERNAL_C1_C`; it adds no HTTP route,
migration, persistence, execution, or C1-D behavior.
