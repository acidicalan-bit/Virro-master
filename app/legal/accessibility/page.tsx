import type { Metadata } from "next";
import { AccessibilityStatementPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = {
  title: "Declaración de accesibilidad | Virro",
  description: "Compromiso de accesibilidad, medidas implementadas y limitaciones conocidas de Virro.",
  alternates: { canonical: "/legal/accessibility" },
};

export default function AccessibilityPage() {
  return <AccessibilityStatementPage />;
}
