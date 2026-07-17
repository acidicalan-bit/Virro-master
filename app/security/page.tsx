import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Seguridad y límites de acceso | Virro",
  description:
    "Controles de acceso mínimo, aislamiento, revocación y revisión humana para flujos de Virro.",
  alternates: { canonical: "/security" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="available"
      eyebrow="Security"
      title="Controles visibles antes de analizar."
      description="Virro comienza con acceso mínimo y revocable. No afirma certificaciones que no estén verificadas."
      sections={[
        {
          title: "Acceso",
          copy: "Alcance acotado al flujo acordado.",
          points: ["Solo lectura al iniciar", "Un proyecto", "Revocable"],
        },
        {
          title: "Datos",
          copy: "Procesamiento limitado y señales seguras.",
          points: ["Masking", "No raw storage por defecto", "Aislamiento"],
        },
        {
          title: "Gobernanza",
          copy: "Los resultados requieren revisión humana.",
          points: ["Scores probabilísticos", "Trazabilidad", "Sin vigilancia"],
        },
      ]}
    />
  );
}
