import type { Metadata } from "next";
import { LegalCenter } from "@/components/legal/legal-pages";

export const metadata: Metadata = { title: "Legal & Trust | Virro", description: "Términos, privacidad y principios de confianza de Virro.", alternates: { canonical: "/legal" } };
export default function LegalPage() { return <LegalCenter />; }
