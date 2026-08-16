# BUILD 001-F4 Verification Evidence Index

| Evidence | Location / basis | Classification |
| --- | --- | --- |
| Exact candidate and parent | Git object inspection at verification start | E1 repository identity |
| Candidate changed-file scope | `git diff --name-status fb375edd80e89f6146cb10db77da151ef1000d49..fe10cbf0ab96d20bfe8cbac8a006a13e8af1cf77` | E1 static scope |
| F4 SQL lock order and grants | `supabase/migrations/20260816090000_build_001_f4_owner_revocation_toctou.sql` | E1 static SQL |
| F1 delegate lock interaction | `supabase/migrations/20260815040000_build_001_f1_canonical_candidate_immutability.sql` | E1 static SQL |
| Stale authority review | `src/domain/auth/authority.ts`, `src/application/outcome/execution-authority.ts`, commit service/repository, field-beta route | E1 static code |
| Native PostgreSQL attempt | Local command availability and repository harness search | E2 environment |
| PGlite exclusion | Disposable shared-directory probe from prior local verification context; no shared state observed | E2 limitation |
| Concurrent schedules | No native two-session run available | E3 NOT_PROVEN |
| Regression suites | Intentionally not run because prerequisite gate blocked | Not executed |

## Final evidence boundary

This package proves the candidate identity, scope, SQL design, and lack of an exposed stale-authority input. It does not prove live PostgreSQL multi-session serialization, concurrent atomicity, or the requested F4 scenario outcomes. The correct verdict is `F4_BLOCKED`.
