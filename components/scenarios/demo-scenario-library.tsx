"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, FileOutput, LoaderCircle, Play, ShieldCheck, Sparkles } from "lucide-react";
import { demoScenarios } from "@/lib/data/demo-scenarios";
import { createUnderstandingEvent, statusFromScores } from "@/lib/domain/understanding-event";
import { workspace } from "@/lib/data/seed";
import { analysisEngine } from "@/services/analysis/analysisEngine";
import type { AnalysisResult, UnderstandingEvent } from "@/lib/types/understanding";
import type { DemoScenario } from "@/lib/types/demo-scenario";
import { ScoreRing } from "@/components/ui/score-ring";

export function DemoScenarioLibrary() {
  const [selected, setSelected] = useState<DemoScenario>(demoScenarios[0]);
  const [running, setRunning] = useState(false);
  const [event, setEvent] = useState<UnderstandingEvent | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function selectScenario(scenario: DemoScenario) {
    setSelected(scenario);
    setEvent(null);
    setResult(null);
  }

  async function runScenario() {
    setRunning(true);
    setEvent(null);
    setResult(null);
    const pending = createUnderstandingEvent({
      workspaceId: workspace.id,
      title: selected.title,
      rawInput: selected.rawInput,
      inputType: selected.inputType,
      sourceRole: selected.sourceRole,
      targetRole: selected.targetRole,
      targetTeam: selected.targetTeam,
      expectedReceiver: selected.targetReceiver,
      packType: selected.packType,
      probableIntent: selected.expectedAnalysis.probableIntent,
      missingContext: [],
      risks: [],
      criticalQuestions: [],
      recommendedOutput: selected.generatedOutput.type,
      scores: selected.mockScores,
    });
    const analysis = await analysisEngine.analyze(pending);
    setEvent({ ...pending, probableIntent: analysis.probableIntent, missingContext: analysis.missingInformation, risks: analysis.risks, criticalQuestions: analysis.criticalQuestions, recommendedOutput: analysis.recommendedOutput, scores: analysis.scores, status: statusFromScores(analysis.scores) });
    setResult(analysis);
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <section><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-teal-300">06 · Demo Scenario Library</p><h1 className="text-2xl font-semibold tracking-[-.035em] md:text-[30px]">Sell the operational value before client data exists.</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">Seven preloaded scenarios demonstrate how Virro detects meaning loss and creates action-ready outputs without using real customer information.</p></section>
      <section className="grid items-start gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <aside className="panel overflow-hidden"><div className="border-b border-[var(--border)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--subtle)]">Preloaded scenarios</div><div className="divide-y divide-[var(--border)]">{demoScenarios.map((scenario, index) => <button key={scenario.id} onClick={() => selectScenario(scenario)} className={`w-full px-4 py-3.5 text-left transition ${selected.id === scenario.id ? "bg-[var(--active)]" : "hover:bg-[var(--hover)]"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-[9px] font-semibold ${selected.id === scenario.id ? "bg-teal-400/10 text-teal-300" : "bg-[var(--panel-soft)] text-[var(--subtle)]"}`}>{index + 1}</span><div><p className="text-xs font-medium">{scenario.title}</p><p className="mt-1 text-[9px] text-[var(--subtle)]">{formatPack(scenario.packType)}</p></div></div></button>)}</div></aside>
        <div className="space-y-4">
          <article className="panel p-5 md:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><span className="rounded-full border border-indigo-400/20 bg-indigo-400/[.08] px-2.5 py-1 text-[9px] font-semibold text-indigo-300">{formatPack(selected.packType)}</span><h2 className="mt-3 text-lg font-semibold">{selected.title}</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{selected.context}</p></div><ScoreRing value={selected.mockScores.virroScore} label="Expected Virro" compact /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><InfoBlock label="Target receiver" value={selected.targetReceiver} /><InfoBlock label="Generated output" value={selected.generatedOutput.title} /></div><div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--input)] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--subtle)]">Raw input</p><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{selected.rawInput}</p></div><button onClick={runScenario} disabled={running} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 text-xs font-semibold text-slate-950 enabled:hover:bg-teal-200 disabled:opacity-60">{running ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}{running ? "Running scenario…" : "Run Demo Scenario"}</button></article>
          {!result || !event ? <article className="panel p-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[var(--panel-soft)] text-[var(--subtle)]"><Sparkles size={16} /></div><div><h3 className="text-xs font-semibold">Expected analysis coverage</h3><p className="mt-1 text-[10px] text-[var(--subtle)]">Run the scenario to compare the live mock engine with the sales narrative.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><ListBlock title="Probable intent" items={[selected.expectedAnalysis.probableIntent]} /><ListBlock title="Expected gaps" items={selected.expectedAnalysis.missingInformation} /><ListBlock title="Expected risks" items={selected.expectedAnalysis.risks} /></div></article> : <article className="panel p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-teal-300">Live mock result · {result.id}</p><h3 className="mt-1 text-sm font-semibold">{result.summary}</h3></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-2 py-1 text-[9px] text-emerald-300">Scenario complete</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><ListBlock title="Missing information" items={result.missingInformation} /><ListBlock title="Meaning loss risks" items={result.risks} /><ListBlock title="Critical questions" items={result.criticalQuestions} /></div><div className="mt-4 flex items-center justify-between rounded-xl border border-teal-400/15 bg-teal-400/[.05] p-4"><div className="flex items-center gap-3"><FileOutput size={16} className="text-teal-300" /><div><p className="text-[9px] text-[var(--subtle)]">Generated operational output</p><p className="mt-1 text-xs font-medium">{result.generatedArtifacts[0].title}</p></div></div><ArrowRight size={14} className="text-teal-300" /></div><div className="mt-4 flex items-start gap-2 text-[9px] leading-4 text-[var(--subtle)]"><ShieldCheck size={12} className="mt-0.5 shrink-0" />Scores are estimates generated from the scenario input and pack-specific rules.</div></article>}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[9px] uppercase tracking-[.1em] text-[var(--subtle)]">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>; }
function ListBlock({ title, items }: { title: string; items: string[] }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[10px] font-semibold text-[var(--muted)]">{title}</p><div className="mt-2 space-y-1.5">{items.length ? items.map((item) => <div key={item} className="flex items-start gap-2 text-[10px] leading-4 text-[var(--muted)]"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-teal-300" />{item}</div>) : <p className="text-[10px] text-emerald-300">No material gap detected.</p>}</div></div>; }
function formatPack(value: string) { return value.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
