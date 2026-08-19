# BUILD 002-C0-A Domain and Compiler Record

Baseline: `aa0a25d2c5014c1efcdbc443e6366a7ef75ec3b3`.

C0-A is domain-only. It introduces `OutcomeRequirementProfile`, immutable
publication/version/hash semantics, an in-memory domain registry for proof,
and `compileSignalRequirements()` built on the existing
`compileSignalRequirement()` function.

No production persistence, migrations, repository, Supabase, HTTP route,
server resolver, transaction binding, executor, Field Beta, TaskSpec, or
BUILD002-A/B changes are included. No claim is made that runtime Virro can yet
obtain authoritative requirements; C0-B through C0-E remain pending.

The selected artifact is a system/catalog-owned immutable Profile bound to an
exact published Blueprint id/version/hash. Policy is nullable and deferred.
Requirement ordering, accepted-provenance ordering, and dependency-selector
ordering are normalized before hashing. `createdAt` is supplied to compilation
but does not enter `requirementDefinitionHash`.
