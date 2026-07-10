"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  LoaderCircle,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { analysisEngine } from "@/lib/services/analysis-engine";
import { recommendedOutputByPack } from "@/lib/services/pack-analyzers";
import { analysisOutcomeToResult, createUnderstandingEvent } from "@/lib/domain/understanding-event";
import { teams, workspace } from "@/lib/data/seed";
import type {
  AnalysisResult,
  InputType,
  PackId,
  UnderstandingEvent,
} from "@/lib/types/understanding";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatusPill } from "@/components/ui/status-pill";

const inputTypes: { value: InputType; label: string }[] = [
  { value: "user-story", label: "User Story" },
  { value: "bug", label: "Bug" },
  { value: "meeting-notes", label: "Meeting Notes" },
  { value: "ai-instruction", label: "AI Instruction" },
  { value: "process", label: "Process" },
  { value: "handoff", label: "Handoff" },
  { value: "technical-documentation", label: "Technical Documentation" },
  { value: "onboarding-material", label: "Onboarding Material" },
  { value: "consulting-brief", label: "Consulting Brief" },
];

const packs: { value: PackId; label: string }[] = [
  { value: "product-delivery", label: "Product Delivery" },
  { value: "ai-understanding", label: "AI Understanding" },
  { value: "handoff-intelligence", label: "Handoff Intelligence" },
  { value: "process-understanding", label: "Process Understanding" },
  { value: "onboarding", label: "Onboarding & Knowledge Transfer" },
  { value: "consulting-delivery", label: "Consulting Delivery" },
  { value: "technical-documentation", label: "Technical Documentation" },
];

export function InboxWorkbench() {
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<UnderstandingEvent | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [likelyReceiver, setLikelyReceiver] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedEvent(null);
    setResult(null);

    try {
      const form = new FormData(event.currentTarget);
      const value = (name: string) => String(form.get(name) ?? "").trim();
      const rawInput = value("rawInput");
      const packType = value("packType") as PackId;
      const expectedReceiver = value("expectedReceiver");

      const outcome = await analysisEngine.analyze(rawInput, packType, {
        expectedReceiver,
        sourceRole: value("sourceRole"),
        targetRole: value("targetRole"),
        targetTeam: value("targetTeam"),
      });

      const understandingEvent = createUnderstandingEvent({
        workspaceId: workspace.id,
        title: value("title"),
        rawInput,
        inputType: value("inputType") as InputType,
        sourceRole: value("sourceRole"),
        targetRole: value("targetRole"),
        targetTeam: value("targetTeam"),
        expectedReceiver,
        packType,
        probableIntent: outcome.inferredIntent,
        missingContext: outcome.missingContext,
        risks: outcome.riskSignals,
        criticalQuestions: outcome.criticalQuestions,
        recommendedOutput: recommendedOutputByPack[packType],
        scores: outcome.scores,
      });

      const analysisResult: AnalysisResult = {
        id: `AR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        ...analysisOutcomeToResult(understandingEvent, outcome),
        generatedArtifacts: [
          {
            id: `OA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            type: understandingEvent.recommendedOutput,
            title: `${understandingEvent.title} — ${formatOutput(understandingEvent.recommendedOutput)}`,
            status: "draft",
          },
        ],
      };

      setLikelyReceiver(outcome.likelyReceiver);
      setCreatedEvent(understandingEvent);
      setResult(analysisResult);
    } catch {
      setError("The Understanding Event could not be analyzed. Review the intake and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">Understanding Inbox</p>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">Assess whether information is ready to become action.</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Register unstructured operational input, identify its intended receiver and estimate the context required for reliable execution.
        </p>
      </section>

      <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-2 sm:grid-cols-3">
        <FlowStep icon={<FileText size={14} />} number="01" label="Capture input" active />
        <FlowStep icon={<Network size={14} />} number="02" label="Analyze understanding" active={Boolean(createdEvent)} />
        <FlowStep icon={<FileCheck2 size={14} />} number="03" label="Operational result" active={Boolean(result)} />
      </div>

      <section className="grid items-start gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <form onSubmit={analyze} className="panel p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div>
              <h2 className="text-sm font-semibold">New Understanding Event</h2>
              <p className="mt-1 text-[11px] text-[var(--subtle)]">Company workspace · {workspace.name}</p>
            </div>
            <span className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--subtle)]">Manual intake</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <input name="title" required placeholder="e.g. Billing API migration handoff" className="field-control" />
            </Field>

            <Field label="Input Type">
              <select name="inputType" required defaultValue="" className="field-control">
                <option value="" disabled>Select input type</option>
                {inputTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>

            <Field label="Analysis Pack">
              <select name="packType" required defaultValue="" className="field-control">
                <option value="" disabled>Select analysis pack</option>
                {packs.map((pack) => <option key={pack.value} value={pack.value}>{pack.label}</option>)}
              </select>
            </Field>

            <Field label="Source Role">
              <input name="sourceRole" required placeholder="Who produced the input?" className="field-control" />
            </Field>

            <Field label="Target Role">
              <input name="targetRole" required placeholder="Who is accountable next?" className="field-control" />
            </Field>

            <Field label="Target Team">
              <select name="targetTeam" required defaultValue="" className="field-control">
                <option value="" disabled>Select target team</option>
                {teams.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
              </select>
            </Field>

            <Field label="Expected Receiver">
              <input name="expectedReceiver" required placeholder="Describe the person, team, tool or AI" className="field-control" />
            </Field>

            <Field label="Raw Input" hint="Minimum 12 characters" className="sm:col-span-2">
              <textarea
                name="rawInput"
                required
                minLength={12}
                placeholder="Paste the unstructured requirement, handoff, process note, technical context or instruction…"
                className="field-control min-h-44 resize-y py-3 leading-6"
              />
            </Field>
          </div>

          {error && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[.07] px-3 py-2 text-xs text-rose-300">{error}</p>}

          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-[10px] leading-4 text-[var(--subtle)]">Analysis uses a local deterministic service. Scores are estimates, not guarantees.</p>
            <button disabled={loading} type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(94,234,212,.12)] transition enabled:hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60">
              {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Analyzing understanding…" : "Analyze Understanding"}
            </button>
          </div>
        </form>

        <article className="panel min-h-[680px] p-5 md:p-6">
          {!result && !loading && <EmptyResult />}
          {loading && <LoadingResult />}
          {result && createdEvent && (
            <AnalysisPanel event={createdEvent} result={result} likelyReceiver={likelyReceiver} />
          )}
        </article>
      </section>
    </div>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-2 flex items-center justify-between text-[11px] font-medium text-[var(--muted)]">
        {label}
        {hint && <span className="font-normal text-[var(--subtle)]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function FlowStep({ icon, number, label, active }: { icon: ReactNode; number: string; label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs ${active ? "bg-[var(--active)] text-[var(--text)]" : "text-[var(--subtle)]"}`}>
      <span className={`grid size-7 place-items-center rounded-md ${active ? "bg-teal-400/10 text-teal-300" : "bg-[var(--ring-track)]"}`}>{icon}</span>
      <span className="text-[9px] font-semibold tracking-[.12em] text-[var(--subtle)]">{number}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--subtle)]"><FileText size={22} /></div>
      <h3 className="mt-4 text-sm font-medium">Analysis Result</h3>
      <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--subtle)]">Complete the intake to create an Understanding Event and evaluate operational readiness.</p>
      <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2 text-[9px] text-[var(--subtle)]">
        <span className="rounded-lg border border-[var(--border)] py-2">Intent</span>
        <span className="rounded-lg border border-[var(--border)] py-2">Context</span>
        <span className="rounded-lg border border-[var(--border)] py-2">Readiness</span>
      </div>
    </div>
  );
}

