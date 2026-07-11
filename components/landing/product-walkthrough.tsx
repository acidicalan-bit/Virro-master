"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChartNoAxesCombined, CheckCircle2, FileBarChart, ScanSearch, ShieldCheck } from "lucide-react";
import { CountUpMetric, MotionCard } from "@/components/landing/motion/motion-primitives";

type WalkthroughId = "dashboard" | "assistant" | "report";

const tabs: Array<{ id: WalkthroughId; label: string; description: string; href: string }> = [
  { id: "dashboard", label: "Dashboard", description: "Concentración de riesgo y readiness", href: "/app" },
  { id: "assistant", label: "Asistente", description: "Del input ambiguo al análisis auditable", href: "/app/inbox" },
  { id: "report", label: "Reporte ejecutivo", description: "Hallazgos convertidos en decisión", href: "/app/reports" },
];

export function ProductWalkthrough() {
  const [active, setActive] = useState<WalkthroughId>("dashboard");
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="walkthrough-shell mt-10 overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_32px_100px_rgba(0,0,0,.16)]">
      <div className="grid border-b border-[var(--border)] lg:grid-cols-[.35fr_.65fr]">
        <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r lg:p-5">
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--subtle)]">Demo preview · Datos simulados</p>
          <div role="tablist" aria-label="Módulos del producto" className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {tabs.map((tab, index) => (
              <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`walkthrough-${tab.id}`} onClick={() => setActive(tab.id)} className={`walkthrough-tab group relative rounded-xl border p-3 text-left ${active === tab.id ? "is-active border-sky-400/25 bg-sky-400/[.055]" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--hover)]"}`}>
                <div className="flex items-center justify-between"><span className={`text-[9px] font-semibold ${active === tab.id ? "text-[var(--brand-blue)]" : "text-[var(--subtle)]"}`}>0{index + 1}</span><ArrowRight size={12} className={`transition-transform ${active === tab.id ? "translate-x-0 text-[var(--brand-blue)]" : "-translate-x-1 text-[var(--subtle)] group-hover:translate-x-0"}`} /></div>
                <p className="mt-2 text-xs font-semibold">{tab.label}</p>
                <p className="mt-1 text-[9px] leading-4 text-[var(--subtle)]">{tab.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="visual-dark min-w-0 bg-[#090d13] p-4 text-[#f2f5f7] md:p-6">
          <div key={active} id={`walkthrough-${active}`} role="tabpanel" className="walkthrough-panel">
            {active === "dashboard" && <DashboardScene />}
            {active === "assistant" && <AssistantScene />}
            {active === "report" && <ReportScene />}
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center md:px-6">
        <div><h3 className="text-sm font-semibold">{current.label}</h3><p className="mt-1 text-[10px] text-[var(--muted)]">{current.description}</p></div>
        <Link href={current.href} className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 text-[10px] font-semibold transition hover:-translate-y-0.5 hover:border-sky-400/25">Abrir módulo en demo <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" /></Link>
      </div>
    </div>
  );
}

function DashboardScene() {
  return <div><div className="flex items-center justify-between"><div><p className="text-[8px] font-semibold uppercase tracking-[.13em] text-sky-300">Executive workspace</p><h3 className="mt-1 text-sm font-semibold">Dónde se concentra el riesgo</h3></div><ChartNoAxesCombined size={18} className="text-sky-300" /></div><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="DoU Score" value={68} tone="teal" /><Metric label="Meaning Loss" value={34} tone="rose" /><Metric label="Handoffs" value={1} tone="amber" suffix="" /></div><div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_.85fr]"><MotionCard className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-[9px] font-semibold">Riesgo por área</p><div className="mt-4 space-y-3"><RiskLine label="Documentación técnica" value="61" width="61%" tone="rose" /><RiskLine label="Handoff Intelligence" value="38" width="38%" tone="amber" /><RiskLine label="Product Delivery" value="24" width="24%" tone="teal" /></div></MotionCard><MotionCard className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-[9px] font-semibold">Siguiente acción</p><div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-400/[.045] p-3"><p className="text-[8px] uppercase tracking-[.1em] text-sky-300">UE-2479</p><p className="mt-2 text-[10px] font-medium leading-4">Resolver ownership de rollback antes de migrar consumidores.</p></div></MotionCard></div></div>;
}

