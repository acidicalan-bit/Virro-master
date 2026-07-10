import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { LanguageProvider } from "@/components/i18n/language-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Virro — Infraestructura de entendimiento operativo",
  description: "Entendimiento operativo para equipos, procesos e IA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-theme="dark" suppressHydrationWarning><body className={inter.variable}><LanguageProvider><AppShell>{children}</AppShell></LanguageProvider></body></html>;
}
