# BUILD 001-F7-R2 independent verification summary

## Verdict

`R2_FAILED`

Candidate `a819dd4eb29cdad621872ea6b55d7c27090b5174` was verified from a clean worktree. Its merge-base with the required baseline is exactly `0c3465b5f288d90fad7dd2ae2150146da7352a70`, the independent R1.1 verification commit.

## Blocking falsification

The command identity claim is false. `createLocalEvidenceRunner` accepts a caller-defined `commandRegistry`, and every runner created by that public factory receives a live authorized authority. Qualification checks only whether `runnerObservation.commandId` is listed by the criterion. It does not bind the accepted ID to an independently authoritative executable and argument vector.

An independent PoC registered the accepted ID `pnpm test:sql` as `node -e "process.exit(0)"`. The runner executed Node, recorded those actual arguments, issued the receipt, and `evaluateClaim` returned `PROVEN` for the criterion accepting `pnpm test:sql`.

This violates the required invariant that an execution of another program cannot be represented as authoritative evidence for an accepted command label.

## Validation rubric

- [x] Exact candidate, baseline ancestry, clean start, and scope established.
- [ ] Authoritative issuance binds command identity to an immutable trusted command definition.
- [x] Receipt, source, dirty-tree, artifact, mutation, and replay controls resisted the tested attacks.
- [x] Provenance classes, CI limits, action pins, signatures, and CRLF behavior are represented honestly.
- [x] R1, F1, F2, complete tests, TypeScript, ESLint, manifest check, and production build pass.

No implementation was changed by this verification.
