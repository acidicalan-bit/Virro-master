import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleAlert, Clock3, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { mockEvents, workspaceStats } from "@/lib/data/mock-events";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatusPill } from "@/components/ui/status-pill";

const metrics = [
  { label: "Virro Score", value: workspaceStats.virroScore, suffix: "/100", change: "+4.2%", icon: Sparkles, tone: "teal" },
  { label: "Open events", value: workspaceStats.openEvents, suffix: "", change: "12 need context", icon: Clock3, tone: "blue" },
  { label: "Meaning loss risk", value: workspaceStats.atRisk, suffix: " events", change: "−2 this week", icon: CircleAlert, tone: "rose" },
  { label: "Ready for action", value: workspaceStats.readyForAction, suffix: "%", change: "+8.1%", icon: ShieldCheck, tone: "violet" },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">Executive understanding</p><h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">Operational clarity, at a glance.</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Monitor where understanding enables action—and where missing context creates execution risk.</p></div>
        <Link href="/inbox" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(94,234,212,.14)] transition hover:bg-teal-200"><Plus size={15} /> New Understanding Event</Link>
      </section>

      <p className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-[11px] text-[var(--subtle)]">Scores are probabilistic estimates based on available operational signals—not absolute certainty.</p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, suffix, change, icon: Icon, tone }) => (
          <article key={label} className="panel group p-4">
            <div className="flex items-center justify-between"><div className={`grid size-8 place-items-center rounded-lg metric-${tone}`}><Icon size={16} /></div><ArrowUpRight size={15} className="text-[var(--subtle)] transition group-hover:text-[var(--muted)]" /></div>
            <p className="mt-5 text-xs text-[var(--muted)]">{label}</p><div className="mt-1 flex items-baseline gap-1"><span className="text-3xl font-semibold tracking-[-0.04em]">{value}</span><span className="text-xs text-[var(--subtle)]">{suffix}</span></div><p className="mt-2 text-[11px] text-[var(--subtle)]">{change}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_.85fr]">
        <article className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><h2 className="text-sm font-semibold">Understanding Inbox</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">Recent events requiring operational attention</p></div><Link href="/inbox" className="flex items-center gap-1 text-xs font-medium text-teal-300">View all <ArrowRight size={13} /></Link></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-[0.12em] text-[var(--subtle)]"><th className="px-5 py-3 font-medium">Event</th><th className="px-4 py-3 font-medium">Team</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Virro</th><th className="px-5 py-3 font-medium">Received</th></tr></thead>
              <tbody>{mockEvents.map((event) => <tr key={event.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]"><td className="px-5 py-3.5"><p className="text-xs font-medium">{event.title}</p><p className="mt-1 text-[10px] text-[var(--subtle)]">{event.id} · {event.source}</p></td><td className="px-4 py-3.5 text-xs text-[var(--muted)]">{event.team}</td><td className="px-4 py-3.5"><StatusPill status={event.status} /></td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className="text-xs font-semibold">{event.scores.virroScore}</span><div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className="h-full rounded-full bg-teal-300" style={{ width: `${event.scores.virroScore}%` }} /></div></div></td><td className="px-5 py-3.5 text-[11px] text-[var(--subtle)]">{event.createdAt}</td></tr>)}</tbody>
            </table>
          </div>
        </article>

        <article className="panel p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">Readiness profile</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">Workspace estimates · last 30 days</p></div><span className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--subtle)]">128 signals</span></div><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><ScoreRing value={78} label="Handoff readiness" compact /><ScoreRing value={66} label="Automation readiness" compact /><ScoreRing value={72} label="Technical readiness" compact /><ScoreRing value={81} label="Onboarding readiness" compact /></div><div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[.06] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-300"><CircleAlert size={15} />Primary risk signal</div><p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">Ownership is implicit in 19% of cross-team handoffs. Clarifying accountable receivers could improve readiness.</p></div></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="panel p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Understanding flow</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">Event movement across operational stages</p></div><span className="text-[10px] text-[var(--subtle)]">This week</span></div><div className="mt-7 grid grid-cols-4 gap-2">{[{l:"Captured",v:86,c:"bg-sky-400"},{l:"Classified",v:73,c:"bg-indigo-400"},{l:"Context ready",v:58,c:"bg-amber-300"},{l:"Action ready",v:49,c:"bg-teal-300"}].map((stage,index)=><div key={stage.l} className="relative"><div className="mb-2 flex items-end gap-1"><span className="text-xl font-semibold">{stage.v}</span>{index<3&&<span className="mb-0.5 text-[9px] text-[var(--subtle)]">events</span>}</div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className={`h-full ${stage.c}`} style={{width:`${Math.max(40,100-index*16)}%`}} /></div><p className="mt-2 text-[10px] text-[var(--subtle)]">{stage.l}</p></div>)}</div></article>
        <article className="panel p-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-teal-400/10 text-teal-300"><Sparkles size={17} /></div><div><h2 className="text-sm font-semibold">Operational insight</h2><p className="text-[11px] text-[var(--subtle)]">Pattern detected across Product & Platform</p></div></div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">Technical decisions are documented, but the reason behind them is often absent. Capture decision context to reduce future AI understanding debt.</p><Link href="/technical-documentation" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-teal-300">Open technical signals <ArrowRight size={13} /></Link></article>
      </section>
    </div>
  );
}
