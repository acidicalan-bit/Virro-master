import { describe, expect, it } from "vitest";
import { AUDIT_CONSENT_VERSION, AUDIT_LEAD_RETENTION_DAYS, parseAuditRequest } from "@/lib/conversion/audit-request";

const validInput = {
  name: "María López", email: "maria@example.com", company: "Aperture Systems", companySize: "51–200",
  area: "Producto", flowType: "Product Delivery", informationLocation: "Jira y Slack", sender: "Product Manager",
  receiver: "Engineering Lead", nextAction: "Convertir el cambio en trabajo priorizado", commonChange: "Alcance y prioridad",
  tool: "Jira", volume: "30 handoffs por semana", problem: "El equipo interpreta distinto los cambios de alcance.",
  privacyConsent: "accepted", consentVersion: AUDIT_CONSENT_VERSION,
};

describe("audit request contract", () => {
  it("sanitizes and versions a valid request with bounded retention", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");
    const result = parseAuditRequest({ ...validInput, company: "<Aperture>\nSystems" }, now);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.company).toBe("Aperture Systems");
    expect(result.data.consentVersion).toBe(AUDIT_CONSENT_VERSION);
    expect(Date.parse(result.data.retentionUntil) - now.getTime()).toBe(AUDIT_LEAD_RETENTION_DAYS * 86_400_000);
  });

  it("rejects missing consent version and unsupported enum values", () => {
    const result = parseAuditRequest({ ...validInput, consentVersion: "old", tool: "Unknown tool" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fields).toContain("consentVersion");
    expect(result.fields).toContain("tool");
  });
});
