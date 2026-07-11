import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { LanguageProvider } from "@/components/i18n/language-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const description = "Virro reduce el costo de trabajar con información mal entendida. Revisa contexto, criterio y claridad en mensajes, documentos, procesos, handoffs e instrucciones digitales antes de avanzar.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.virro.app"),
  title: "Virro — Infraestructura de Entendimiento Operativo Digital",
  description,
  icons: { icon: "/brand/virro-icon.svg" },
  alternates: { canonical: "/" },
  openGraph: { title: "Virro — Entendimiento operativo digital para empresas", description: "Virro ayuda a que la información que se mueve entre áreas, procesos, herramientas e IA llegue con más contexto, criterio y claridad antes de avanzar.", type: "website", url: "/", siteName: "Virro", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Virro — Reduce el costo de trabajar con información mal entendida" }] },
  twitter: { card: "summary_large_image", title: "Virro — Entendimiento operativo digital para empresas", description, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": "https://www.virro.app/#organization", name: "Virro", url: "https://www.virro.app", email: "contacto@virro.app", description }, { "@type": "WebSite", "@id": "https://www.virro.app/#website", url: "https://www.virro.app", name: "Virro", publisher: { "@id": "https://www.virro.app/#organization" } }] };
  return <html lang="es" data-theme="dark" suppressHydrationWarning><body className={inter.variable}><Script src="/theme-init.js" strategy="beforeInteractive" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><LanguageProvider>{children}</LanguageProvider></body></html>;
}
