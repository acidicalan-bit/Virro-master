import type { Metadata } from "next";
import { EnterpriseTrustDocumentPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = {
  title: "Términos de tratamiento de datos | Virro",
  description: "Disponibilidad de términos de tratamiento de datos para pilotos enterprise de Virro.",
  alternates: { canonical: "/legal/data-processing" },
};

export default function DataProcessingPage() {
  return <EnterpriseTrustDocumentPage document="data-processing" />;
}
