import type { Metadata } from "next";
import { CookiePolicyPage } from "@/components/legal/legal-pages";

export const metadata: Metadata = {
  title: "Política de cookies | Virro",
  description: "Uso limitado de almacenamiento local y cookies en el sitio público de Virro.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return <CookiePolicyPage />;
}
