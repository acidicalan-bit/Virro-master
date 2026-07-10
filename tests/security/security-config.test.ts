import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("security configuration", () => {
  it("disables framework identification", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("declares required browser security headers", async () => {
    const entries = await nextConfig.headers!();
    const headers = new Map(entries[0].headers.map((header) => [header.key, header.value]));
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});
