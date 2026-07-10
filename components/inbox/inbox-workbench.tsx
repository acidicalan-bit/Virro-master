"use client";

import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, FileText, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { analysisEngine } from "@/lib/services/analysis-engine";
import type { AnalysisResult, PackId } from "@/lib/types/understanding";
import { ScoreRing } from "@/components/ui/score-ring";

const packs: { value: PackId; label: string }[] = [
  { value: "product-delivery", label: "Product Delivery" }, { value: "ai-understanding", label: "AI Understanding" }, { value: "handoff-intelligence", label: "Handoff Intelligence" }, { value: "process-understanding", label: "Process Understanding" }, { value: "onboarding", label: "Onboarding & Knowledge Transfer" }, { value: "consulting-delivery", label: "Consulting Delivery" }, { value: "technical-documentation", label: "Technical Documentation" },
];

export function InboxWorkbench() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pack, setPack] = useState<PackId>("product-delivery");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    const rawInput = inputRef.current?.value ?? input;
    if (rawInput.trim().length < 12) return;
    setLoading(true); setResult(null);
    setResult(await analysisEngine.analyze(rawInput, pack));
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <section><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">Understanding Inbox</p><h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">Turn scattered input into operational understanding.</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">Capture a message, brief, handoff or technical note. Virro identifies the context needed for a person, team, tool or AI to act.</p></section>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <article className="panel p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">New Understanding Event</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">Manual capture · analysis stays local in this demo</p></div><div className="grid size-9 place-items-center rounded-lg bg-teal-400/10 text-teal-300"><Plus size={17} /></div></div><label className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">Raw operational input</label><textarea ref={inputRef} defaultValue={input} onInput={(event)=>setInput(event.currentTarget.value)} placeholder="Paste a handoff, requirement, process note, technical decision or incomplete operational message…" className="mt-2 min-h-48 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--input)] p-4 text-sm leading-6 outline-none placeholder:text-[var(--subtle)] focus:border-teal-400/50 focus:ring-4 focus:ring-teal-400/[.06]" /><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><div><label className="mb-2 block text-[11px] font-medium text-[var(--subtle)]">Analysis pack</label><select value={pack} onChange={(event)=>setPack(event.target.value as PackId)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-xs outline-none focus:border-teal-400/50">{packs.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></div><button disabled={loading} onClick={analyze} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 text-xs font-semibold text-slate-950 transition enabled:hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40">{loading?<LoaderCircle size={15} className="animate-spin"/>:<Sparkles size={15}/>}Analyze understanding</button></div><p className="mt-3 text-[10px] text-[var(--subtle)]">The demo uses a deterministic mock analysis service designed to be replaced by an LLM provider.</p></article>

        <article className="panel min-h-[510px] p-5 md:p-6">{!result&&!loading&&<div className="flex h-full min-h-[450px] flex-col items-center justify-center text-center"><div className="grid size-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--subtle)]"><FileText size={20}/></div><h3 className="mt-4 text-sm font-medium">Analysis will appear here</h3><p className="mt-2 max-w-xs text-xs leading-5 text-[var(--subtle)]">Virro will estimate intent, receiver fit, missing context, ambiguity, risk and readiness.</p></div>}{loading&&<div className="flex h-full min-h-[450px] flex-col items-center justify-center"><LoaderCircle className="animate-spin text-teal-300"/><p className="mt-3 text-xs text-[var(--muted)]">Mapping operational understanding…</p></div>}{result&&<div><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal-300">Estimated analysis</p><h2 className="mt-1 text-sm font-semibold">Understanding profile</h2></div><ScoreRing value={result.scores.virroScore} label="Virro Score" compact/></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[10px] text-[var(--subtle)]">Inferred intent</p><p className="mt-1 text-xs leading-5">{result.inferredIntent}</p></div><div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[10px] text-[var(--subtle)]">Likely receiver</p><p className="mt-1 text-xs leading-5">{result.likelyReceiver}</p></div></div><ResultList title="Missing context" icon={<CircleAlert size={14}/>} items={result.missingContext}/><ResultList title="Critical questions" icon={<Sparkles size={14}/>} items={result.criticalQuestions}/><div className="mt-5 grid grid-cols-3 gap-2">{[["DoU",result.scores.degreeOfUnderstanding],["Meaning loss",result.scores.meaningLossRisk],["Handoff",result.scores.handoffReadiness]].map(([label,value])=><div key={String(label)} className="rounded-lg border border-[var(--border)] p-2.5 text-center"><p className="text-lg font-semibold">{value}</p><p className="text-[9px] text-[var(--subtle)]">{label}</p></div>)}</div><button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] py-2.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]">Create event record <ArrowRight size={13}/></button></div>}</article>
      </section>
    </div>
  );
}

function ResultList({title,icon,items}:{title:string;icon:React.ReactNode;items:string[]}){return <div className="mt-5"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">{icon}{title}</div><div className="mt-2 space-y-2">{items.length?items.map((item)=><div key={item} className="flex items-start gap-2 text-[11px] leading-5 text-[var(--muted)]"><CheckCircle2 size={13} className="mt-1 shrink-0 text-teal-300"/>{item}</div>):<p className="text-[11px] text-emerald-300">No material gap detected.</p>}</div></div>}
