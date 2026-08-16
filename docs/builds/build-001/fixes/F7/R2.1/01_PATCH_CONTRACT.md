# R2.1 patch contract

## Vulnerable path

1. Caller supplies `commandId` and the complete `commandRegistry` definition.
2. The public factory creates an authorized local runner around that registry.
3. The runner executes the caller-selected executable/argv and records the caller's ID.
4. Qualification accepts the receipt when the criterion lists that ID, without an authoritative definition-hash comparison.

## Security invariant

Callers may request an exact command ID, but cannot define or replace its executable, argv, working-directory policy, or other execution semantics. Authoritative evidence must bind the criterion and receipt to the same repository-controlled command-definition hash actually executed.

## Narrow enforcement boundary

- keep authoritative definitions as immutable checked-in assurance code;
- remove command-registry input from the public factory;
- hash canonical command semantics using SHA-256;
- bind criteria to exact command ID/hash pairs;
- have the runner derive executable, argv, cwd policy, and hash from the registry;
- verify the receipt against both the criterion binding and current authoritative definition;
- preserve direct `spawn` execution with `shell: false` and fail closed on unknown or non-exact IDs.

## Preserved behavior

R1 semantic matching, R1.1 independence, R2 issuance records, actors, contexts, Git state, dirty-tree/TOCTOU handling, artifact containment/digests, receipt mutation/replay protection, process-local authority, CRLF canonicalization, action pins, F1, and F2 must remain unchanged. Historical evidence remains `DECLARED_ONLY` and receives no provenance upgrade.