function LoadingResult() {
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
      <LoaderCircle className="animate-spin text-teal-300" />
      <p className="mt-3 text-xs font-medium text-[var(--muted)]">Creating Understanding Event…</p>
      <p className="mt-1 text-[10px] text-[var(--subtle)]">Evaluating receiver fit, context and readiness signals</p>
    </div>
  );
}

function AnalysisPanel({ event, result, likelyReceiver }: { event: UnderstandingEvent; result: AnalysisResult; likelyReceiver: string }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal-300">Analysis Result · {result.id}</p>
          <h2 className="mt-1 text-base font-semibold tracking-[-.02em]">{event.title}</h2>
          <div className="mt-2 flex items-center gap-2"><StatusPill status={event.status} /><span className="text-[10px] text-[var(--subtle)]">{event.id}</span></div>
        </div>
        <ScoreRing value={result.scores.virroScore} label="Virro Score" compact />
      </div>

      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={15} className="text-teal-300" />Operational summary</div>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{result.summary}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ResultFact label="Probable intent" value={event.probableIntent} />
        <ResultFact label="Expected receiver" value={likelyReceiver} />
      </div>

      <ResultList title="Missing information" icon={<CircleAlert size={14} />} items={result.missingInformation} empty="No material context gap detected." />
      <ResultList title="Critical questions" icon={<Sparkles size={14} />} items={result.criticalQuestions} />
      <ResultList title="Recommended actions" icon={<ArrowRight size={14} />} items={result.recommendedActions} />

      <div className="mt-5">
        <p className="text-xs font-semibold text-[var(--muted)]">Readiness estimates</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ScoreCell label="DoU" value={result.scores.degreeOfUnderstanding} />
          <ScoreCell label="Meaning loss" value={result.meaningLossRisk} inverse />
          <ScoreCell label="Handoff" value={result.scores.handoffReadiness} />
          <ScoreCell label="Automation" value={result.scores.automationReadiness} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-teal-400/15 bg-teal-400/[.05] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-teal-400/10 text-teal-300"><FileCheck2 size={15} /></div>
            <div><p className="text-[10px] text-[var(--subtle)]">Recommended operational output</p><p className="mt-0.5 text-xs font-medium">{formatOutput(event.recommendedOutput)}</p></div>
          </div>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/[.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-[.08em] text-amber-300">Draft</span>
        </div>
      </div>

      <p className="mt-4 text-[9px] leading-4 text-[var(--subtle)]">Probabilistic assessment generated from the information currently available. Human review remains required for material decisions.</p>
    </div>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[9px] uppercase tracking-[.1em] text-[var(--subtle)]">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>;
}

function ResultList({ title, icon, items, empty = "No items." }: { title: string; icon: ReactNode; items: string[]; empty?: string }) {
  return <div className="mt-5"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">{icon}{title}</div><div className="mt-2 space-y-2">{items.length ? items.map((item) => <div key={item} className="flex items-start gap-2 text-[11px] leading-5 text-[var(--muted)]"><CheckCircle2 size={13} className="mt-1 shrink-0 text-teal-300" />{item}</div>) : <p className="text-[11px] text-emerald-300">{empty}</p>}</div></div>;
}

function ScoreCell({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const good = inverse ? value <= 30 : value >= 70;
  return <div className="rounded-lg border border-[var(--border)] p-2.5 text-center"><p className={`text-lg font-semibold ${good ? "text-teal-300" : ""}`}>{value}</p><p className="text-[9px] text-[var(--subtle)]">{label}</p></div>;
}

function formatOutput(value: string) {
  return value.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
