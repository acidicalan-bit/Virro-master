# Serialized Current Material

`SerializedDelegabilityRecheckMaterial` is constructed only by the server
from the canonical transaction, asset, source-version, C0 binding, dependency
snapshot, and evaluator resolvers. It is never accepted as public input. The
RPC locks authoritative rows before comparing every serialized field and
dependency set.
