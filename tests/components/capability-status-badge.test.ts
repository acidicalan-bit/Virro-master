import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { capabilityRegistry, capabilityStatusLabels, entryModeRegistry, useCaseRegistry } from "@/lib/config/capability-registry";

describe("capability status system", () => {
  it("defines every explicit status without an implicit default", () => {
    expect(Object.keys(capabilityStatusLabels)).toEqual(["available", "assisted", "pilot", "planned", "future"]);
    expect(capabilityStatusLabels.assisted.es).toBe("Disponible con acompañamiento");
    const source = readFileSync(join(process.cwd(), "components/ui/capability-status-badge.tsx"), "utf8");
    expect(source).toContain("{ status }: { status: CapabilityStatus }");
    expect(source).not.toContain("status =");
  });

  it("keeps all public capabilities and entry modes explicitly classified", () => {
    expect(capabilityRegistry).toHaveLength(7);
    expect(entryModeRegistry).toHaveLength(4);
    expect(useCaseRegistry).toHaveLength(6);
    for (const item of [...capabilityRegistry, ...entryModeRegistry, ...useCaseRegistry]) {
      expect(capabilityStatusLabels[item.status]).toBeDefined();
    }
  });

  it("does not claim a self-service connector as available", () => {
    const connectors = entryModeRegistry.find(item => item.id === "native-connectors");
    expect(connectors?.status).toBe("planned");
    expect(connectors?.detail.es).toContain("no se afirma un conector autoservicio");
  });
});
