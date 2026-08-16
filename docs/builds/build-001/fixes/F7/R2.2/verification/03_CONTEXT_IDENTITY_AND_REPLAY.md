# Context Identity and Replay

Equivalent caller-owned objects do not inherit authority. Independent checks covered shallow copies, deep copies, manually recreated objects, same-`contextId` objects, and proxies. Every copied or recreated context returned `NOT_PROVEN`.

Runner A context with runner B evidence, and runner B context with runner A evidence, both returned `NOT_PROVEN`. A manual receipt with a fresh evidence ID remained `NOT_PROVEN` even when evaluated with runner A's legitimate context.

The original context plus its own legitimate runner-issued receipt returned `PROVEN`. This demonstrates exact object identity without making the visible ID an authority token.
