# C5 Compiler and Persistence Plan

## Pure compiler

The implementation should add a pure function aligned with existing domain
hashing:

```text
compileSignalRequirements({ requirementProfile, createdAt })
  -> SignalRequirement[]
```

It must use `compileSignalRequirement()` rather than duplicate canonical hash
logic. Each result inherits the Profile's exact Blueprint id/version/hash,
nullable policy id/hash, and requirement semantics. `createdAt` is excluded
from `requirementDefinitionHash`.

## Compiled set

The ordered set of compiled `requirementDefinitionHash` values is normalized
and sorted. A `compiledRequirementSetHash` is optional and should be added only
if an actual binding or persistence boundary needs a set-level digest; the
individual existing requirement hashes remain authoritative for BUILD002-B.

## Resolution flow

```text
authenticated principal
 -> active tenant authority
 -> tenant-scoped OutcomeTransaction
 -> immutable TransactionRequirementBinding
 -> exact published Blueprint (verify hash/status/chain)
 -> exact published RequirementProfile (verify hash/status/Blueprint FK)
 -> compile SignalRequirements
 -> BUILD002-C evaluation
 -> BUILD002-B persistence
```

No caller-supplied requirement is accepted at any step.

## Future implementation sequence

- **C0-A:** domain Profile and compiler artifacts.
- **C0-B:** immutable system Blueprint/Profile persistence and read models.
- **C0-C:** tenant-scoped immutable TransactionRequirementBinding.
- **C0-D:** server resolver and authority boundary.
- **C0-E:** native RLS, immutability, lineage, hash, and concurrency proof.
- **C0-R:** remote proof only when required.

The smallest fixture is one system-owned published precision-edit Blueprint,
one matching Profile with explicit readiness requirements, and one tenant-owned
transaction binding. It does not add marketplace publication or connectors.
