import { describe, expect, it } from "vitest";
import { buildDiagnosisMailto, DIAGNOSIS_EMAIL } from "@/lib/conversion/diagnosis-mailto";

describe("diagnosis mailto", () => {
  it("builds an honest prefilled diagnosis email", () => {
    const href = buildDiagnosisMailto({
      name: "María López",
      company: "Aperture Systems",
      role: "CTO",
      email: "maria@example.com",
      area: "Producto y QA",
      tools: "Jira, Slack y Figma",
      flow: "Handoff Intelligence",
      context: "Producto y QA interpretan distinto el alcance.",
    });

    expect(href.startsWith(`mailto:${DIAGNOSIS_EMAIL}?`)).toBe(true);
    expect(decodeURIComponent(href)).toContain("Solicitud Auditoría de entendimiento operativo · Aperture Systems");
    expect(decodeURIComponent(href)).toContain("Flujo a diagnosticar: Handoff Intelligence");
    expect(decodeURIComponent(href)).toContain("Herramientas principales: Jira, Slack y Figma");
    expect(decodeURIComponent(href)).toContain("antes de analizar eventos reales definiremos privacidad");
  });

  it("prevents line breaks from modifying mail headers", () => {
    const href = buildDiagnosisMailto({
      name: "Alan",
      company: "Virro\nBcc: other@example.com",
      role: "Founder",
      email: "alan@example.com",
      area: "Delivery",
      tools: "Jira",
      flow: "Product Delivery",
      context: "Necesitamos revisar un flujo crítico.",
    });

    const subject = new URL(href).searchParams.get("subject");
    expect(subject).toBe("Solicitud Auditoría de entendimiento operativo · Virro Bcc: other@example.com");
  });

  it("distinguishes an enterprise pilot request", () => {
    const href = buildDiagnosisMailto({
      name: "Alan",
      company: "Virro",
      role: "Founder",
      email: "alan@example.com",
      area: "Delivery",
      tools: "Jira",
      flow: "Product Delivery",
      context: "Necesitamos configurar un piloto.",
      engagement: "pilot",
    });

    expect(decodeURIComponent(href)).toContain("Solicitud Piloto enterprise · Virro");
    expect(decodeURIComponent(href)).toContain("Quiero solicitar: Piloto enterprise.");
  });
});
