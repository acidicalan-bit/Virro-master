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
  /outputs? operativos?/i,
  /operational outputs?/i,
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
});
