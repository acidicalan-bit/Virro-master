# R2.1 independent reverification input

Reverify the R2.1 result commit from a clean worktree whose parent is `ff5612f8048ffe43150b21aa69ae03a0c442bfe8`.

## Required attacks

1. Attempt to pass a custom registry to the public factory and rebind `test:sql` to a surrogate process. Require no surrogate authoritative receipt.
2. Use the correct ID with a wrong command-definition hash. Require `NOT_PROVEN` specifically for hash mismatch.
3. Mutate a legitimate receipt's executable and argv while copying its ID/hash. Require integrity/observation rejection.
4. Try unknown, case-changed, alias, and whitespace command IDs. Require exact fail-closed lookup.
5. Try a test-only custom registry. Require no `RUNNER_RECORDED` authority.
6. Change argv or package-script semantics while retaining the old criterion binding. Require `NOT_PROVEN`.
7. Confirm a definition hash is stable under property ordering and changes with material execution semantics.

## Positive controls

1. Run the checked-in self-test through the actual authoritative runner and require matching ID/hash/executable/argv/cwd plus `PROVEN`.
2. Run the real SQL lane and require Node to execute the canonical Vitest argv, exit 0, emit a matching receipt, and produce `PROVEN`.
3. Re-run R2 receipt/source/artifact attacks, R1 semantics and independence, F1 SQL, F2 handler, complete tests, TypeScript, ESLint, manifest, and production build.

## Declared limits

The local runner does not provide external actor authentication, durable cross-process issuance, protected signing, CI attestation, remote E4 proof, or defense against the same local user replacing the runtime/dependency filesystem. These limits must remain explicit and fail closed where authority is absent.
