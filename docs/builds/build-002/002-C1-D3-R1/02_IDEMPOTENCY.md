# Idempotency

`admissionContentHash` remains historical and includes `revalidatedAt`; it is
not the retry key. The stable identity is tenant, authority commit, principal,
and current dependency snapshot hash. The R1 wrapper serializes on the marker,
returns an exact existing fact, and prevents duplicate rows for concurrent
identical requests.
