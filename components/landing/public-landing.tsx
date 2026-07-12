"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CircleAlert, FileBarChart, ShieldCheck, Sparkles } from "lucide-react";
import { ArchitectureOrbit } from "@/components/landing/architecture-orbit";
import { DiagnosisRequestForm } from "@/components/landing/diagnosis-request-form";
import { EnterpriseUnderstandingMap } from "@/components/landing/enterprise-understanding-map";
import { EnterpriseValueMap } from "@/components/landing/enterprise-value-map";
import { HeroUnderstandingFilter } from "@/components/landing/hero-understanding-filter";
import { ProductWalkthrough } from "@/components/landing/product-walkthrough";
import { DiscoverabilitySection, PlatformCapabilities } from "@/components/landing/platform-capabilities";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { SolutionPanels } from "@/components/landing/solution-panels";
import { TransversalDemo } from "@/components/landing/transversal-demo";
import { AIUnderstandingSection, AuditPilotSection, CategoryLayerSection, HowItWorksSection, PackagingSection, PrivacyShieldSection, ProblemSection, WhyNowSection } from "@/components/landing/commercial-sections";
import { useLanguage } from "@/components/i18n/language-provider";

export function PublicLanding() {
  const { t } = useLanguage();
  return <div className="public-landing min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
    <a href="#main-content" className="skip-link">{t("Skip to content", "Saltar al contenido")}</a>
    <PublicNavbar />
    <main id="main-content">
      <HeroUnderstandingFilter />
      <ProblemSection />
      <CategoryLayerSection />
      <PlatformCapabilities />
      <ArchitectureOrbit />
      <EnterpriseValueMap />
      <HowItWorksSection />
      <PrivacyShieldSection />
      <section id="producto" className="product-stage scroll-mt-24 px-5 py-24 md:px-8 md:py-36"><div className="mx-auto max-w-[1380px]"><div className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-end"><div><p className="section-kicker">{t("Product interface", "Interfaz de producto")}</p><h2 className="section-display">{t("One operating loop, from intake to executive evidence.", "Un ciclo operativo, desde el ingreso hasta la evidencia ejecutiva.")}</h2></div><p className="section-lead lg:justify-self-end">{t("The enterprise demo shows how Virro captures an Understanding Event, reviews it through specialized packs and exposes readiness, risk and next actions.", "La demo enterprise muestra cómo Virro captura un Understanding Event, lo revisa con packs especializados y hace visibles readiness, riesgo y siguientes acciones.")}</p></div><ProductWalkthrough /></div></section>
      <EnterpriseUnderstandingMap />
      <ExecutiveReportProof />
      <TransversalDemo />
      <AuditPilotSection />
      <SolutionPanels />
      <AIUnderstandingSection />
      <PackagingSection />
      <WhyNowSection />
      <DiscoverabilitySection />
      <DiagnosisRequestForm />
    </main>
    <footer className="public-footer border-t border-[var(--border)] px-5 py-12 md:px-8"><div className="mx-auto grid max-w-[1380px] gap-8 md:grid-cols-[1fr_auto_auto] md:items-end"><div><Link href="/" className="flex items-center gap-2"><Image src="/brand/virro-icon.svg" alt="" width={26} height={22} /><span className="font-semibold tracking-[-.04em]">Virro</span></Link><p className="mt-3 max-w-md text-[10px] leading-5 text-[var(--subtle)]">{t("Enterprise digital operational understanding infrastructure.", "Infraestructura empresarial de entendimiento operativo digital.")}</p></div><div className="text-[10px] leading-6"><p className="font-semibold">{t("Contact", "Contacto")}</p><a href="mailto:contacto@virro.app" className="text-[var(--muted)]">contacto@virro.app</a></div><div className="flex flex-wrap gap-4 text-[10px]"><Link href="/app/privacy-trust">Privacy & Trust</Link><Link href="/legal">{t("Legal", "Legal")}</Link><Link href="/legal/terms">{t("Terms", "Términos")}</Link><Link href="/legal/privacy">{t("Privacy", "Privacidad")}</Link><Link href="/app">{t("Enterprise demo", "Demo enterprise")}</Link></div></div><div className="mx-auto mt-8 flex max-w-[1380px] flex-col gap-2 border-t border-[var(--border)] pt-5 text-[9px] text-[var(--subtle)] sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} Virro</span><span>{t("Probabilistic estimates · human validation · staged adoption", "Estimaciones probabilísticas · validación humana · adopción por etapas")}</span></div></footer>
  </div>;
}

function ExecutiveReportProof() {
  const { t } = useLanguage();
  const rows = [[t("Analyzed flow", "Flujo analizado"), "Sales → Delivery"], [t("Reviewed events", "Eventos revisados"), "5 Understanding Events"], [t("Primary signal", "Señal principal"), t("Scope changes between proposal and delivery", "El alcance cambia entre propuesta y delivery")], [t("Estimated readiness", "Readiness estimado"), "41/100"], [t("Quick win", "Quick win"), t("Name scope owner and acceptance evidence", "Definir responsable de alcance y evidencia de aceptación")], [t("Recommended pack", "Pack recomendado"), "Handoff Intelligence"]];
  return <section id="reporte-ejecutivo" className="executive-proof-section scroll-mt-24 border-y border-[var(--border)] px-5 py-24 md:px-8 md:py-36"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-center"><div><p className="section-kicker">{t("The report is the decision surface", "El reporte es la superficie de decisión")}</p><h2 className="section-display">{t("Executive evidence, not another analysis screen.", "Evidencia ejecutiva, no otra pantalla de análisis.")}</h2><p className="section-lead mt-6">{t("Every reviewed event feeds a report that connects operational friction with missing context, estimated readiness, quick wins and a recommended pilot.", "Cada evento revisado alimenta un reporte que conecta fricción operativa con contexto faltante, readiness estimado, quick wins y un piloto recomendado.")}</p><Link href="/app/reports" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand-blue)]">{t("View report builder", "Ver constructor de reportes")} <ArrowRight size={13} /></Link></div><div className="executive-report-sheet visual-dark"><div className="executive-report-head"><div><span>Virro Enterprise Report</span><h3>Enterprise Understanding Audit</h3><p>{t("Executive decision brief · Simulated data", "Brief ejecutivo de decisión · Datos simulados")}</p></div><div className="report-score"><b>58</b><span>Virro Score</span><small>{t("Estimated", "Estimado")}</small></div></div><div className="executive-report-grid">{rows.map(([label, value], index) => <article key={label}><div><span>0{index + 1}</span>{index === 2 ? <CircleAlert size={13} /> : index === 4 ? <Sparkles size={13} /> : <ShieldCheck size={13} />}</div><p>{label}</p><strong>{value}</strong></article>)}</div><div className="executive-report-foot"><FileBarChart size={14} /><span>{t("No personal performance evaluation · findings require human validation", "Sin evaluación de desempeño personal · los hallazgos requieren validación humana")}</span></div></div></div></section>;
}
