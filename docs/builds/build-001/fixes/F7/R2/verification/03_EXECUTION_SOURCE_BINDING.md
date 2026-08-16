# Execution and source binding

## Process result and shell behavior

A nonzero process exit produced `FAIL` and claim status `FAILED` despite a caller-supplied extra `result: PASS` property. Missing executables produced no receipt, and unregistered IDs threw `UNAUTHORIZED_RUNNER_COMMAND`. Static inspection confirmed `spawn(executable, args, { shell: false })`; no runner command concatenation or implicit shell quoting was found.

The command identity failure is separate: execution is observed correctly, but an accepted display ID can be mapped by the caller to an unrelated observed executable and argv.

## Git source state

- A receipt issued at revision A became `NOT_PROVEN` after advancing to B.
- Restoring the exact clean commit A made it valid again, as expected for commit-state rather than custody semantics.
- Creating a new branch and using detached HEAD at the same SHA preserved validity.
- Malformed baseline SHA failed schema validation; a well-formed non-ancestor SHA failed `BASELINE_NOT_ANCESTOR`.
- Modified tracked, staged tracked, and untracked files all failed issuance and qualification.
- A command that committed a source change during execution was rejected with `SOURCE_REVISION_CHANGED`.

`git status --porcelain=v1 --untracked-files=all` defines dirty state. Source observation occurs before and after the command. A same-SHA clean restoration is intentionally accepted; branch names are not authority.

## Actors, contexts, and lifetime

Caller-supplied actor/context extras were ignored. Actors were derived from the configured local issuer namespace, and execution/gate contexts used distinct UUIDs. Two executions produced different context IDs. The `issuerId` itself remains caller-selected and is only a local logical identity, not external authentication.

The issuance registry is process-local. A receipt from runner/process A returned `NOT_PROVEN` under a new runner/process authority, which is fail-closed and consistent with the documented limit.
