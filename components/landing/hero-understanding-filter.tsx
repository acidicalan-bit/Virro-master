"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, FileBarChart, Layers3, LockKeyhole, Radar, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";

const inputs = ["Junta", "Ticket", "Documento", "Diseño", "CRM", "IA"];
const outputs = ["Privacy Shield", "Readiness Gate", "Pack recomendado", "Executive Report"];

export function HeroUnderstandingFilter() {
  const { locale, t } = useLanguage();
  const inputLabels = locale === "es" ? inputs : ["Meeting", "Ticket", "Document", "Design", "CRM", "AI"];
  return <section id="plataforma" className="landing-hero relative min-h-[820px] scroll-mt-24 overflow-hidden px-5 pb-24 pt-36 md:px-8 md:pt-44">
    <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" /><div className="hero-grid-fade" />
    <div className="relative mx-auto grid max-w-[1380px] gap-14 xl:grid-cols-[.88fr_1.12fr] xl:items-center">
      <div className="hero-copy-scene relative z-10">
        <div className="hero-scene-item inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.17em] text-[var(--brand-blue)]"><Layers3 size={12} /> {t("Enterprise digital operational understanding infrastructure", "Infraestructura empresarial de entendimiento operativo digital")}</div>
        <h1 className="hero-scene-item hero-headline mt-7 max-w-4xl text-[2.8rem] font-semibold leading-[.97] tracking-[-.065em] sm:text-6xl lg:text-[4.6rem]">{t("Reduce the cost of working with misunderstood information.", "Reduce el costo de trabajar con información mal entendida.")}</h1>
        <p className="hero-scene-item hero-primary-copy mt-7 max-w-2xl text-base font-medium leading-7 md:text-lg">{t("Virro reviews whether information moving across teams, processes, tools and AI has enough context, criteria and clarity to move forward with lower risk.", "Virro revisa si la información que se mueve entre áreas, procesos, herramientas e IA tiene suficiente contexto, criterio y claridad para avanzar con menor riesgo.")}</p>
        <p className="hero-scene-item hero-support-copy mt-4 max-w-2xl text-xs leading-6 md:text-sm">{t("It makes missing context, receiver expectations and the next recommended action visible before information becomes work or a decision.", "Hace visible el contexto faltante, lo que necesita el receptor y la siguiente acción recomendada antes de que la información se convierta en trabajo o decisión.")}</p>
        <div className="hero-scene-item mt-9 flex flex-col gap-3 sm:flex-row"><a href="#solicitar-diagnostico" className="brand-primary-button text-sm shadow-[0_20px_60px_rgba(9,105,255,.22)]">{t("Request an audit", "Solicitar auditoría")} <ArrowRight size={15} /></a><Link href="/app" className="brand-secondary-button text-sm">{t("View enterprise demo", "Ver demo enterprise")}</Link></div>
        <div className="hero-scene-item mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[9px] text-[var(--subtle)]"><span className="flex items-center gap-2"><ShieldCheck size={12} className="text-[var(--brand-blue)]" />{t("Data minimization from the audit", "Minimización de datos desde la auditoría")}</span><span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[var(--brand-blue)]" />{t("Probabilistic estimates · human validation", "Estimaciones probabilísticas · validación humana")}</span></div>
      </div>
      <RevealOnScroll className="hero-visual-reveal"><div className="hero-filter-scene hero-product-scene" aria-label={t("Information flowing through Virro's understanding filter", "Información atravesando el filtro de entendimiento de Virro")}>
        <div className="filter-scene-top"><span>{t("Digital flow", "Flujo digital")}</span><span className="filter-live"><i />{t("Understanding observability", "Observabilidad de entendimiento")}</span></div>
        <div className="filter-scene-body">
          <div className="filter-inputs"><p>{t("Ambiguous information", "Información ambigua")}</p>{inputLabels.slice(0, 4).map((label, index) => <span key={label} style={{ "--particle-index": index } as React.CSSProperties}>{label}</span>)}</div>
          <div className="filter-core">
            <div className="filter-core-stage">
              <div className="filter-core-stage-top"><span><Radar size={15} /> Virro Core</span><i>Analyze-Safe</i></div>
              <div className="filter-core-shield"><LockKeyhole size={16} /><span>{t("Privacy Shield active", "Privacy Shield activo")}</span><b>[EMAIL_1]</b></div>
              <div className="filter-core-readiness"><span>{t("Readiness Gate", "Readiness Gate")}</span><strong>68<small>/100</small></strong><div><i /></div><p>{t("Context needs validation", "Contexto por validar")}</p></div>
              <div className="filter-core-context"><span>{t("Context", "Contexto")}</span><span>{t("Receiver", "Receptor")}</span><span>{t("Criteria", "Criterio")}</span></div>
            </div>
          </div>
          <div className="filter-outputs"><p>{t("Executive signal", "Señal ejecutiva")}</p>{outputs.map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i>{index === 3 ? t("Executive signal", "Señal ejecutiva") : label}{index === 1 && <b>68/100</b>}</span>)}</div>
        </div>
        <div className="filter-scene-footer"><span><FileBarChart size={12} />{t("Executive evidence", "Evidencia ejecutiva")}</span><Link href="/app" className="inline-flex items-center gap-2">{t("Open enterprise demo", "Abrir demo enterprise")} <ArrowRight size={12} /></Link></div>
      </div></RevealOnScroll>
    </div>
  </section>;
}
