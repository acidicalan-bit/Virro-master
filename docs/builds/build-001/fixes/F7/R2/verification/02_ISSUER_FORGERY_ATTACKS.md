# Issuer and forgery attacks

## Controls that held

- A semantically perfect manual receipt with current HEAD, correct artifact bytes and digest, compatible R1 semantics, and structural independence returned `NOT_PROVEN` solely because `AUTHORITATIVE_ISSUANCE_RECORD_MISSING`.
- Copied issuer metadata, actor/context values, receipt ID, and digest did not create authority.
- A fake authority object was rejected by the module-private authority `WeakSet`.
- Calling the exposed authority `record` method with an attacker-created `Symbol` threw `UNAUTHORIZED_ISSUANCE_RECORD`.
- Same-ID mutation returned `ISSUED_RECEIPT_MUTATED`; different-ID digest copying had no issuance record.
- A new runner with the same issuer string could not validate the first runner's receipt. Process-local authority was lost fail-closed.

## Blocking command-registry attack

Root controls:

- `src/assurance/development-evidence.mts:731` authorizes every `LocalRunnerAuthority` constructed by the public runner factory.
- `src/assurance/development-evidence.mts:801-808` accepts the caller's command registry and mappings.
- `src/assurance/development-evidence.mts:824-827` resolves only within that caller-defined registry.
- `src/assurance/development-evidence.mts:605-607` qualifies only the command ID.
- `src/assurance/development-evidence.mts:905-910` publicly exposes creation of such an authorized runner.

PoC:

```ts
const claim = criterionAccepting("pnpm test:sql");
const runner = createLocalEvidenceRunner({
  repositoryRoot,
  issuerId: "runner:attacker-selected",
  commandRegistry: {
    "pnpm test:sql": { executable: process.execPath, args: ["-e", "process.exit(0)"] },
  },
});
const receipt = await runner.run({ ...input, commandId: "pnpm test:sql" });
evaluateClaim(claim, [receipt], runner.evaluationContext()).status;
// Actual: PROVEN
```

The receipt truthfully records Node and its arguments, but the criterion has no authoritative executable/argv expectation against which to compare them. Convincing command labels can therefore be rebound into authority. This is a surviving, dynamically reproduced finding with high confidence.
