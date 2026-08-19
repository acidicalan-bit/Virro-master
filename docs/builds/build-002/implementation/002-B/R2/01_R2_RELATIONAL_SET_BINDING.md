# BUILD 002-B R2 Relational Set Binding

Qualification links are derived from `build002_dependency_signals`, not duplicated JSON references alone. The relational signal triples must match the qualification's independent signal ID and content-hash sets; links are inserted from the exact relational rows.

Readiness derives the expected requirement set from `build002_dependency_requirements`. The selected qualification IDs must be unique, have the same tenant, transaction, dependency ID and dependency hash, have the same cardinality as the dependency requirement set, and cover every requirement hash exactly.

The SQL boundary does not reimplement the BUILD002 canonical SHA algorithm. The repository verifies domain hashes and computes `requirementSetHash` and `qualificationSetHash` before calling the RPC. PostgreSQL enforces relational identity and completeness. This is the explicit distinction between `DB_ENTRYPOINT_ENFORCED_ATOMICITY` and `SERVER_DOMAIN_REQUIRED` hash semantics.
