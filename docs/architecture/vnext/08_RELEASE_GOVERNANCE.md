# Release Governance Observation

## Current observation

BUILD 001 reached `main` at the exact approved SHA through a local
`merge --ff-only` and normal push. The candidate branch remained unchanged.
That proves the release procedure used for this promotion, not the existence
of GitHub branch protection.

## RELEASE_GOVERNANCE_DECISION

Before BUILD 002 implementation, require the repository to have:

1. Protected `main` with PR-only changes.
2. Required assurance, typecheck, lint, test and build checks on the PR.
3. No force-push permission for release branches or `main`.
4. Explicit status checks for the relevant remote/RLS gate when a build claims
   remote proof.
5. A release candidate SHA/tree recorded in the PR and verified after merge.

This gate does not modify GitHub settings. If the repository is currently
unprotected, classify that as a governance gap before BUILD 002, not as a
product trust failure in BUILD 001.

## Product boundary

Governance controls protect the provenance of implementation and verification;
they do not replace tenant authority, evidence qualification, or the commit
RPC. Required checks must remain evidence producers and must not be satisfied
by manually edited status artifacts.
