import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { LanguageProvider } from "@/components/i18n/language-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const description = "Virro reduce el costo de trabajar con información mal entendida. Revisa contexto, criterio y claridad antes de avanzar entre áreas y sistemas.";

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f6f8" }, { media: "(prefers-color-scheme: dark)", color: "#080b10" }] };

export const metadata: Metadata = {
  metadataBase: new URL("https://www.virro.app"),
  title: "Virro — Infraestructura de Entendimiento Operativo Digital",
  description,
  icons: { icon: "/brand/virro-icon.svg" },
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: { title: "Virro — Entendimiento operativo digital para empresas", description, type: "website", url: "/", siteName: "Virro", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Virro — Reduce el costo de trabajar con información mal entendida" }] },
  twitter: { card: "summary_large_image", title: "Virro — Entendimiento operativo digital para empresas", description, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
  keywords: ["entendimiento operativo", "Understanding Event", "Readiness Gate", "Meaning Loss", "AI Understanding", "Living Understanding Map", "enterprise handoff readiness"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": "https://www.virro.app/#organization", name: "Virro", url: "https://www.virro.app", description },
    { "@type": "WebSite", "@id": "https://www.virro.app/#website", url: "https://www.virro.app", name: "Virro", publisher: { "@id": "https://www.virro.app/#organization" }, inLanguage: ["es", "en"] },
    { "@type": "SoftwareApplication", "@id": "https://www.virro.app/#software", name: "Virro Enterprise Demo Platform", url: "https://www.virro.app/app", applicationCategory: "BusinessApplication", operatingSystem: "Web", description, featureList: ["Readiness Gate", "Enterprise Understanding Map", "Executive Reports", "Privacy Shield", "AI Understanding"] },
    { "@type": "FAQPage", "@id": "https://www.virro.app/faq#faq", url: "https://www.virro.app/faq", name: "Preguntas frecuentes de Virro" }
  ] };
  return <html lang="es" data-theme="dark" suppressHydrationWarning><body className={inter.variable}><Script src="/theme-init.js" strategy="beforeInteractive" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><LanguageProvider>{children}</LanguageProvider></body></html>;
}
