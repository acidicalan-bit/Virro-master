import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Design Delivery | Virro",
  description:
    "Mantén claros briefs, versiones, assets, restricciones y criterios de aprobación en entregas de diseño.",
  alternates: { canonical: "/design-delivery" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="assisted"
      eyebrow="Design Delivery"
      title="Un diseño terminado todavía puede no estar listo para entregarse."
      description="Virro revisa si brief, intención, formatos, versiones, assets, restricciones y criterios de aprobación conservan el mismo significado para quien recibe el trabajo."
      sections={[
        {
          title: "Brief e intención",
          copy: "Comprueba que el resultado esperado siga claro.",
          points: ["Objetivo", "Audiencia", "Restricciones"],
        },
        {
          title: "Versiones y feedback",
          copy: "Detecta referencias desactualizadas o comentarios contradictorios.",
          points: ["Versión vigente", "Feedback resuelto", "Copy aprobado"],
        },
        {
          title: "Entrega",
          copy: "Alinea lo que se entrega con la acción que sigue.",
          points: [
            "Assets completos",
            "Formatos correctos",
            "Aprobación trazable",
          ],
        },
      ]}
    />
  );
}
