# BUILD 002-C Trust Map: Purpose and Invariant

Baseline: `f9e98b2cf4b049b92353369fd8bf276074a9998b` (post-BUILD002-B main).

BUILD002-C is architecture only. It must define the server boundary that
turns authenticated caller material into a tenant-rooted readiness graph.
No runtime, migration, API, executor, UI, or TaskSpec code is introduced by
this map.

## Primary invariant

The caller may submit candidate work/context material. The caller may not
authoritatively choose tenant, transaction ownership, provenance, requirement
definition hash, signal content hash, dependency hash, qualification outcome,
readiness state, readiness content hash, or execution authority.

The server must derive or validate those values from authenticated authority,
the canonical transaction, a versioned requirement source, deterministic
BUILD002-A functions, and the BUILD002-B persistence boundary. No supported
HTTP path may persist `READY` from a caller-declared `READY` value.

## Trust path

`Supabase Auth principal -> active tenant membership -> active tenant -> owned OutcomeTransaction -> canonical Blueprint/version/policy -> compiled requirements -> server-classified Signals -> DependencySnapshot -> deterministic Qualifications -> aggregated DelegationReadiness -> immutable BUILD002-B persistence`.

The map is complete for current repository choke points. C5 is blocked because
the canonical Blueprint-to-transaction requirement source is not present as a
server-backed repository in this baseline.
