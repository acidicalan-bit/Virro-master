# Diff and Scope Audit

Compared range: `6454b7a30ada30800b2836298b2b04f8f25cf324..5d85eee43741b18104f3817b4418623596e83bf8`.

| Classification | Files |
|---|---|
| VERIFICATION_DEFINITION | `src/application/outcome/specification/verification-definition.ts` |
| ASSURANCE_BINDING | `src/application/outcome/specification/precision-edit-criterion-evidence.ts`; `src/application/outcome/media/preservation-verification-service.ts` |
| PERSISTENCE_BINDING | `src/domain/outcome/criterion-evidence.ts` (JSONB verifier schema compatibility) |
| TEST | `tests/outcome/criterion-machine-evidence.test.ts` |
| DOCUMENTATION | `docs/builds/build-001/fixes/F6/**` |
| UNRELATED | None found |

No runtime product route, migration, dependency, CI, or Supabase schema file changed. The candidate branch and worktree were clean before verification. The temporary counterexample test was deleted and is not part of the final diff.
