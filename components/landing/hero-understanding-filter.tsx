"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, FileBarChart, Layers3, Radar, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";

const inputs = ["Junta", "Pantalla", "Ticket", "Documento", "Call", "Diseño", "CRM", "BI", "IA"];
const filters = ["Contexto", "Criterio", "Claridad", "Receptor", "Riesgo", "Readiness"];
const outputs = ["Understanding Event", "Readiness Gate", "Output Bundle", "Pack recomendado", "Executive Report"];

export function HeroUnderstandingFilter() {
  const { locale, t } = useLanguage();
  const inputLabels = locale === "es" ? inputs : ["Meeting", "Screen", "Ticket", "Document", "Call", "Design", "CRM", "BI", "AI"];
  return <section id="plataforma" className="landing-hero relative min-h-[940px] scroll-mt-24 overflow-hidden px-5 pb-24 pt-36 md:px-8 md:pt-44">
    <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" /><div className="hero-grid-fade" />
    <div className="relative mx-auto grid max-w-[1380px] gap-14 xl:grid-cols-[.88fr_1.12fr] xl:items-center">
      <div className="hero-copy-scene relative z-10">
        <div className="hero-scene-item inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.17em] text-[var(--brand-blue)]"><Layers3 size={12} /> {t("Enterprise digital operational understanding infrastructure", "Infraestructura empresarial de entendimiento operativo digital")}</div>
        <h1 className="hero-scene-item mt-7 max-w-4xl text-[2.8rem] font-semibold leading-[.97] tracking-[-.065em] sm:text-6xl lg:text-[5.25rem]">{t("Reduce the cost of working with misunderstood information.", "Reduce el costo de trabajar con información mal entendida.")}</h1>
        <p className="hero-scene-item mt-7 max-w-2xl text-base font-medium leading-7 text-[var(--text)] md:text-lg">{t("Virro reviews whether information moving across teams, processes, tools and AI has the context, criteria and clarity required to move forward.", "Virro revisa si la información que se mueve entre áreas, procesos, herramientas e IA tiene el contexto, criterio y claridad necesarios para avanzar.")}</p>
        <p className="hero-scene-item mt-4 max-w-2xl text-xs leading-6 text-[var(--muted)] md:text-sm">{t("Before a meeting becomes tasks, a request reaches delivery, a design reaches development or an instruction reaches AI, Virro makes visible what is missing and what the next receiver needs to act with less risk.", "Antes de que una junta se vuelva tareas, una solicitud llegue a delivery, un diseño llegue a desarrollo o una instrucción llegue a IA, Virro hace visible qué falta y qué necesita el siguiente receptor para actuar con menor riesgo.")}</p>
        <div className="hero-scene-item mt-9 flex flex-col gap-3 sm:flex-row"><a href="#solicitar-diagnostico" className="brand-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-[0_20px_60px_rgba(9,105,255,.22)]">{t("Diagnose a critical flow", "Diagnosticar un flujo crítico")} <ArrowRight size={15} /></a><a href="#como-funciona" className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-6 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-lg">{t("See how Virro works", "Ver cómo funciona Virro")}</a></div>
        <div className="hero-scene-item mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[9px] text-[var(--subtle)]"><span className="flex items-center gap-2"><ShieldCheck size={12} className="text-[var(--brand-blue)]" />{t("Data minimization from the audit", "Minimización de datos desde la auditoría")}</span><span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[var(--brand-blue)]" />{t("Probabilistic estimates · human validation", "Estimaciones probabilísticas · validación humana")}</span></div>
      </div>
      <RevealOnScroll className="hero-visual-reveal"><div className="hero-filter-scene hero-product-scene" aria-label={t("Information flowing through Virro's understanding filter", "Información atravesando el filtro de entendimiento de Virro")}>
        <div className="filter-scene-top"><span>{t("Digital flow", "Flujo digital")}</span><span className="filter-live"><i />{t("Understanding observability", "Observabilidad de entendimiento")}</span></div>
        <div className="filter-scene-body">
          <div className="filter-inputs"><p>{t("Scattered input", "Input disperso")}</p>{inputLabels.map((label, index) => <span key={label} style={{ "--particle-index": index } as React.CSSProperties}>{label}</span>)}</div>
          <div className="filter-core"><div className="filter-core-rings" aria-hidden /><div className="filter-core-mark"><Radar size={20} /><strong>Virro</strong><small>Understanding Filter</small></div><div className="filter-signals">{filters.map((label, index) => <span key={label} style={{ "--signal-index": index } as React.CSSProperties}>{locale === "es" ? label : ["Context", "Criteria", "Clarity", "Receiver", "Risk", "Readiness"][index]}</span>)}</div></div>
          <div className="filter-outputs"><p>{t("Ready to move forward", "Listo para avanzar")}</p>{outputs.map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i>{label}{index === 1 && <b>68</b>}</span>)}</div>
        </div>
        <div className="filter-scene-footer"><span><FileBarChart size={12} />{t("Executive evidence", "Evidencia ejecutiva")}</span><Link href="/app" className="inline-flex items-center gap-2">{t("Open enterprise demo", "Abrir demo enterprise")} <ArrowRight size={12} /></Link></div>
      </div></RevealOnScroll>
    </div>
  </section>;
}
