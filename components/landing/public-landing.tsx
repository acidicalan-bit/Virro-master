"use client";

import Image from "next/image";
import Link from "next/link";
import { HeroUnderstandingFilter } from "@/components/landing/hero-understanding-filter";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { SolutionPanels } from "@/components/landing/solution-panels";
import { AuditPilotSection, ProblemSection } from "@/components/landing/commercial-sections";
import { VirroCoreSection } from "@/components/landing/virro-core-section";
import { ClientOutcomesSection, EnterprisePilotSection, EnterprisePrivacySection, FinalEnterpriseCta, UnderstandingEventDemo } from "@/components/landing/enterprise-home-sections";
import { PublicAnalyticsObserver } from "@/components/landing/public-analytics-observer";
import { useLanguage } from "@/components/i18n/language-provider";

export function PublicLanding() {
  const { t } = useLanguage();
  return <div className="public-landing min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
    <a href="#main-content" className="skip-link">{t("Skip to main content", "Saltar al contenido principal")}</a>
    <PublicNavbar />
    <PublicAnalyticsObserver />
    <main id="main-content">
      <HeroUnderstandingFilter />
      <ProblemSection />
      <VirroCoreSection />
      <UnderstandingEventDemo />
      <SolutionPanels />
      <ClientOutcomesSection />
      <EnterprisePrivacySection />
      <AuditPilotSection />
      <EnterprisePilotSection />
      <FinalEnterpriseCta />
    </main>
    <footer className="public-footer border-t border-[var(--border)] px-5 py-12 md:px-8"><div className="mx-auto grid max-w-[1380px] gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><Link href="/" className="flex items-center gap-2"><Image src="/brand/virro-icon.svg" alt="" width={26} height={22} sizes="26px" /><span className="font-semibold tracking-[-.04em]">Virro</span></Link><p className="mt-3 max-w-md text-[10px] leading-5 text-[var(--subtle)]">{t("Virro keeps the information that moves your company understandable.", "Virro mantiene entendible la información que mueve a tu empresa.")}</p></div><nav className="flex max-w-3xl flex-wrap gap-x-5 gap-y-3 text-[10px]" aria-label={t("Footer navigation", "Navegación del pie de página")}><a href="#aplicaciones">{t("Applications", "Aplicaciones")}</a><a href="#privacidad">{t("Privacy", "Privacidad")}</a><Link href="/legal/security-overview">{t("Security", "Seguridad")}</Link><Link href="/legal/privacy">{t("Privacy notice", "Aviso de privacidad")}</Link><Link href="/legal/terms">{t("Terms", "Términos")}</Link><a href="mailto:contacto@virro.app">{t("Contact", "Contacto")}</a><Link href="/app">{t("Enterprise demo", "Demo Enterprise")}</Link><a href="#solicitar-auditoria">{t("Request an audit", "Solicitar auditoría")}</a></nav></div><div className="mx-auto mt-8 flex max-w-[1380px] flex-col gap-2 border-t border-[var(--border)] pt-5 text-[9px] text-[var(--subtle)] sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} Virro</span><span>{t("Probabilistic estimates · human validation · simulated demo", "Estimaciones probabilísticas · validación humana · demo simulada")}</span></div></footer>
  </div>;
}
