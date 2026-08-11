# Future Seller Supply Chain — Required Controls

Status: [PLANNED], not implemented.

Blueprint JSON authored by a future seller is untrusted data. Executable seller code, binaries, containers, model weights, scripts, remote URLs, and dependency manifests are prohibited by the current platform. This document defines the minimum gate before that boundary can ever be opened; it does not authorize implementation or execution.

## Curated intake lifecycle

1. `manifest`: establish seller identity, ownership/license assertions, support/contact, requested capabilities, dependencies, build instructions, deliverables, and immutable submission ID.
2. `normalization`: canonicalize paths/encodings/metadata and strictly validate the declarative Blueprint and manifest against supported schemas.
3. `secret scan`: reject credentials, tokens, private keys, signed URLs, and undeclared sensitive configuration before build or storage promotion.
4. `SBOM`: generate a versioned software bill of materials for every executable/dependency-bearing artifact.
5. `dependency analysis`: check pinned versions, provenance, license, malware/advisory risk, mutable URLs, typosquatting, and transitive dependencies.
6. `isolated build`: build only in an ephemeral identity/sandbox with read-only inputs, no ambient control-plane credentials, deny-default egress/filesystem, and resource limits.
7. `tests`: run deterministic schema/lint/unit/integration/security fixtures, including FIXED conflicts, prompt injection, stale specs, fake DONE, forbidden capabilities, and expected-success cases.
8. `dynamic checks`: execute only in quarantine with syscall/network/file/resource observation and no production data or credentials.
9. `provenance`: retain source, SBOM, builder identity/version, dependency resolution, test results, artifact digest, and reviewer decision.
10. `signature`: sign/attest the exact approved immutable artifact digest with a protected platform publication key.
11. `platform policy`: independently enforce capability, secret, MIME, budget, ownership, privacy, and revocation requirements; a valid signature does not imply policy acceptance.
12. `Outcome conformance`: replay the exact Blueprint/Task Spec criteria across representative and adversarial cases, including same-spec evidence binding.
13. `immutable publication`: publish a new version/hash only after curated approval; never mutate an already published version.
14. Promote through development, quarantine, curated review, limited release, and general availability with explicit rollback/revocation.

## If executable artifacts are ever proposed

They require a separately approved design with isolated build and runtime identities; ephemeral filesystems/sandboxes; read-only base images; no ambient credentials; deny-by-default network egress and filesystem; syscall/capability restrictions; CPU/memory/time/output quotas; pinned dependencies and lockfiles; SBOM; provenance attestation; secret/SAST/dependency/malware/license scans; reproducible builds where possible; signed artifacts; runtime audit logs; emergency kill switch; and per-version revocation. Any necessary provider access must use short-lived, outcome-scoped credentials minted outside the sandbox and revocable independently. Seller code must never execute in the Next.js process or with Supabase service-role/control-plane credentials.

## Ongoing governance

- Re-review on every version; approval does not transfer automatically.
- Retain hashes, reviewer decision, scanner versions/results, fixtures, evidence, and disclosure history.
- Monitor failure/acceptance/cost/security signals without silently changing published behavior.
- Suspend and revoke compromised versions while preserving historical transaction evidence.
- Treat transitive dependency, build service, signing key, reviewer account, and seller account compromise as supply-chain incidents.

## Explicit non-claims

The repository contains no marketplace UI, seller portal, sandbox, artifact signer, payout mechanism, or production Blueprint publication service. Passing schema tests does not make seller content safe to execute.
