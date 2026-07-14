import type { Metadata } from "next";
import { EnterpriseTrustDocumentPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = {
  title: "Retención de datos | Virro",
  description: "Disponibilidad de criterios de retención de datos para pilotos enterprise de Virro.",
  alternates: { canonical: "/legal/retention" },
};

export default function RetentionPage() {
  return <EnterpriseTrustDocumentPage document="retention" />;
}
