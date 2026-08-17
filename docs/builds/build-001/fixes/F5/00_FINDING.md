# BUILD 001-F5 Finding

## Baseline

- Parent: `9f977fc5f83ebcf48b0316edec79d9ba7edb1520`
- Branch: `codex/build001-f5`
- F1, F2, F4 and F7 are preserved from the F4-verified durable state.

## Finding

Privileged Field Beta and outcome repositories used the legacy `tenant_id`
locator as a read filter even though canonical Build 001 ownership is stored
in `owner_tenant_id` and constrained by lineage triggers. With a service-role
client, a caller-controlled tenant locator could therefore select a different
tenant's canonical row whenever the duplicated legacy value disagreed with the
canonical owner.

The same unscoped repository bundle was used by the preservation runner. This
made descendant lookup and mutation depend on caller-supplied IDs without a
canonical owner predicate.

## Security invariant

Privileged access must derive and enforce one ownership authority. Legacy
`tenant_id` remains compatibility metadata only and cannot authorize a read,
write, evidence association, or state transition.
