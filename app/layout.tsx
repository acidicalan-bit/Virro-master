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
  keywords: ["entendimiento operativo", "Understanding Event", "Readiness Gate", "Meaning Loss", "AI Understanding", "Living Understanding Map", "enterprise handoff readiness"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": "https://www.virro.app/#organization", name: "Virro", url: "https://www.virro.app", email: "contacto@virro.app", description },
    { "@type": "WebSite", "@id": "https://www.virro.app/#website", url: "https://www.virro.app", name: "Virro", publisher: { "@id": "https://www.virro.app/#organization" }, inLanguage: ["es", "en"] },
    { "@type": "SoftwareApplication", "@id": "https://www.virro.app/#software", name: "Virro Enterprise Demo Platform", url: "https://www.virro.app/app", applicationCategory: "BusinessApplication", operatingSystem: "Web", description, featureList: ["Understanding Capture", "Readiness Gate", "Output Bundles", "Living Understanding Map", "Knowledge Continuity", "Privacy Shield", "AI Understanding"] },
    { "@type": "FAQPage", "@id": "https://www.virro.app/#faq", mainEntity: [
      { "@type": "Question", name: "¿Qué es Virro?", acceptedAnswer: { "@type": "Answer", text: "Virro es infraestructura empresarial de entendimiento operativo digital. Revisa si la información tiene suficiente contexto, criterio y claridad para avanzar." } },
      { "@type": "Question", name: "¿Qué es un Understanding Event?", acceptedAnswer: { "@type": "Answer", text: "Es un momento trazable donde una persona, equipo, herramienta o IA necesita entender información antes de continuar una acción." } },
      { "@type": "Question", name: "¿Virro requiere IA?", acceptedAnswer: { "@type": "Answer", text: "No. Virro genera valor en handoffs entre personas y sistemas. AI Understanding es una aplicación fuerte, no un requisito." } },
      { "@type": "Question", name: "¿Cómo empieza un piloto de Virro?", acceptedAnswer: { "@type": "Answer", text: "Con una auditoría de un flujo crítico, un Enterprise Understanding Map, un pack recomendado y un piloto enfocado." } },
      { "@type": "Question", name: "¿Cómo maneja Virro la información sensible?", acceptedAnswer: { "@type": "Answer", text: "Privacy Shield prioriza minimización, máscara, anonimización y manejo pattern-first. El alcance se acuerda antes de revisar evidencia real." } }
    ] }
  ] };
  return <html lang="es" data-theme="dark" suppressHydrationWarning><body className={inter.variable}><Script src="/theme-init.js" strategy="beforeInteractive" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><LanguageProvider>{children}</LanguageProvider></body></html>;
}
