import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { LanguageProvider } from "@/components/i18n/language-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const title = "Virro — Infraestructura de Entendimiento Operativo Digital";
const description =
  "Virro mantiene el entendimiento operativo cuando la información se mueve, cambia o necesita convertirse en acción.";
const openGraphTitle =
  "Virro — Infraestructura de Entendimiento Operativo Digital";
const openGraphDescription =
  "Evidencia, Signal Sufficiency y revisión humana para entender qué necesita el receptor cuando el trabajo cambia de responsable, etapa o herramienta.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#080b10" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.virro.app"),
  title,
  description,
  icons: { icon: "/brand/virro-icon.svg" },
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    title: openGraphTitle,
    description: openGraphDescription,
    type: "website",
    url: "/",
    siteName: "Virro",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: openGraphTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: openGraphTitle,
    description: openGraphDescription,
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  keywords: [
    "entendimiento operativo",
    "continuidad operativa",
    "gestión del cambio",
    "onboarding enterprise",
    "AI Understanding",
    "knowledge transfer",
    "enterprise handoff readiness",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.virro.app/#organization",
        name: "Virro",
        url: "https://www.virro.app",
        description,
        logo: "https://www.virro.app/brand/virro-icon.svg",
      },
      {
        "@type": "WebSite",
        "@id": "https://www.virro.app/#website",
        url: "https://www.virro.app",
        name: "Virro",
        publisher: { "@id": "https://www.virro.app/#organization" },
        inLanguage: ["es", "en"],
      },
      {
        "@type": "WebPage",
        "@id": "https://www.virro.app/#home",
        url: "https://www.virro.app",
        name: title,
        description,
        isPartOf: { "@id": "https://www.virro.app/#website" },
        about: { "@id": "https://www.virro.app/#organization" },
        inLanguage: "es",
      },
    ],
  };
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body className={inter.variable}>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
