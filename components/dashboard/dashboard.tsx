import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Braces,
  CircleAlert,
  FileWarning,
  Handshake,
  PackagePlus,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { mockEvents } from "@/lib/data/mock-events";
import { buildDashboardInsights } from "@/lib/services/dashboard-insights";

const insights = buildDashboardInsights(mockEvents);

const metrics = [
  { label: "Total Understanding Events", value: insights.metrics.totalEvents, suffix: "", icon: Braces, tone: "blue" },
  { label: "Average DoU Score", value: insights.metrics.averageDoU, suffix: "/100", icon: Sparkles, tone: "teal" },
  { label: "Meaning Loss Risk promedio", value: insights.metrics.averageMeaningLossRisk, suffix: "/100", icon: CircleAlert, tone: "rose" },
  { label: "Handoffs at risk", value: insights.metrics.handoffsAtRisk, suffix: "", icon: Handshake, tone: "violet" },
  { label: "AI Understanding Debt", value: insights.metrics.aiUnderstandingDebt, suffix: "/100", icon: Bot, tone: "rose" },
  { label: "Technical Understanding Readiness", value: insights.metrics.technicalReadiness, suffix: "%", icon: ShieldCheck, tone: "blue" },
  { label: "Onboarding Readiness", value: insights.metrics.onboardingReadiness, suffix: "%", icon: UsersRound, tone: "teal" },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">05 · Executive Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">Where operational understanding is being lost.</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">A decision view of risk concentration, readiness, understanding debt and the next corrective action.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/demo-scenarios" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 text-xs font-medium"><PackagePlus size={14} /> Demo scenarios</Link>
          <Link href="/inbox" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-semibold text-slate-950">New event <ArrowRight size={14} /></Link>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-[10px] text-[var(--subtle)]">
        <CircleAlert size={13} /> Scores are probabilistic estimates of operational risk and readiness—not guarantees or personal evaluations.
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, suffix, icon: Icon, tone }) => (
          <article key={label} className="panel p-4">
            <div className={`grid size-8 place-items-center rounded-lg metric-${tone}`}><Icon size={16} /></div>
            <p className="mt-4 min-h-8 text-[11px] leading-4 text-[var(--muted)]">{label}</p>
            <div className="mt-1 flex items-baseline gap-1"><span className="text-3xl font-semibold tracking-[-0.04em]">{value}</span><span className="text-[10px] text-[var(--subtle)]">{suffix}</span></div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <article className="panel p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Risk by understanding area</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">Average Meaning Loss Risk by active pack</p></div><span className="text-[9px] uppercase tracking-[.12em] text-[var(--subtle)]">Higher = more exposed</span></div>
          <div className="mt-6 space-y-4">
            {insights.areaRisk.map((area) => (
              <div key={area.pack}>
                <div className="mb-2 flex items-center justify-between text-xs"><span className="text-[var(--muted)]">{area.label}</span><span className="font-semibold">{area.risk}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className={`h-full rounded-full ${area.risk >= 55 ? "bg-rose-400" : area.risk >= 35 ? "bg-amber-300" : "bg-teal-300"}`} style={{ width: `${area.risk}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center gap-2"><FileWarning size={16} className="text-rose-300" /><h2 className="text-sm font-semibold">Top Understanding Risks</h2></div>
          <div className="mt-4 space-y-2">
            {insights.topRisks.map((item, index) => <div key={item.risk} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-rose-400/[.08] text-[10px] font-semibold text-rose-300">{index + 1}</span><div><p className="text-xs leading-5">{item.risk}</p><p className="mt-0.5 text-[9px] text-[var(--subtle)]">Observed in {item.count} active event{item.count === 1 ? "" : "s"}</p></div></div>)}
          </div>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-sm font-semibold">Understanding Debt Backlog</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">Missing context ranked by current operational exposure</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-[.12em] text-[var(--subtle)]"><th className="px-5 py-3 font-medium">Context debt</th><th className="px-4 py-3 font-medium">Priority</th><th className="px-4 py-3 font-medium">Exposure</th><th className="px-4 py-3 font-medium">Affected events</th><th className="px-5 py-3 font-medium">First move</th></tr></thead><tbody>{insights.backlog.slice(0, 6).map((item) => <tr key={item.gap} className="border-b border-[var(--border)] last:border-0"><td className="px-5 py-3 text-xs font-medium">{item.gap}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[9px] ${item.priority === "Critical" ? "border-rose-400/20 bg-rose-400/[.08] text-rose-300" : "border-amber-400/20 bg-amber-400/[.08] text-amber-300"}`}>{item.priority}</span></td><td className="px-4 py-3 text-xs">{item.exposure}/100</td><td className="px-4 py-3 text-[10px] text-[var(--muted)]">{item.events.join(", ")}</td><td className="px-5 py-3 text-[10px] text-[var(--muted)]">Assign owner and answer the blocking question</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-5">
          <div className="flex items-center gap-2"><Handshake size={16} className="text-amber-300" /><h2 className="text-sm font-semibold">Handoffs not ready</h2></div>
          <div className="mt-4 space-y-3">{insights.handoffsAtRisk.length ? insights.handoffsAtRisk.map((event) => <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium">{event.title}</p><span className="text-xs font-semibold text-amber-300">{event.scores.handoffReadiness}/100</span></div><p className="mt-2 text-[10px] text-[var(--subtle)]">{event.sourceRole} → {event.targetRole} · Missing: {event.missingContext.join(", ")}</p></div>) : <p className="text-xs text-emerald-300">No active handoff is currently below the readiness threshold.</p>}</div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-300" /><h2 className="text-sm font-semibold">Recommended Next Actions</h2></div>
          <div className="mt-4 space-y-3">{insights.recommendedActions.map((action, index) => <div key={action} className="flex items-start gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-400/10 text-[10px] font-semibold text-teal-300">{index + 1}</span><p className="pt-0.5 text-xs leading-5 text-[var(--muted)]">{action}</p></div>)}</div>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <AnswerCard question="¿Dónde está perdiendo entendimiento la empresa?" answer={insights.answers.losingUnderstanding} />
        <AnswerCard question="¿Qué área tiene más riesgo?" answer={insights.answers.highestRiskArea} />
        <AnswerCard question="¿Qué deberíamos corregir primero?" answer={insights.answers.firstCorrection} />
      </section>
    </div>
  );
}

function AnswerCard({ question, answer }: { question: string; answer: string }) {
  return <article className="rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-teal-300">Executive answer</p><h3 className="mt-2 text-xs font-semibold">{question}</h3><p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{answer}</p></article>;
}
