# BUILD 001-F7-R2 - Attack reproduction

## Before patch

A persistent focused test constructed a schema-valid receipt with copied build/spec/criterion semantics, fake actor/context IDs, claimed `pnpm test:sql` PASS, source SHA metadata, and nonexistent artifact. At baseline `0c3465b5f288d90fad7dd2ae2150146da7352a70`:

```text
expected NOT_PROVEN
received PROVEN
1 failed
```

## After patch

The retained matrix uses real temporary Git repositories and child processes. It rejects:

- a syntactically perfect manual runner forgery and unauthorized registry enrollment;
- fake actor/context IDs after issuance;
- stale HEAD and dirty source;
- missing, replaced, absent-required, unsafe, or mutated artifacts;
- result, actor, context, command, artifact, source SHA, and criterion hash mutation;
- insufficient or locally modeled CI provenance;
- caller-selected commands outside the registry.

The same boundary positively issues and qualifies clean local runner evidence and derives command FAIL from a nonzero observed exit.
