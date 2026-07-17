import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { modules } from "@/lib/config/modules";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("refined enterprise demo", () => {
  it("keeps exactly six primary demo areas", () => {
    const visible = modules.filter((module) => module.showInNavigation !== false);
    expect(visible.map((module) => module.id)).toEqual(["dashboard", "inbox", "product-delivery", "design-delivery", "handoff-intelligence", "privacy-trust"]);
  });

  it("provides complete evidence, limitations and outcome views for priority flows", () => {
    for (const path of ["components/packs/product-delivery-pack.tsx", "components/packs/design-delivery-pack.tsx", "components/packs/handoff-intelligence-pack.tsx"]) {
      const source = read(path);
      expect(source).toContain("EvidenceSection");
      expect(source).toContain("LimitationsPanel");
      expect(source).toContain("OutcomePanel");
    }
  });

  it("adds public how-it-works and demo routes with honest surface labels", () => {
    expect(read("app/demo/page.tsx")).toContain("DemoHub");
    expect(read("app/how-it-works/page.tsx")).toContain("HowItWorksPage");
    const hub = read("components/landing/demo-hub.tsx");
    expect(hub).toContain("Six areas");
    expect(hub).toContain("Simulated demo");
    expect(hub).toContain("Policy preview");
  });

  it("does not claim a productive Jira connector", () => {
    const jira = read("app/jira-readiness/page.tsx");
    expect(jira).toContain('capabilityStatus="planned"');
    expect(jira).toContain("no afirma un conector autoservicio productivo");
    expect(jira).not.toContain("Virro puede conectarse a Jira");
  });
});
