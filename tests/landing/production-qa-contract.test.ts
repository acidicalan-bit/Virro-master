import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("production landing QA contract", () => {
  it("keeps the new continuity and privacy statements singular", () => {
    const hero = read("components/landing/hero-virro-core-panel.tsx");
    const core = read("components/landing/virro-core-section.tsx");

    expect(hero.match(/Actualizar responsables, criterios y artefactos antes de convertirlo en trabajo\./g)).toHaveLength(1);
    expect(hero.match(/Guarda señales de entendimiento, no conversaciones privadas\./g)).toHaveLength(1);
    expect(core.match(/Virro no fuerza un score cuando la evidencia no permite sostener un veredicto confiable\./g)).toHaveLength(1);
  });

  it("exposes the global audit and Enterprise demo actions", () => {
    const hero = read("components/landing/hero-understanding-filter.tsx");
    const core = read("components/landing/virro-core-section.tsx");
    const styles = read("app/globals.css");

    expect(hero).toContain('href="#solicitar-auditoria"');
    expect(hero).toContain('<a href="#virro-core" data-analytics-event="hero_demo_click"');
    expect(core).toContain('<section id="virro-core"');
    expect(core).toContain('<Link href="/app" className="brand-secondary-button mt-7 text-sm"');
    expect(core).toContain('t("View demo", "Ver demo")');
    expect(styles).toContain('scroll-behavior: smooth');
    expect(styles).toContain('#virro-core { scroll-margin-top: 96px; }');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('html { scroll-behavior: auto; }');
  });

  it("exposes the demo selector as individually labelled tabs", () => {
    const demo = read("components/landing/enterprise-demo-experience-v2.tsx");

    expect(demo).toContain('role="tablist"');
    expect(demo).toContain('role="tab"');
    expect(demo).toContain('aria-label={`${t("Flow", "Flujo")} ${index + 1} ${t("of", "de")} ${scenarios.length}:');
    expect(demo).toContain('aria-controls={`enterprise-demo-panel-${scenario.id}`}');
    expect(demo).toContain("aria-posinset={index + 1}");
    expect(demo).toContain("aria-setsize={scenarios.length}");
    expect(demo).toContain('role="tabpanel"');
    expect(demo).toContain('index < scenarios.length - 1 ? " " : null');
    expect(demo).toContain("El contexto todavía necesita aclararse antes de convertirse en acción.");
    expect(demo).not.toContain("El contexto todavía necesita validación antes de que esto pueda avanzar.");
  });

  it("keeps every diagnosis field labelled and connects help text", () => {
    const form = read("components/landing/diagnosis-request-form.tsx");
    const ids = ["name", "email", "company", "size", "area", "flow", "location", "tool", "sender", "receiver", "action", "change", "volume", "problem", "website"];

    for (const id of ids) {
      expect(form).toContain(`id="audit-${id}"`);
    }
    expect(form).toContain("<label htmlFor={id}");
    expect(form).toContain('type="email"');
    expect(form).toContain('aria-describedby="audit-email-help audit-sensitive-note"');
    expect(form).toContain('aria-describedby="audit-sensitive-note"');
    expect(form).toContain('id="audit-sensitive-note"');
    expect(form).toContain('name="privacyConsent"');
  });

  it("keeps navigation, panel statements, form help and footer text semantically separated", () => {
    const nav = read("components/landing/public-navbar.tsx");
    const panel = read("components/landing/hero-virro-core-panel.tsx");
    const form = read("components/landing/diagnosis-request-form.tsx");
    const landing = read("components/landing/public-landing.tsx");

    expect(nav).toContain('aria-label={t("Virro main navigation", "Navegación principal de Virro")}');
    expect(nav).toContain('index < anchors.length - 1 ? " " : null');
    expect(panel).toContain('La información puede avanzar con contexto incompleto.');
    expect(panel).toMatch(/contexto incompleto\."\)}<\/strong>\s*<\/section>\s*\{" "\}\s*<section>/);
    expect(form).toContain('<label htmlFor={id}');
    expect(form).toContain('</label>{children}');
    expect(form).toContain('Ingresa una dirección de correo empresarial válida.');
    expect(landing).toContain('aria-label={t("Footer navigation", "Navegación del pie de página")}');
  });

  it("covers changes, onboarding, enterprise packs and visible privacy", () => {
    const landing = read("components/landing/public-landing.tsx");
    const enterprise = read("components/landing/enterprise-home-sections.tsx");
    const registry = read("lib/config/capability-registry.ts");

    expect(landing).toContain("<EnterprisePrivacySection />");
    expect(landing).toContain("<UnderstandingEventDemo />");
    expect(enterprise).toContain("Las afirmaciones de privacidad dependen del runtime utilizado.");
    expect(enterprise).toContain("Formulario público");
    expect(enterprise).toContain("Auditoría asistida");
    expect(enterprise).toContain("Revisión humana");
    expect(enterprise).toContain("Change Integrity");
    expect(registry).toContain("Brief → diseño → revisión → aprobación → producción");
  });

  it("keeps permanent redirects, canonical metadata and sitemap aligned", () => {
    const config = read("next.config.ts");
    const layout = read("app/layout.tsx");
    const sitemap = read("app/sitemap.ts");

    for (const [source, destination] of [["/es", "/"], ["/terms", "/legal/terms"], ["/es/privacy", "/legal/privacy"], ["/es/terms", "/legal/terms"]]) {
      expect(config).toContain(`source: "${source}", destination: "${destination}", permanent: true`);
    }
    expect(config).toContain('source: "/inbox", destination: "/app/inbox", permanent: true');
    expect(config).toContain('source: "/demo-scenarios", destination: "/app/demo-scenarios", permanent: true');
    expect(layout).toContain('alternates: { canonical: "/" }');
    expect(layout).toContain("Virro — Infraestructura de entendimiento operativo");
    expect(sitemap).toContain('`${base}/jira-readiness`');
    expect(sitemap).toContain('`${base}/change-integrity`');
    expect(sitemap).toContain('`${base}/flow-audit`');
    expect(sitemap).toContain('`${base}/design-delivery`');
    expect(layout).not.toContain("Claridad operativa para Product Delivery");
    expect(sitemap).not.toMatch(/\$\{base\}\/es(?:[\"`/])/);
  });
});
