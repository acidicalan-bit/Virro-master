import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Product Delivery | Virro",
  description: "Conserva contexto y cambios entre producto, desarrollo y QA.",
  alternates: { canonical: "/product-delivery" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="pilot"
      eyebrow="Product Delivery"
      title="Mantén alineados producto, desarrollo y QA cuando el trabajo cambia."
      description="Virro detecta requisitos ambiguos, decisiones que no llegaron a todos y cambios que dejaron criterios, pruebas o documentación fuera de sincronía."
      sections={[
        {
          title: "Producto",
          copy: "Aclara la intención y la decisión que origina el trabajo.",
          points: ["Problema", "Resultado esperado", "Criterios"],
        },
        {
          title: "Desarrollo",
          copy: "Valida que el receptor tenga contexto suficiente para actuar.",
          points: ["Dependencias", "Restricciones", "Cambios"],
        },
        {
          title: "QA",
          copy: "Comprueba que pruebas y aceptación reflejen la realidad vigente.",
          points: ["Cobertura", "Versión", "Evidencia"],
        },
      ]}
    />
  );
}
