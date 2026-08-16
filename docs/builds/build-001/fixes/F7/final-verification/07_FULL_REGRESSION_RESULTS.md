# Full Regression Results

All deterministic gates requested by F7-V2 passed from the clean candidate
worktree:

| Gate | Result |
| --- | --- |
| assurance composition matrix | passed |
| `tests/assurance` | 7 files, 92/92 passed |
| security + assurance | 13 files, 139/139 passed |
| `pnpm test:sql` | 7/7 passed |
| `pnpm test:model` | 30/30 passed |
| `pnpm test:application` | 9/9 passed |
| complete Vitest (`--testTimeout=30000`) | 47 files passed, 5 skipped; 434 passed, 11 skipped |
| TypeScript (`tsc --noEmit`) | passed |
| ESLint | passed |
| assurance manifest check | passed; manifest current |
| production Next build | passed; 19 static pages generated |

The full Vitest skip count is expected for environment-gated tests. No remote
E4 lane was activated. The worktree was clean after the temporary harness was
removed and before documentation was added.
