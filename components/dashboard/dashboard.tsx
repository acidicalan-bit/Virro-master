"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Braces,
  CircleAlert,
  Database,
  FileBarChart,
  FileWarning,
  Handshake,
  PackagePlus,
  ShieldCheck,
} from "lucide-react";
import { mockEvents } from "@/lib/data/mock-events";
import { buildDashboardInsights } from "@/lib/services/dashboard-insights";
import { localizeModule, moduleMap } from "@/lib/config/modules";
import { useLanguage } from "@/components/i18n/language-provider";
import { listStoredAssistantEvidence, subscribeAssistantEvents } from "@/lib/services/assistant-event-store";
import type { UnderstandingEvent } from "@/lib/types/understanding";
import { operationalText } from "@/lib/i18n/operational-copy";

export function Dashboard() {
  const { locale, t } = useLanguage();
  const [assistantEvents, setAssistantEvents] = useState<UnderstandingEvent[]>([]);
  useEffect(() => {
    const sync = () => setAssistantEvents(listStoredAssistantEvidence().map((item) => item.event));
    const timer = window.setTimeout(sync, 0);
    const unsubscribe = subscribeAssistantEvents(sync);
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, []);
  const insights = useMemo(() => buildDashboardInsights([...assistantEvents, ...mockEvents]), [assistantEvents]);
  const sampleIsSufficient = insights.metrics.totalEvents >= 12;
  const metrics = [
    { label: t("Total Understanding Events", "Total de Understanding Events"), detail: t("Events where information needed to be understood before someone could act.", "Eventos donde una información necesitó ser entendida para poder actuar."), value: insights.metrics.totalEvents, suffix: "", icon: Braces, tone: "blue" },
    { label: t("Consolidated score", "Score consolidado"), detail: t("A consolidated score is withheld when the sample does not support that precision.", "El score consolidado se oculta cuando la muestra no sostiene esa precisión."), value: sampleIsSufficient ? t("Directional", "Direccional") : t("Not determinable", "No determinable"), suffix: "", icon: ShieldCheck, tone: "teal" },
    { label: t("Evidence confidence", "Confianza de evidencia"), detail: t("Confidence reflects sample size, coverage and absent sources.", "La confianza refleja muestra, cobertura y fuentes ausentes."), value: sampleIsSufficient ? t("Medium", "Media") : t("Low", "Baja"), suffix: "", icon: CircleAlert, tone: "rose" },
    { label: t("Handoffs at risk", "Handoffs en riesgo"), detail: t("Transfers that may not be ready for the next team to execute.", "Entregas entre áreas que podrían no estar listas para que el siguiente equipo ejecute."), value: insights.metrics.handoffsAtRisk, suffix: "", icon: Handshake, tone: "violet" },
  ];
  const demoSteps = [
    { number: "01", label: t("Review the executive dashboard", "Revisa el tablero ejecutivo"), href: "/app" },
    { number: "02", label: t("Open Demo Scenarios", "Abre Escenarios demo"), href: "/app/demo-scenarios" },
    { number: "03", label: t("Try the Understanding Inbox", "Prueba la Bandeja de entendimiento"), href: "/app/inbox" },
    { number: "04", label: t("Review a specific analysis pack", "Revisa un pack específico"), href: "/app/handoff-intelligence" },
    { number: "05", label: t("Open Reports as a client deliverable", "Consulta Reportes como ejemplo de entregable"), href: "/app/reports" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[.045] px-4 py-3 sm:flex-row sm:items-center"><span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.11em] text-sky-300"><Database size={13} />{t("Demo workspace · Simulated data", "Demo workspace · Datos simulados")}</span><span className="text-[10px] leading-4 text-[var(--muted)]">{t("Aperture Systems is a demo workspace used to demonstrate how Virro analyzes Understanding Events.", "Aperture Systems es un workspace demo para mostrar cómo Virro analiza Understanding Events.")}</span></div>
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">05 · {t("Executive Dashboard", "Tablero ejecutivo")}</p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">{t("Where operational meaning is at risk.", "Dónde está en riesgo el significado operativo.")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{t("A decision view of risk concentration, readiness, understanding debt and the next corrective action.", "Vista ejecutiva de concentración de riesgo, readiness, deuda de entendimiento y próximas acciones correctivas.")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/demo-scenarios" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 text-xs font-medium"><PackagePlus size={14} /> {t("Explore demo scenarios", "Explorar escenarios demo")}</Link>
          <Link href="/app/reports" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-semibold text-slate-950"><FileBarChart size={14} /> {t("View executive report example", "Ver ejemplo de reporte ejecutivo")}</Link>
        </div>
      </section>

      <section className="rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4">
        <h2 className="text-xs font-semibold text-teal-200">{t("What you are seeing", "Qué estás viendo")}</h2>
        <p className="mt-1.5 max-w-4xl text-xs leading-5 text-[var(--muted)]">{t("This dashboard shows where an organization may be accumulating understanding debt. Each event represents a moment where information must be understood so a team, consultant, tool or AI can act. Virro estimates risk, readiness and missing context to help decide what to correct first.", "Este tablero muestra dónde una empresa podría estar acumulando deuda de entendimiento. Cada evento representa un momento donde una información necesita ser entendida para que un equipo, consultora, herramienta o IA pueda actuar. Virro estima riesgos, readiness y contexto faltante para ayudar a decidir qué corregir primero.")}</p>
      </section>

      <section className="panel p-4 md:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-indigo-300">{t("Private demo guide", "Guía de demo privada")}</p><h2 className="mt-1.5 text-sm font-semibold">{t("How to tour this demo", "Cómo recorrer esta demo")}</h2></div><p className="max-w-xl text-[10px] leading-5 text-[var(--subtle)]">{t("A suggested path to connect executive risk, operational evidence and the final client deliverable.", "Un recorrido sugerido para conectar riesgo ejecutivo, evidencia operativa y entregable final para cliente.")}</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{demoSteps.map((step) => <Link key={step.number} href={step.href} className="group rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 transition hover:border-indigo-300/20 hover:bg-indigo-400/[.035]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold text-indigo-300">{step.number}</span><ArrowRight size={12} className="text-[var(--subtle)] transition group-hover:translate-x-0.5 group-hover:text-indigo-300" /></div><p className="mt-2 text-[10px] font-medium leading-4">{step.label}</p></Link>)}</div></section>

      <section className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-[9px] leading-4 text-[var(--subtle)] lg:grid-cols-3"><p className="flex items-start gap-2"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-teal-300" />{t("Virro must be more trustworthy than intelligent.", "Virro debe ser más confiable que inteligente.")}</p><p className="flex items-start gap-2"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-teal-300" />{t("Virro does not evaluate people and is not designed to monitor employees.", "Virro no evalúa personas. Estima riesgos de interpretación en información operativa. Virro no está diseñado para vigilar empleados.")}</p><p className="flex items-start gap-2"><CircleAlert size={12} className="mt-0.5 shrink-0 text-teal-300" />{t("Scores are probabilistic estimates, not guarantees. Virro does not retain raw private text by default.", "Los scores son estimaciones probabilísticas, no garantías. Virro no guarda texto privado crudo por defecto.")}</p></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, detail, value, suffix, icon: Icon, tone }) => (
          <article key={label} className="panel p-4" title={detail}>
            <div className={`grid size-8 place-items-center rounded-lg metric-${tone}`}><Icon size={16} /></div>
            <p className="mt-4 min-h-8 text-[11px] leading-4 text-[var(--muted)]">{label}</p>
            <div className="mt-1 flex items-baseline gap-1"><span className={`${typeof value === "number" ? "text-3xl" : "text-lg"} font-semibold tracking-[-0.04em]`}>{value}</span><span className="text-[10px] text-[var(--subtle)]">{suffix}</span></div>
            <p className="mt-2 text-[9px] leading-4 text-[var(--subtle)]">{detail}</p>
          </article>
        ))}
      </section>

      {assistantEvents.length > 0 && <section className="rounded-xl border border-indigo-400/15 bg-indigo-400/[.04] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-indigo-300">{t("Assistant evidence connected", "Evidencia del asistente conectada")}</p><p className="mt-2 text-xs text-[var(--muted)]">{t(`${assistantEvents.length} saved assistant event(s) now contribute to dashboard risk, readiness and understanding debt estimates.`, `${assistantEvents.length} evento(s) guardado(s) por el asistente ahora alimentan las estimaciones de riesgo, readiness y deuda de entendimiento del dashboard.`)}</p></section>}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <article className="panel p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">{t("Risk by understanding area", "Riesgo por área de entendimiento")}</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">{t("Average Meaning Loss Risk by active pack", "Riesgo promedio de Meaning Loss por pack activo")}</p></div><span className="text-[9px] uppercase tracking-[.12em] text-[var(--subtle)]">{t("Higher = more exposed", "Mayor = más expuesto")}</span></div>
          <div className="mt-6 space-y-4">
            {insights.areaRisk.map((area) => {
              const areaModule = moduleMap.get(area.pack);
              const band = area.risk >= 55 ? { label: t("High directional signal", "Señal direccional alta"), width: "75%", tone: "bg-rose-400" } : area.risk >= 35 ? { label: t("Medium directional signal", "Señal direccional media"), width: "50%", tone: "bg-amber-300" } : { label: t("Low directional signal", "Señal direccional baja"), width: "25%", tone: "bg-teal-300" };
              return <div key={area.pack}><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-[var(--muted)]">{areaModule ? localizeModule(areaModule, locale).label : area.label}</span><span className="text-[9px] font-semibold">{band.label} · n={area.eventCount}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className={`h-full rounded-full ${band.tone}`} style={{ width: band.width }} /></div></div>;
            })}
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center gap-2"><FileWarning size={16} className="text-rose-300" /><h2 className="text-sm font-semibold">{t("Top Interpretation Risks", "Principales riesgos de interpretación")}</h2></div>
          <div className="mt-4 space-y-2">
            {insights.topRisks.map((item, index) => <div key={item.risk} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-rose-400/[.08] text-[10px] font-semibold text-rose-300">{index + 1}</span><div><p className="text-xs leading-5">{operationalText(locale, item.risk)}</p><p className="mt-0.5 text-[9px] text-[var(--subtle)]">{t(`Observed in ${item.count} active event${item.count === 1 ? "" : "s"}`, `Observado en ${item.count} evento${item.count === 1 ? "" : "s"} activo${item.count === 1 ? "" : "s"}`)}</p></div></div>)}
          </div>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-sm font-semibold">{t("Understanding Debt Backlog", "Backlog de deuda de entendimiento")}</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">{t("Missing context ranked by current operational exposure", "Contexto faltante priorizado por exposición operativa actual")}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-[.12em] text-[var(--subtle)]"><th className="px-5 py-3 font-medium">{t("Context debt", "Deuda de contexto")}</th><th className="px-4 py-3 font-medium">{t("Priority", "Prioridad")}</th><th className="px-4 py-3 font-medium">{t("Evidence", "Evidencia")}</th><th className="px-4 py-3 font-medium">{t("Affected events", "Eventos afectados")}</th><th className="px-5 py-3 font-medium">{t("First move", "Primer paso")}</th></tr></thead><tbody>{insights.backlog.slice(0, 6).map((item) => <tr key={item.gap} className="border-b border-[var(--border)] last:border-0"><td className="px-5 py-3 text-xs font-medium">{operationalText(locale, item.gap)}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[9px] ${item.priority === "Critical" ? "border-rose-400/20 bg-rose-400/[.08] text-rose-300" : "border-amber-400/20 bg-amber-400/[.08] text-amber-300"}`}>{item.priority === "Critical" ? t("Critical", "Crítica") : item.priority === "High" ? t("High", "Alta") : t("Medium", "Media")}</span></td><td className="px-4 py-3 text-[10px]">{t("Exploratory finding", "Hallazgo exploratorio")}</td><td className="px-4 py-3 text-[10px] text-[var(--muted)]">{item.events.join(", ")}</td><td className="px-5 py-3 text-[10px] text-[var(--muted)]">{t("Assign an owner and answer the blocking question", "Asignar responsable y responder la pregunta bloqueante")}</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-5"><div className="flex items-center gap-2"><Handshake size={16} className="text-amber-300" /><h2 className="text-sm font-semibold">{t("Handoffs requiring review", "Handoffs que requieren revisión")}</h2></div><div className="mt-4 space-y-3">{insights.handoffsAtRisk.length ? insights.handoffsAtRisk.map(event => <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium">{operationalText(locale, event.title)}</p><span className="text-[9px] font-semibold text-amber-300">{t("Needs context", "Necesita contexto")}</span></div><p className="mt-2 text-[10px] text-[var(--subtle)]">{event.sourceRole} → {event.targetRole} · {t("Missing", "Falta")}: {event.missingContext.map(gap => operationalText(locale, gap)).join(", ")}</p></div>) : <p className="text-xs text-emerald-300">{t("No active handoff requires review in this demo sample.", "Ningún handoff requiere revisión en esta muestra demo.")}</p>}</div></article>
        <article className="panel p-5"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-300" /><h2 className="text-sm font-semibold">{t("Recommended Next Actions", "Próximas acciones recomendadas")}</h2></div><div className="mt-4 space-y-3">{insights.recommendedActions.map((action, index) => <div key={action} className="flex items-start gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-400/10 text-[10px] font-semibold text-teal-300">{index + 1}</span><p className="pt-0.5 text-xs leading-5 text-[var(--muted)]">{operationalText(locale, action)}</p></div>)}</div></article>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <AnswerCard question={t("Where is interpretation risk concentrated?", "¿Dónde se concentra el riesgo de interpretación?")} answer={operationalText(locale, insights.answers.losingUnderstanding)} />
        <AnswerCard question={t("Which area has the highest risk?", "¿Qué área tiene más riesgo?")} answer={operationalText(locale, insights.answers.highestRiskArea)} />
        <AnswerCard question={t("What should we correct first?", "¿Qué deberíamos corregir primero?")} answer={operationalText(locale, insights.answers.firstCorrection)} />
      </section>
    </div>
  );
}

function AnswerCard({ question, answer }: { question: string; answer: string }) {
  const { t } = useLanguage();
  return <article className="rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-teal-300">{t("Executive answer", "Respuesta ejecutiva")}</p><h3 className="mt-2 text-xs font-semibold">{question}</h3><p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{answer}</p></article>;
}
