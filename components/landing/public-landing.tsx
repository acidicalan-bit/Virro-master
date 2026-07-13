"use client";

import Image from "next/image";
import Link from "next/link";
import { HeroUnderstandingFilter } from "@/components/landing/hero-understanding-filter";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { SolutionPanels } from "@/components/landing/solution-panels";
import { EnterpriseDemoExperienceV2 } from "@/components/landing/enterprise-demo-experience-v2";
import { AuditPilotSection, ProblemSection } from "@/components/landing/commercial-sections";
import { VirroCoreSection } from "@/components/landing/virro-core-section";
import { useLanguage } from "@/components/i18n/language-provider";

export function PublicLanding() {
  const { t } = useLanguage();
  return <div className="public-landing min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
    <a href="#main-content" className="skip-link">{t("Skip to content", "Saltar al contenido")}</a>
    <PublicNavbar />
    <main id="main-content">
      <HeroUnderstandingFilter />
      <ProblemSection />
      <VirroCoreSection />
      <EnterpriseDemoExperienceV2 />
      <SolutionPanels />
      <AuditPilotSection />
    </main>
    <footer className="public-footer border-t border-[var(--border)] px-5 py-12 md:px-8"><div className="mx-auto grid max-w-[1380px] gap-8 md:grid-cols-[1fr_auto_auto] md:items-end"><div><Link href="/" className="flex items-center gap-2"><Image src="/brand/virro-icon.svg" alt="" width={26} height={22} /><span className="font-semibold tracking-[-.04em]">Virro</span></Link><p className="mt-3 max-w-md text-[10px] leading-5 text-[var(--subtle)]">{t("Enterprise digital operational understanding infrastructure.", "Infraestructura empresarial de entendimiento operativo digital.")}</p></div><div className="text-[10px] leading-6"><p className="font-semibold">{t("Contact", "Contacto")}</p><a href="mailto:contacto@virro.app" className="text-[var(--muted)]">contacto@virro.app</a></div><div className="flex flex-wrap gap-4 text-[10px]"><Link href="/app/privacy-trust">Privacy & Trust</Link><Link href="/legal">{t("Legal", "Legal")}</Link><Link href="/legal/terms">{t("Terms", "Términos")}</Link><Link href="/legal/privacy">{t("Privacy", "Privacidad")}</Link><Link href="/app">{t("Enterprise demo", "Demo enterprise")}</Link></div></div><div className="mx-auto mt-8 flex max-w-[1380px] flex-col gap-2 border-t border-[var(--border)] pt-5 text-[9px] text-[var(--subtle)] sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} Virro</span><span>{t("Probabilistic estimates · human validation · staged adoption", "Estimaciones probabilísticas · validación humana · adopción por etapas")}</span></div></footer>
  </div>;
}
