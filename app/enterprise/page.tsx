import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Virro Enterprise Understanding Layer",
  description:
    "Control plane de entendimiento operativo para equipos, herramientas, proveedores e IA.",
  alternates: { canonical: "/enterprise" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="pilot"
      eyebrow="Enterprise Understanding Layer"
      title="Una capa de entendimiento entre equipos, herramientas e IA."
      description="Virro mantiene suficientemente clara, vigente y accionable la información que personas, equipos, proveedores, herramientas e IA necesitan antes de actuar."
      sections={[
        {
          title: "Disponible",
          copy: "Readiness & Change Integrity sobre un flujo acotado.",
          points: ["Shadow Mode", "Advisory Gate", "Reporte privado"],
        },
        {
          title: "Planeado",
          copy: "Controles graduales después de calibrar señal y proceso.",
          points: [
            "Confirmation Gate",
            "Documentation Freshness",
            "Design Handoff",
          ],
        },
        {
          title: "Visión futura",
          copy: "Control plane transversal, no una afirmación de integraciones productivas actuales.",
          points: ["Policy Gate", "Handoff SLA", "AI Alignment"],
        },
      ]}
    />
  );
}
