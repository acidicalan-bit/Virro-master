import type { Metadata } from "next";
import { EnterpriseTrustDocumentPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = {
  title: "Resumen de seguridad | Virro",
  description: "Resumen de controles privacy-first y disponibilidad de información de seguridad para pilotos enterprise de Virro.",
  alternates: { canonical: "/legal/security-overview" },
};

export default function SecurityOverviewPage() {
  return <EnterpriseTrustDocumentPage document="security-overview" />;
}
