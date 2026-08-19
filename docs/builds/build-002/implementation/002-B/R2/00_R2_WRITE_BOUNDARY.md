# BUILD 002-B R2 Write Boundary

R1's independent verification reproduced a service-role parent-only graph through direct table INSERT. R2 closes that boundary without rewriting R1 history.

The nine authoritative BUILD002 tables revoke INSERT from `service_role`, `authenticated`, and `anon`. Productive writes enter only through five narrow RPCs:

- `build002_insert_signal_requirement`
- `build002_insert_signal`
- `build002_insert_dependency_snapshot`
- `build002_insert_signal_qualification`
- `build002_insert_delegation_readiness`

All five functions are `SECURITY DEFINER`, use `SET search_path = pg_catalog, public`, use fixed fully-qualified tables, and are executable only by `service_role`. Requirement and Signal are single-row writes; Dependency, Qualification, and Readiness write their required lineage in one transaction.

The resulting boundary is `DB_ENTRYPOINT_ENFORCED_ATOMICITY` for the production service-role surface. A migration owner or superuser remains infrastructure authority and is not part of this claim.
