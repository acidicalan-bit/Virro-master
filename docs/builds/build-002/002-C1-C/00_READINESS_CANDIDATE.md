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
