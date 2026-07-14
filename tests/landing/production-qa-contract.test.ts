import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("production landing QA contract", () => {
  it("keeps the corrected Virro Core statements singular and spaced", () => {
    const hero = read("components/landing/hero-virro-core-panel.tsx");
    const core = read("components/landing/virro-core-section.tsx");

    expect(hero.match(/Definir responsable, formato esperado y criterio de éxito\./g)).toHaveLength(1);
    expect(hero).not.toContain("Definir responsable, formato y criterio.");
    expect(hero.match(/No guarda conversaciones privadas por defecto\. Guarda señales: readiness, riesgos y patrones\./g)).toHaveLength(1);
    expect(core.match(/Señales guardadas: readiness, riesgos, patrones y reportes agregados\. No conversaciones privadas por defecto\./g)).toHaveLength(1);
  });

  it("exposes the demo selector as individually labelled tabs", () => {
    const demo = read("components/landing/enterprise-demo-experience-v2.tsx");

    expect(demo).toContain('role="tablist"');
    expect(demo).toContain('role="tab"');
    expect(demo).toContain('aria-label={`${t("Show flow", "Mostrar flujo")}');
    expect(demo).toContain('aria-controls={`enterprise-demo-panel-${scenario.id}`}');
    expect(demo).toContain('role="tabpanel"');
    expect(demo).toContain('index < scenarios.length - 1 ? " " : null');
  });

  it("keeps every diagnosis field labelled and connects help text", () => {
    const form = read("components/landing/diagnosis-request-form.tsx");
    const ids = ["name", "company", "role", "email", "area", "tools", "flow", "context", "website"];

    for (const id of ids) {
      expect(form).toContain(`id="diagnosis-${id}"`);
    }
    expect(form).toContain("<label htmlFor={id}");
    expect(form).toContain('type="email"');
    expect(form).toContain('aria-describedby="diagnosis-email-help"');
    expect(form).toContain('aria-describedby="diagnosis-sensitive-note"');
    expect(form).toContain('id="diagnosis-sensitive-note"');
  });

  it("keeps permanent redirects, canonical metadata and sitemap aligned", () => {
    const config = read("next.config.ts");
    const layout = read("app/layout.tsx");
    const sitemap = read("app/sitemap.ts");

    for (const [source, destination] of [["/es", "/"], ["/privacy", "/legal/privacy"], ["/terms", "/legal/terms"], ["/es/privacy", "/legal/privacy"], ["/es/terms", "/legal/terms"]]) {
      expect(config).toContain(`source: "${source}", destination: "${destination}", permanent: true`);
    }
    expect(layout).toContain('alternates: { canonical: "/" }');
    expect(layout).toContain("Virro — Infraestructura de entendimiento operativo para empresas");
    expect(layout).not.toContain("Claridad operativa para Product Delivery");
    expect(sitemap).not.toMatch(/\$\{base\}\/es(?:[\"`/])/);
  });
});
