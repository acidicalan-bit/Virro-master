type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: number; mode: "distributed" | "memory" };
const localAttempts = new Map<string, { count: number; resetAt: number }>();

export async function checkPublicRateLimit(identifier: string, now = Date.now()): Promise<RateLimitResult> {
  const limit = Number(process.env.AUDIT_REQUEST_RATE_LIMIT || 5);
  const windowSeconds = Number(process.env.AUDIT_REQUEST_RATE_WINDOW_SECONDS || 3600);
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const windowId = Math.floor(now / (windowSeconds * 1000));
  const resetAt = (windowId + 1) * windowSeconds * 1000;

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/multi-exec`, {
        method: "POST",
        headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
        body: JSON.stringify([["INCR", `virro:audit:${windowId}:${identifier}`], ["EXPIRE", `virro:audit:${windowId}:${identifier}`, windowSeconds + 60]]),
        cache: "no-store",
      });
      if (response.ok) {
        const result = await response.json() as Array<{ result?: number }>;
        const count = Number(result[0]?.result || 1);
        return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetAt, mode: "distributed" };
      }
    } catch { /* Fall back to a bounded process-local guard. */ }
  }

  const current = localAttempts.get(identifier);
  const entry = !current || current.resetAt <= now ? { count: 1, resetAt } : { count: current.count + 1, resetAt: current.resetAt };
  localAttempts.set(identifier, entry);
  if (localAttempts.size > 5_000) for (const [key, value] of localAttempts) if (value.resetAt <= now) localAttempts.delete(key);
  return { allowed: entry.count <= limit, limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt, mode: "memory" };
}
