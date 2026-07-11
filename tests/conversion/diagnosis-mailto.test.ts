import { describe, expect, it } from "vitest";
import { buildDiagnosisMailto, DIAGNOSIS_EMAIL } from "@/lib/conversion/diagnosis-mailto";

describe("diagnosis mailto", () => {
  it("builds an honest prefilled diagnosis email", () => {
    const href = buildDiagnosisMailto({
      name: "María López",
      company: "Aperture Systems",
      role: "CTO",
      email: "maria@example.com",
      flow: "Handoff Intelligence",
      context: "Producto y QA interpretan distinto el alcance.",
    });

    expect(href.startsWith(`mailto:${DIAGNOSIS_EMAIL}?`)).toBe(true);
    expect(decodeURIComponent(href)).toContain("Solicitud Meaning Loss Audit · Aperture Systems");
    expect(decodeURIComponent(href)).toContain("Flujo a diagnosticar: Handoff Intelligence");
    expect(decodeURIComponent(href)).toContain("antes de analizar eventos reales definiremos privacidad");
  });

  it("prevents line breaks from modifying mail headers", () => {
    const href = buildDiagnosisMailto({
      name: "Alan",
      company: "Virro\nBcc: other@example.com",
      role: "Founder",
      email: "alan@example.com",
      flow: "Product Delivery",
      context: "Necesitamos revisar un flujo crítico.",
    });

    const subject = new URL(href).searchParams.get("subject");
    expect(subject).toBe("Solicitud Meaning Loss Audit · Virro Bcc: other@example.com");
  });
});
