# PORTABILITY-000 Independent Runtime / Provider Independence Verification

## Frozen product

- Product branch: `foundation/portability-000-container-runtime`
- Product SHA: `935c568ab273f9adae8c23785a77191e676e82c4`
- Product tree: `9cfedfb381bd84e0edbdd0beca397f70df203f5e`
- Canonical base: `d8e31040b5479cecc52971e9d0efc9da2628eb04`
- Verifier branch: `verify/portability-000-runtime-independence`

The verifier changes are restricted to `scripts/verifier/portability-000/`,
`tests/verifier/portability-000/`, this document, and the verifier-only
workflow. No product file is changed by the verifier.

## Independent findings

### F1: unregistered production environment usage

Independent recursive source discovery found these production environment
variables, absent from `scripts/portability/environment-contract.json`:

- `LLM_API_KEY` in `src/infrastructure/models/model-factory.ts`
- `LLM_MODEL` in `src/infrastructure/models/model-factory.ts`

Expected: `UNREGISTERED_SOURCE_ENV_USAGE_COUNT=0`.
Observed: `2`.

This is hidden configuration coupling. It is outside the verifier scope to
repair.

### F2: hidden environment attack is accepted

Disposable fixture mutation:

```ts
export const hidden = process.env.PORTABILITY_HIDDEN_RUNTIME_CONFIG;
```

The variable is absent from `.env.example`, the canonical JSON inventory, and
the human-readable document. Expected `pnpm portability:check` failure;
observed exit status `0`.

Affected contract: source environment usage ratchet and hidden environment
attack. The product checker does not currently inspect production source
environment access.

## Independent results

- Portability delta from canonical base: 16 files.
- D0-D2 implementation files changed: none.
- Product semantics changed: no.
- Secret classification invariant: pass.
- Synchronized secret downgrade attacks: pass.
- Future secret-name attacks: pass.
- Public exception positives: pass.
- Domain Supabase/Vercel/Next/OpenAI dependencies: zero.
- Application Supabase dependency: one frozen baseline path.
- Baseline debt byte identity: pass.
- Provider register vocabulary and required terms: pass.
- Health endpoint is process-liveness-only: pass by static inspection.
- `SINGLE_IMAGE_MULTI_ENV`: `NOT_YET_PROVEN`.

OCI and full regression evidence is produced by the verifier-only workflow at
the final verifier SHA. No product merge, promotion, C1-D3 work, or provider
migration is performed.

## Verdict

`PORTABILITY_000_VERIFICATION_FAILED`

The failure is caused by F1 and F2 above. The verifier branch intentionally
does not repair the product.
