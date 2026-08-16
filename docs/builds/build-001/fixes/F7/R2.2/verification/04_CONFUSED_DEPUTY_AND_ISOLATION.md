# Confused Deputy and Isolation

Property injection was tested with `authority`, `verify`, registry, issuer and resolver-shaped values on public and copied contexts. The private `WeakMap` ignores all injected properties. The frozen public snapshot also rejects direct mutation.

The legitimate context cannot upgrade a semantically perfect but manually constructed receipt: it has no matching private issuance record and remains `NOT_PROVEN`.

The `WeakMap` is not exported, cannot be inserted into by callers, and is keyed only by internally issued context objects. Freeze is defense-in-depth; the security boundary is private identity lookup and private authority state.
