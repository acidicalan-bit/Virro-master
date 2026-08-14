import "server-only";

/**
 * Legacy service-role routes are a migration compatibility surface only.
 * They are disabled by default and cannot be enabled in production. The
 * flag is an operational containment switch, not an authorization mechanism.
 */
export function isLegacyInternalRouteEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.INTERNAL_LEGACY_ROUTES_ENABLED === "true";
}

export function legacyRouteDisabledResponse(): Response {
  return Response.json({ error: "Legacy route disabled; use the authenticated tenant API." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
