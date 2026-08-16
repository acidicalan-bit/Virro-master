# BUILD 001-F7-R1.1-V - Full regression results

## Passed commands

- independent temporary adversarial matrix: 28/28;
- persistent R1.1 test: 13/13;
- R1 semantic test: 16/16;
- `pnpm test:assurance`: 50/50;
- `pnpm test:sql`: 7/7;
- `pnpm test:model`: 30/30;
- `pnpm test:application`: 9/9;
- `pnpm test:security`: 97/97;
- `pnpm test`: 392 passed, 11 skipped (44 files passed, 5 skipped);
- `pnpm typecheck`: passed;
- `pnpm lint`: passed;
- `pnpm build`: passed, 19 static pages generated.

The temporary adversarial test was removed after execution. No implementation was changed.

## Manifest check note

The manifest test inside `pnpm test:assurance` proves semantic equality between the checked-in JSON and `createAssuranceManifest`. The additional byte-level `pnpm assurance:check` command reports stale on this clean Windows checkout because Git converted all 2,629 JSON line endings to CRLF while the generator serializes LF. `git status` remains clean and the mismatch is only EOL serialization. This is a pre-existing cross-platform determinism limitation, not an alternate qualification path or independence authority.
