# C5 Negative Controls

The C0 implementation must prove at least these 16 controls:

1. Caller cannot mint a Blueprint hash.
2. Caller cannot mint a Profile hash.
3. Caller cannot submit canonical SignalRequirements.
4. Profile with wrong Blueprint hash is rejected.
5. Profile referencing a missing Blueprint is rejected.
6. Profile version-chain mismatch is rejected.
7. Foreign-tenant transaction binding is rejected.
8. Wrong Blueprint/Profile pair is rejected.
9. Published Blueprint UPDATE is rejected.
10. Published Profile UPDATE is rejected.
11. Transaction binding UPDATE is rejected.
12. Duplicate conflicting requirement definitions are rejected.
13. Same compiler input yields the same definition hashes.
14. Requirement order permutation yields the same semantic set/hash.
15. Client-declared `OBSERVED` has no authority over requirement source.
16. TaskSpec strings cannot become requirement source; retired/invalid source
    cannot compile authoritative current requirements.

Native PostgreSQL tests must distinguish ACL denial, foreign-key/lineage
rejection, immutable-trigger rejection, and hash validation. Authenticated
HTTP tests must prove that body/query/header authority fields cannot override
the server binding. BUILD002-A/B invariants remain regression gates and are
not rewritten by C0.
