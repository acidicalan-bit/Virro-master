# F4 Patch Contract

## Required Invariants

1. A canonical commit uses current database authority, not a historical
   `AuthorityContext`, lease or client role.
2. Revocation committed before authorization is observed denies the commit.
3. A revocation that starts after authorization has linearized waits for the
   canonical transaction and may complete afterward.
4. Authorization denial creates no AssetVersion, head movement, StateCommit or
   false `COMMITTED` status.
5. A currently authorized OWNER and currently authorized accepting OWNER remain
   able to complete the supported path.

## Selected Implementation

The F4 migration renames the existing F1 function to the private
`commit_accepted_field_outcome_unlocked(uuid)` implementation and installs a
same-signature `SECURITY DEFINER` wrapper. The wrapper obtains `auth.uid()`,
reads the outcome and acceptance actor, locks the ACTIVE tenant, then locks all
relevant ACTIVE OWNER membership rows in stable membership-ID order. It calls
the F1 implementation only after those locks succeed.

The old implementation is revoked from `public`, `anon` and `authenticated`.
Only the wrapper remains granted to `authenticated`.

## Non-Goals

No new service, signature, authority subsystem, F5 identity migration, F6
verifier policy, F3 immutability change or remote E4 operation was introduced.
