# F1 And F2 Regression

The required real-boundary regression lanes passed:

| Lane | Command | Result |
| --- | --- | --- |
| F1 real SQL | `pnpm test:sql` | 1 file, 7/7 passed |
| model trust foundation | `pnpm test:model` | 1 file, 30/30 passed |
| F2 application/route isolation | `pnpm test:application` | 1 file, 9/9 passed |

F1 remains closed at the local PostgreSQL boundary and F2 remains closed for
the tested application route isolation. These local results do not claim
deployed Supabase RLS, Auth, Storage, CDN, service-role or remote concurrency.

The manifest retains the historical pre-F1 real-SQL failure and the current
post-F1 pass without contradiction.
