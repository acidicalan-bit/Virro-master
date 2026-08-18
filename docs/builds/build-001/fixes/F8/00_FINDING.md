# BUILD 001-F8 Finding

The BUILD 001 trust migration used one trigger function for three tables with
different row shapes. Its shared boolean expression referenced `OLD` fields
that do not exist on the current table. PostgreSQL therefore rejected valid
`media_storage`, `image_evidence`, and `preservation_evidence` writes with a
record-field error before ownership validation completed.

The baseline reproduction covers all three tables. No product authorization
or tenant-isolation rule is changed by this fix.
