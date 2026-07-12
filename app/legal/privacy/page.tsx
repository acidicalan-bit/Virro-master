import type { Metadata } from "next";
import { PrivacyNoticePage } from "@/components/legal/legal-pages";

export const metadata: Metadata = { title: "Aviso de privacidad | Virro", description: "Aviso de privacidad y controles Privacy Shield de Virro.", alternates: { canonical: "/legal/privacy" } };
export default function PrivacyRoute() { return <PrivacyNoticePage />; }
