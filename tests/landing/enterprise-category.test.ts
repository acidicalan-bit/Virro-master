import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Virro enterprise category experience", () => {
  it("exposes the complete operating-understanding capability chain", () => {
    const source = readFileSync(join(root, "components/landing/platform-capabilities.tsx"), "utf8");
    for (const capability of ["Capture", "Privacy Shield", "Readiness Gate", "Pack Engine", "Executive Report"]) {
      expect(source).toContain(capability);
    }
  });

  it("keeps the public operating sequence focused on five buyer-facing modules", () => {
    const source = readFileSync(join(root, "components/landing/commercial-sections.tsx"), "utf8");
    for (const capability of ["Capture", "Privacy Shield", "Readiness Gate", "Pack Engine", "Executive Report"]) {
      expect(source).toContain(capability);
    }
    for (const internalConcept of ["Understanding Capture", "Output Bundle", "Living Understanding Map"]) {
      expect(source).not.toContain(internalConcept);
    }
  });

  it("uses a single audit conversion action across public packs", () => {
    const source = readFileSync(join(root, "components/landing/solution-panels.tsx"), "utf8");
    expect(source).toContain('href="#solicitar-diagnostico"');
    expect(source).toContain('t("Evaluate in an audit", "Evaluar en auditoría")');
    expect(source).not.toContain("Explorar en demo enterprise");
  });

  it("includes twelve transversal demo flows", () => {
    const source = readFileSync(join(root, "components/landing/enterprise-demo-experience-v2.tsx"), "utf8");
    for (const id of ["meeting", "product", "design", "support", "sales", "marketing", "data", "process", "finance", "policy", "ai", "continuity"]) {
      expect(source).toContain(`id: "${id}"`);
    }
  });

  it("shows the privacy-first decision path in the demo", () => {
    const source = readFileSync(join(root, "components/landing/enterprise-demo-experience-v2.tsx"), "utf8");
    for (const stage of ["Initial information", "Privacy Shield", "Readiness Gate", "Recommended pack", "Operational deliverable", "Executive signal"]) {
      expect(source).toContain(stage);
    }
    expect(source).toContain("Raw data stored: No");
    expect(source).toContain("Signals stored: readiness, risks, patterns");
  });

  it("uses enterprise audit and pilot conversion actions", () => {
    const source = readFileSync(join(root, "components/landing/diagnosis-request-form.tsx"), "utf8");
    expect(source).toContain('t("Request an audit", "Solicitar auditoría")');
    expect(source).toContain('t("Explore a pilot", "Explorar piloto")');
  });

  it("keeps executive preview scores visible from the first render", () => {
    const source = readFileSync(join(root, "components/landing/product-walkthrough.tsx"), "utf8");
    expect(source).toContain('Metric label="DoU Score" value={68}');
    expect(source).toContain('Metric label="Meaning Loss Risk" value={34}');
    expect(source).toContain('value={1} tone="amber" suffix=""');
    expect(source).not.toContain("CountUpMetric");
  });

  it("uses the requested capability narrative and pilot CTA", () => {
    const capabilities = readFileSync(join(root, "components/landing/platform-capabilities.tsx"), "utf8");
    const audit = readFileSync(join(root, "components/landing/commercial-sections.tsx"), "utf8");
    expect(capabilities).toContain("De información dispersa a señales operativas para decidir mejor.");
    expect(capabilities).toContain("para conservar señales de readiness, riesgo, contexto y continuidad que alimentan decisiones, handoffs y reportes ejecutivos.");
    expect(audit).toContain('t("Explore a pilot", "Explorar piloto")');
    expect(audit).not.toContain("Configurar piloto");
  });

  it("keeps audit CTA sizing in the shared landing button system", () => {
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");
    const audit = readFileSync(join(root, "components/landing/commercial-sections.tsx"), "utf8");
    expect(styles).toContain("min-height: 52px");
    expect(styles).toContain("white-space: nowrap");
    expect(styles).toContain(".brand-secondary-button");
    expect(styles).not.toContain("min-height: 36px");
    expect(audit).toContain("audit-pilot-actions");
    expect(audit).toContain('t("Explore a pilot", "Explorar piloto")');
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
