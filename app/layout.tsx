import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const virroInter = localFont({
  src: "./virro-inter.woff2",
  variable: "--font-virro",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.virro.app"),
  title: { default: "VIRRO IMPULSA — Transforma cómo se ve, trabaja y vende tu negocio", template: "%s | VIRRO IMPULSA" },
  description: "Diseño, tecnología y acompañamiento en un solo sistema para modernizar negocios en México.",
  applicationName: "VIRRO IMPULSA",
  alternates: { canonical: "/" },
  openGraph: { title: "VIRRO IMPULSA", description: "La siguiente versión de tu negocio, visible y operable.", type: "website", locale: "es_MX" },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#080b10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={virroInter.variable}>
      <body>
        <a className="skip-link" href="#main-content">Saltar al contenido</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
