import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { LanguageProvider } from "@/components/i18n/language-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const title = "Virro — Infraestructura de entendimiento operativo para empresas";
const description = "Virro ayuda a empresas a validar si mensajes, tickets, procesos, handoffs e instrucciones para IA tienen suficiente contexto, criterio y claridad para avanzar con menor riesgo.";

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f6f8" }, { media: "(prefers-color-scheme: dark)", color: "#080b10" }] };

export const metadata: Metadata = {
  metadataBase: new URL("https://www.virro.app"),
  title,
  description,
  icons: { icon: "/brand/virro-icon.svg" },
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: { title, description, type: "website", url: "/", siteName: "Virro", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Virro — Infraestructura de entendimiento operativo para empresas" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
  keywords: ["entendimiento operativo", "Understanding Event", "Readiness Gate", "Meaning Loss", "AI Understanding", "Living Understanding Map", "enterprise handoff readiness"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": "https://www.virro.app/#organization", name: "Virro", url: "https://www.virro.app", description },
    { "@type": "WebSite", "@id": "https://www.virro.app/#website", url: "https://www.virro.app", name: "Virro", publisher: { "@id": "https://www.virro.app/#organization" }, inLanguage: ["es", "en"] },
    { "@type": "SoftwareApplication", "@id": "https://www.virro.app/#software", name: "Virro", url: "https://www.virro.app", applicationCategory: "BusinessApplication", operatingSystem: "Web", description, featureList: ["Readiness Gate", "Handoff Intelligence", "Executive Reports", "Privacy Shield", "AI Understanding"] },
    { "@type": "FAQPage", "@id": "https://www.virro.app/faq#faq", url: "https://www.virro.app/faq", name: "Preguntas frecuentes de Virro", mainEntity: [
      { "@type": "Question", name: "¿Qué es Virro?", acceptedAnswer: { "@type": "Answer", text: "Virro es infraestructura empresarial de entendimiento operativo digital. Revisa si la información tiene suficiente contexto, criterio y claridad para avanzar." } },
      { "@type": "Question", name: "¿Qué información guarda Virro?", acceptedAnswer: { "@type": "Answer", text: "En modo seguro, Virro procesa contenido crudo de forma transitoria y conserva señales seguras, scores, categorías de contexto y reportes agregados, no conversaciones completas por defecto." } },
      { "@type": "Question", name: "¿Virro evalúa personas?", acceptedAnswer: { "@type": "Answer", text: "No. Virro analiza señales de claridad, contexto y readiness en información operativa; sus scores son estimaciones probabilísticas y requieren validación humana." } }
    ] }
  ] };
  return <html lang="es" data-theme="dark" suppressHydrationWarning><body className={inter.variable}><Script src="/theme-init.js" strategy="beforeInteractive" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><LanguageProvider>{children}</LanguageProvider></body></html>;
}
