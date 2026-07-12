import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Virro enterprise category experience", () => {
  it("exposes the complete operating-understanding capability chain", () => {
    const source = readFileSync(join(root, "components/landing/platform-capabilities.tsx"), "utf8");
    for (const capability of ["Understanding Capture", "Understanding Event", "Readiness Gate", "Output Bundles", "Living Understanding Map", "Knowledge Continuity", "Privacy Shield"]) {
      expect(source).toContain(capability);
    }
  });

  it("includes twelve transversal demo flows", () => {
    const source = readFileSync(join(root, "components/landing/transversal-demo.tsx"), "utf8");
    for (const id of ["meeting", "product", "design", "support", "sales", "marketing", "data", "process", "finance", "policy", "ai", "continuity"]) {
      expect(source).toContain(`id: "${id}"`);
    }
  });

  it("shows the privacy-first decision path in the demo", () => {
    const source = readFileSync(join(root, "components/landing/transversal-demo.tsx"), "utf8");
    for (const stage of ["Safe input", "Privacy Shield", "Readiness Gate", "Pack Engine", "Executive Signal"]) {
      expect(source).toContain(stage);
    }
    expect(source).toContain("Raw data: no");
  });

  it("uses enterprise audit and pilot conversion actions", () => {
    const source = readFileSync(join(root, "components/landing/diagnosis-request-form.tsx"), "utf8");
    expect(source).toContain('t("Request an audit", "Solicitar auditoría")');
    expect(source).toContain('t("Configure a pilot", "Configurar piloto")');
  });

  it("provides visible and structured AI-discovery content", () => {
    const capabilities = readFileSync(join(root, "components/landing/platform-capabilities.tsx"), "utf8");
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    expect(capabilities).toContain("FAQ");
    expect(capabilities).toContain("Operational glossary");
    expect(layout).toContain('"@type": "FAQPage"');
    expect(layout).toContain('"@type": "SoftwareApplication"');
  });
});
