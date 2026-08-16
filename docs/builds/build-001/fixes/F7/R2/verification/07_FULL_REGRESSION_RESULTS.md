# Full regression results

All commands were executed independently from the clean candidate worktree after `pnpm install --frozen-lockfile`.

| Gate | Result |
| --- | --- |
| Independent adversarial harness | 30/30 passed; includes the command-rebinding PoC asserting observed vulnerable behavior |
| R2 focused tests | 25/25 passed |
| Assurance suite | 75/75 passed |
| Assurance plus security | 122/122 passed |
| F1 SQL lane | 7/7 passed |
| BUILD 001 model lane | 30/30 passed |
| F2 application lane | 9/9 passed |
| Complete Vitest | 45 files passed, 5 skipped; 417 tests passed, 11 skipped, zero failed |
| TypeScript | `pnpm typecheck` passed |
| ESLint | `pnpm lint` passed with zero reported errors/warnings |
| Manifest | `pnpm assurance:check` passed, including the separate CRLF reproduction |
| Production build | `pnpm build` passed; 19 static pages generated |

The official suite counts match the implementation report. Those green regressions do not test the accepted-command-ID rebinding attack and therefore cannot compensate for the failed command identity invariant.
