import type { Metadata } from "next";
import { TermsPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = { title: "Términos de uso | Virro", description: "Términos de uso de Virro, su demo enterprise, auditorías y pilotos.", alternates: { canonical: "/legal/terms" } };
export default function TermsRoute() { return <TermsPage />; }
