import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("public landing language and navigation", () => {
  it("exposes a persistent language control on the public navbar", () => {
    const navbar = readFileSync(join(root, "components/landing/public-navbar.tsx"), "utf8");
    const provider = readFileSync(join(root, "components/i18n/language-provider.tsx"), "utf8");
    expect(navbar).toContain("<LanguageToggle");
    expect(navbar).toContain('t("Applications", "Aplicaciones")');
    expect(provider).toContain('localStorage.setItem("virro-locale"');
  });

  it("keeps public conversion and demo routes explicit", () => {
    const landing = readFileSync(join(root, "components/landing/public-landing.tsx"), "utf8");
    const form = readFileSync(join(root, "components/landing/diagnosis-request-form.tsx"), "utf8");
    expect(landing).toContain('href="/jira-readiness"');
    expect(form).toContain('id="solicitar-auditoria"');
    expect(form).toContain('fetch("/api/audit-requests"');
    expect(landing).toContain("<VirroCoreSection />");
    expect(landing).toContain("<FutureApplicationsSection />");
  });
});