function AssistantScene() {
  return <div><div className="flex items-center justify-between"><div><p className="text-[8px] font-semibold uppercase tracking-[.13em] text-indigo-300">Understanding workflow</p><h3 className="mt-1 text-sm font-semibold">De ambigüedad a preguntas críticas</h3></div><ScanSearch size={18} className="text-indigo-300" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><MotionCard className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-[8px] uppercase tracking-[.1em] text-[var(--subtle)]">Input ambiguo</p><p className="mt-3 text-[11px] leading-5">“Mover el servicio sin afectar a los consumidores.”</p><div className="mt-4 flex items-center gap-2 text-[8px] text-rose-300"><ShieldCheck size={11} /> Contexto operativo insuficiente</div></MotionCard><MotionCard className="rounded-xl border border-indigo-400/15 bg-indigo-400/[.035] p-4"><p className="text-[8px] uppercase tracking-[.1em] text-indigo-300">Pack recomendado</p><p className="mt-3 text-xs font-semibold">Handoff Intelligence</p><p className="mt-2 text-[9px] leading-4 text-[var(--muted)]">Target receiver: Development → QA</p></MotionCard></div><div className="mt-3 rounded-xl border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-semibold">AnalysisTrace</p><span className="text-[8px] text-[var(--subtle)]">3 señales detectadas</span></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{["¿Quién aprueba el rollback?", "¿Qué consumidores migran primero?", "¿Qué evidencia define éxito?"].map((question) => <div key={question} className="flex items-start gap-2 rounded-lg border border-white/[.06] p-3 text-[9px] leading-4 text-[var(--muted)]"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-indigo-300" />{question}</div>)}</div></div></div>;
}

function ReportScene() {
  return <div><div className="flex items-center justify-between"><div><p className="text-[8px] font-semibold uppercase tracking-[.13em] text-sky-300">Virro Enterprise Report</p><h3 className="mt-1 text-sm font-semibold">Meaning Loss Audit</h3></div><FileBarChart size={18} className="text-sky-300" /></div><div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-white/[.07] bg-white/[.07] sm:grid-cols-2">{[["Dolor detectado", "Ownership de rollback no definido"], ["Eventos revisados", "4 · datos simulados"], ["Score estimado", "Handoff Readiness · 48 / 100"], ["Recomendación", "Piloto de Handoff Intelligence"]].map(([label, value], index) => <div key={label} className="bg-[#0b1019] p-4"><div className="flex justify-between"><p className="text-[8px] uppercase tracking-[.1em] text-[var(--subtle)]">{label}</p><span className="text-[8px] text-sky-300">0{index + 1}</span></div><p className={`mt-3 text-[10px] font-medium leading-4 ${index === 0 ? "text-rose-300" : index === 2 ? "text-sky-300" : ""}`}>{value}</p></div>)}</div><p className="mt-3 flex items-center gap-2 text-[8px] text-[var(--subtle)]"><ShieldCheck size={11} className="text-sky-300" /> Estimación demo · requiere validación humana</p></div>;
}

function Metric({ label, value, tone, suffix = "/100" }: { label: string; value: number; tone: "teal" | "rose" | "amber"; suffix?: string }) {
  const color = tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : "text-teal-300";
  return <MotionCard className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><p className="text-[8px] text-[var(--subtle)]">{label}</p><p className={`mt-1 text-xl font-semibold tracking-[-.04em] ${color}`}><CountUpMetric value={value} /><span className="ml-1 text-[7px] font-normal text-[var(--subtle)]">{suffix}</span></p></MotionCard>;
}

function RiskLine({ label, value, width, tone }: { label: string; value: string; width: string; tone: "teal" | "rose" | "amber" }) {
  const color = tone === "rose" ? "bg-rose-400" : tone === "amber" ? "bg-amber-300" : "bg-teal-300";
  return <div><div className="flex justify-between text-[8px] text-[var(--muted)]"><span>{label}</span><span>{value}</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.07]"><div className={`h-full rounded-full ${color}`} style={{ width }} /></div></div>;
}
