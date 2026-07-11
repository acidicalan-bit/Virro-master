import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("landing motion system", () => {
  it("defines premium motion tokens and reduced-motion fallback", () => {
    const css = readFileSync(join(root, "app/globals.css"), "utf8");
    expect(css).toContain("--motion-fast: 180ms");
    expect(css).toContain("--motion-base: 320ms");
    expect(css).toContain("--motion-slow: 650ms");
    expect(css).toContain("--motion-scene: 900ms");
    expect(css).toContain("cubic-bezier(.22, 1, .36, 1)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses IntersectionObserver without adding a motion dependency", () => {
    const primitives = readFileSync(join(root, "components/landing/motion/motion-primitives.tsx"), "utf8");
    const packageJson = readFileSync(join(root, "package.json"), "utf8");
    expect(primitives).toContain("IntersectionObserver");
    expect(primitives).toContain("requestAnimationFrame");
    expect(packageJson).not.toContain("framer-motion");
  });

  it("provides the three interactive product scenes", () => {
    const walkthrough = readFileSync(join(root, "components/landing/product-walkthrough.tsx"), "utf8");
    expect(walkthrough).toContain('id: "dashboard"');
    expect(walkthrough).toContain('id: "assistant"');
    expect(walkthrough).toContain('id: "report"');
    expect(walkthrough).toContain("Demo preview · Datos simulados");
  });
});
