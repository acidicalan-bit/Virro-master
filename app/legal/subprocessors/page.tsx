import type { Metadata } from "next";
import { EnterpriseTrustDocumentPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = {
  title: "Subencargados | Virro",
  description: "Disponibilidad del registro de subencargados para pilotos enterprise de Virro.",
  alternates: { canonical: "/legal/subprocessors" },
};

export default function SubprocessorsPage() {
  return <EnterpriseTrustDocumentPage document="subprocessors" />;
}
