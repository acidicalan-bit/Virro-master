# BUILD 001-F7-R2 - Reverification input

## Baseline and scope

- baseline: `0c3465b5f288d90fad7dd2ae2150146da7352a70`;
- verify development assurance source, manifest/generator, assurance workflow pins, tests, and R2 documentation only;
- confirm no product EvidenceReceipt, runtime route/component, Supabase, migration, F3-F6, or E4 execution change.

## Required adversarial replay

1. Build a perfect manual `RUNNER_RECORDED` JSON object without the live runner authority; require `NOT_PROVEN`.
2. Attempt to call the exposed authority registration method without its private capability.
3. Mutate result, actors, contexts, command, artifact, source SHA, and criterion hash after issuance, recomputing the public receipt digest; require rejection.
4. Advance HEAD and separately dirty the tree; require stale/dirty rejection.
5. Delete and replace the exact artifact; require rejection.
6. Attempt traversal/outside-root artifact paths and unregistered commands.
7. Run the legitimate local positive control and confirm it is only `RUNNER_RECORDED`, not externally attested.
8. Confirm modeled `CI_ATTESTED` and all E4 requirements remain `NOT_PROVEN` without real authorities.
9. Replay all R1 semantic/independence attacks and F1/F2 positives.
10. Re-run manifest CRLF semantic stability and full deterministic regression.

## Non-claims

Local actor authenticity, protected signing, GitHub execution, CI artifact attestation, and remote E4 evidence are not proven by R2.
