# Reverification Input

Independent verification must start from the authored D4-R0 candidate SHA and
apply the migration chain to a fresh PostgreSQL 17 database. It must seed a
valid immutable `field_outcomes.task_spec_snapshot`, D0 marker, D3 admission,
and C0 graph, then prove positive issuance, retry identity, TaskSpec/hash /
capability tamper rejection, stale currentness rejection, lock serialization,
and zero execution side effects. Remote Supabase state remains
`NOT_PROVEN` unless separately authorized.
