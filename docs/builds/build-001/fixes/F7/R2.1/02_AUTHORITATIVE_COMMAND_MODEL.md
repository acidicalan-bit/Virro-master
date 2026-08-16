# R2.1 authoritative command model

## Repository-controlled definitions

The assurance module owns a private immutable registry. The public runner factory accepts only `repositoryRoot` and `issuerId`; it no longer accepts executable, argv, or registry input.

Each definition contains:

- exact `commandId`;
- executable selector (`NODE_RUNTIME`);
- structured `argv`;
- `REPOSITORY_ROOT` working-directory policy;
- optional exact package-script binding.

The current authoritative commands are the real `test:sql` lane and two narrowly defined runner self-checks used to exercise PASS/FAIL provenance behavior. Unknown, case-changed, aliased, or whitespace-modified IDs fail closed.

## Definition hash and requirement binding

`createAuthoritativeCommandDefinitionHash` applies SHA-256 to canonical JSON for the complete definition. Property order does not affect the hash; argv or package-script changes do. Unsupported cwd/executable policies fail schema validation.

Runner criteria now use `acceptedRunnerCommands`, containing exact `{ commandId, commandDefinitionHash }` pairs. The criterion-definition hash covers those pairs. ID equality without definition-hash equality produces `COMMAND_DEFINITION_HASH_MISMATCH` and `NOT_PROVEN`.

## Receipt and authority verification

The runner derives the definition and records command ID, definition hash, resolved executable, argv, cwd policy, timestamps, output digests, and exit code. Receipt integrity covers all fields. Qualification re-resolves the private definition and compares its hash, executable, argv, and cwd policy with the issued receipt.

## Package and environment relationship

`test:sql` executes the Node runtime directly against Vitest with the same argv represented by `package.json`. Before execution, the runner verifies the exact `scripts.test:sql` value; that expected script is also command-hashed. Changes to `package.json` additionally change Git source state.

The executable is `process.execPath`, so PATH cannot select another binary. Execution remains `shell: false` with repository-root cwd. `NODE_OPTIONS` and `NODE_PATH` are removed from the child environment. Replacing the runtime, dependencies, or filesystem as the same local user remains outside local authenticity and is not overclaimed.
