import { describe, expect, it, afterEach } from "vitest";

import { isLegacyInternalRouteEnabled } from "@/src/server/legacy-route-guard";

describe("legacy privileged route containment", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.INTERNAL_LEGACY_ROUTES_ENABLED;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) delete process.env.INTERNAL_LEGACY_ROUTES_ENABLED;
    else process.env.INTERNAL_LEGACY_ROUTES_ENABLED = originalFlag;
  });

  it("fails closed unless the exact non-production operator switch is present", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    for (const value of [undefined, "false", "1", "TRUE", " true", "yes"]) {
      if (value === undefined) delete process.env.INTERNAL_LEGACY_ROUTES_ENABLED;
      else process.env.INTERNAL_LEGACY_ROUTES_ENABLED = value;
      expect(isLegacyInternalRouteEnabled()).toBe(false);
    }
    process.env.INTERNAL_LEGACY_ROUTES_ENABLED = "true";
    expect(isLegacyInternalRouteEnabled()).toBe(true);
  });

  it("cannot be enabled in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.INTERNAL_LEGACY_ROUTES_ENABLED = "true";
    expect(isLegacyInternalRouteEnabled()).toBe(false);
  });
});
