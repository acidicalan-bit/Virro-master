import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const sourceRoots = ["components", "lib", "services"];
const forbidden = [
  /preguntas críticas detectadas/i,
  /critical questions detected/i,
  /pérdida de entendimiento/i,
  /understanding loss/i,
  /detecta pérdida/i,
  /expone contexto/i,
  /prioriza acción/i,
  /outputs operativos/i,
  /operational outputs/i,
  /riesgos? de entendimiento/i,
  /understanding risks?/i,
];

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Virro operational language", () => {
  it("keeps forbidden legacy terminology out of product, mock data and services", () => {
    const violations = sourceRoots.flatMap((folder) => filesIn(join(root, folder))).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbidden.filter((pattern) => pattern.test(source)).map((pattern) => `${file}: ${pattern}`);
    });
    expect(violations).toEqual([]);
  });

  it("uses validation-oriented critical-question labels", () => {
    const inbox = readFileSync(join(root, "components/inbox/inbox-workbench.tsx"), "utf8");
    const reports = readFileSync(join(root, "components/reports/report-builder.tsx"), "utf8");
    expect(inbox).toContain('t("Critical questions to validate", "Preguntas críticas para validar")');
    expect(reports).toContain('t("Critical questions to validate", "Preguntas críticas para validar")');
  });

  it("keeps the operational inbox narrative and accessible controls aligned", () => {
    const inbox = readFileSync(join(root, "components/inbox/inbox-workbench.tsx"), "utf8");
    const page = readFileSync(join(root, "app/app/inbox/page.tsx"), "utf8");
    expect(inbox).toContain('"Bandeja de Entendimiento Operativo"');
    expect(inbox).toContain('"Virro mantiene el entendimiento operativo cuando la información se mueve, cambia o necesita convertirse en acción."');
    expect(page).toContain('title: "Bandeja de Entendimiento Operativo | Virro"');
    expect(inbox).not.toContain("Asistente de Entendimiento Virro");
    expect(inbox).not.toContain("antes de avanzar");
    expect(inbox).toContain('role="tablist"');
    expect(inbox).toContain('role="tab"');
    expect(inbox).toContain('role="tabpanel"');
    expect(inbox).toContain('aria-controls="inbox-mode-panel"');
    expect(inbox).toContain('id={`${id}-hint`}');
    expect(inbox).toContain('{" "}<span');
    expect(inbox).toContain('aria-describedby="inbox-analysis-pack-hint"');
    expect(inbox).toContain('aria-describedby="inbox-raw-input-hint"');
    expect(inbox).toContain('id="inbox-form-guidance"');
  });
});
