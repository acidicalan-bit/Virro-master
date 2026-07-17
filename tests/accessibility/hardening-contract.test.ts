import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("accessibility hardening contract", () => {
  it("provides global keyboard focus and reduced-motion behavior", () => {
    const styles = read("app/globals.css");
    expect(styles).toContain(':where(a, button, input, select, textarea, [role="tab"]):focus-visible');
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("scroll-behavior: auto");
  });

  it("defers decorative hero video until after the critical viewport", () => {
    const hero = read("components/landing/hero-understanding-filter.tsx");
    expect(hero).toContain("videosEnabled");
    expect(hero).toContain('preload={index === 0 ? "metadata" : "none"}');
    expect(hero).toContain('aria-hidden="true"');
    expect(hero).toContain('poster="/hero/virro-flow-poster.webp"');
  });

  it("does not expose nonfunctional demo chrome as buttons", () => {
    const shell = read("components/layout/app-shell.tsx");
    expect(shell).toContain('aria-label={t("Simulated demo workspace"');
    expect(shell).toContain('aria-hidden="true" className="hidden items-center');
    expect(shell).not.toContain('<button className="hidden items-center gap-2 rounded-lg border');
  });
});
