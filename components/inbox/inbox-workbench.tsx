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
import { analysisEngine } from "@/services/analysis/analysisEngine";
import { EMPTY_SCORES } from "@/services/analysis/scoringEngine";
import { recommendedOutputByPack } from "@/lib/services/pack-analyzers";
import { createUnderstandingEvent, statusFromScores } from "@/lib/domain/understanding-event";
import { teams, workspace } from "@/lib/data/seed";
import type {
  AnalysisResult,
  InputType,
  PackId,
  UnderstandingEvent,
} from "@/lib/types/understanding";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatusPill } from "@/components/ui/status-pill";
import { redactSensitiveData } from "@/lib/security/sensitive-data";
import { useLanguage } from "@/components/i18n/language-provider";

export function InboxWorkbench() {
  const { locale, t } = useLanguage();
  const inputTypes: { value: InputType; label: string }[] = [
    { value: "user-story", label: t("User Story", "Historia de usuario") }, { value: "bug", label: "Bug" }, { value: "meeting-notes", label: t("Meeting Notes", "Notas de reunión") }, { value: "ai-instruction", label: t("AI Instruction", "Instrucción para IA") }, { value: "process", label: t("Process", "Proceso") }, { value: "handoff", label: "Handoff" }, { value: "technical-documentation", label: t("Technical Documentation", "Documentación técnica") }, { value: "onboarding-material", label: t("Onboarding Material", "Material de onboarding") }, { value: "consulting-brief", label: t("Consulting Brief", "Brief de consultoría") },
  ];
  const packs: { value: PackId; label: string }[] = [
    { value: "product-delivery", label: t("Product Delivery", "Entrega de producto") }, { value: "ai-understanding", label: t("AI Understanding", "Entendimiento para IA") }, { value: "handoff-intelligence", label: t("Handoff Intelligence", "Inteligencia de handoffs") }, { value: "process-understanding", label: t("Process Understanding", "Entendimiento de procesos") }, { value: "onboarding", label: t("Onboarding & Knowledge Transfer", "Onboarding y transferencia de entendimiento") }, { value: "consulting-delivery", label: t("Consulting Delivery", "Entrega para consultoras") }, { value: "technical-documentation", label: t("Technical Documentation", "Documentación técnica") },
  ];
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<UnderstandingEvent | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redactionNotice, setRedactionNotice] = useState<string | null>(null);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRedactionNotice(null);
    setCreatedEvent(null);
    setResult(null);

    try {
      const form = new FormData(event.currentTarget);
      const value = (name: string) => String(form.get(name) ?? "").trim();
      const redaction = redactSensitiveData(value("rawInput"));
      const rawInput = redaction.sanitized;
      const packType = value("packType") as PackId;
      const expectedReceiver = value("expectedReceiver");

      if (redaction.redactionCount > 0) {
        setRedactionNotice(t(`${redaction.redactionCount} sensitive fragment${redaction.redactionCount === 1 ? " was" : "s were"} redacted before analysis: ${redaction.detectedTypes.join(", ")}.`, `${redaction.redactionCount} fragmento${redaction.redactionCount === 1 ? " sensible fue" : "s sensibles fueron"} redactado${redaction.redactionCount === 1 ? "" : "s"} antes del análisis: ${redaction.detectedTypes.join(", ")}.`));
      }

      const pendingEvent = createUnderstandingEvent({
        workspaceId: workspace.id,
        title: value("title"),
        rawInput,
        inputType: value("inputType") as InputType,
        sourceRole: value("sourceRole"),
        targetRole: value("targetRole"),
        targetTeam: value("targetTeam"),
        expectedReceiver,
        packType,
        probableIntent: "Pending pack analysis",
        missingContext: [],
        risks: [],
        criticalQuestions: [],
        recommendedOutput: recommendedOutputByPack[packType],
        scores: EMPTY_SCORES,
      });

      const analysisResult = await analysisEngine.analyze(pendingEvent, locale);
      const understandingEvent: UnderstandingEvent = {
        ...pendingEvent,
        probableIntent: analysisResult.probableIntent,
        missingContext: analysisResult.missingInformation,
        risks: analysisResult.risks,
        criticalQuestions: analysisResult.criticalQuestions,
        recommendedOutput: analysisResult.recommendedOutput,
        scores: analysisResult.scores,
        status: statusFromScores(analysisResult.scores),
      };

      setCreatedEvent(understandingEvent);
      setResult(analysisResult);
    } catch {
      setError(t("The Understanding Event could not be analyzed. Review the intake and try again.", "No se pudo analizar el Understanding Event. Revisa el input e inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">{t("Understanding Inbox", "Bandeja de entendimiento")}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">{t("Assess whether information is ready to become action.", "Evalúa si la información está lista para convertirse en acción.")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          {t("Register unstructured operational input, identify its intended receiver and estimate the context required for reliable execution.", "Registra información operativa desordenada, identifica su receptor esperado y estima el contexto necesario para una ejecución confiable.")}
        </p>
      </section>

      <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-2 sm:grid-cols-3">
        <FlowStep icon={<FileText size={14} />} number="01" label={t("Capture input", "Capturar input")} active />
        <FlowStep icon={<Network size={14} />} number="02" label={t("Analyze understanding", "Analizar entendimiento")} active={Boolean(createdEvent)} />
        <FlowStep icon={<FileCheck2 size={14} />} number="03" label={t("Operational result", "Resultado operativo")} active={Boolean(result)} />
      </div>

      <section className="grid items-start gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <form onSubmit={analyze} className="panel p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div>
              <h2 className="text-sm font-semibold">{t("New Understanding Event", "Nuevo Understanding Event")}</h2>
              <p className="mt-1 text-[11px] text-[var(--subtle)]">{t("Company workspace", "Workspace de empresa")} · {workspace.name}</p>
            </div>
            <span className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--subtle)]">{t("Manual intake", "Input manual")}</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t("Title", "Título")} className="sm:col-span-2">
              <input name="title" required placeholder={t("e.g. Billing API migration handoff", "ej. Handoff de migración de Billing API")} className="field-control" />
            </Field>

            <Field label={t("Input Type", "Tipo de input")}>
              <select name="inputType" required defaultValue="" className="field-control">
                <option value="" disabled>{t("Select input type", "Selecciona el tipo de input")}</option>
                {inputTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>

            <Field label={t("Analysis Pack", "Pack de análisis")}>
              <select name="packType" required defaultValue="" className="field-control">
                <option value="" disabled>{t("Select analysis pack", "Selecciona el pack de análisis")}</option>
                {packs.map((pack) => <option key={pack.value} value={pack.value}>{pack.label}</option>)}
              </select>
            </Field>

            <Field label={t("Source Role", "Rol de origen")}>
              <input name="sourceRole" required placeholder={t("Who produced the input?", "¿Quién produjo el input?")} className="field-control" />
            </Field>

            <Field label={t("Target Role", "Rol destino")}>
              <input name="targetRole" required placeholder={t("Who is accountable next?", "¿Quién es responsable después?")} className="field-control" />
            </Field>

            <Field label={t("Target Team", "Equipo destino")}>
              <select name="targetTeam" required defaultValue="" className="field-control">
                <option value="" disabled>{t("Select target team", "Selecciona el equipo destino")}</option>
                {teams.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
              </select>
            </Field>

            <Field label={t("Expected Receiver", "Receptor esperado")}>
              <input name="expectedReceiver" required placeholder={t("Describe the person, team, tool or AI", "Describe a la persona, equipo, herramienta o IA")} className="field-control" />
            </Field>

            <Field label={t("Raw Input", "Input original")} hint={t("Minimum 12 characters", "Mínimo 12 caracteres")} className="sm:col-span-2">
              <textarea
                name="rawInput"
                required
                minLength={12}
                placeholder={t("Paste the unstructured requirement, handoff, process note, technical context or instruction…", "Pega el requerimiento, handoff, nota de proceso, contexto técnico o instrucción desordenada…")}
                className="field-control min-h-44 resize-y py-3 leading-6"
              />
            </Field>
          </div>

          {error && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[.07] px-3 py-2 text-xs text-rose-300">{error}</p>}
          {redactionNotice && <p className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/[.07] px-3 py-2 text-xs text-sky-300">{redactionNotice}</p>}

          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-[10px] leading-4 text-[var(--subtle)]">{t("Analysis uses a local deterministic service. Scores are estimates, not guarantees.", "El análisis usa un servicio local determinista. Los scores son estimaciones, no garantías.")}</p>
            <button disabled={loading} type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(94,234,212,.12)] transition enabled:hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60">
              {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? t("Analyzing understanding…", "Analizando entendimiento…") : t("Analyze Understanding", "Analizar entendimiento")}
            </button>
          </div>
        </form>

        <article className="panel min-h-[680px] p-5 md:p-6">
          {!result && !loading && <EmptyResult />}
          {loading && <LoadingResult />}
          {result && createdEvent && (
            <AnalysisPanel event={createdEvent} result={result} />
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
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--subtle)]"><FileText size={22} /></div>
      <h3 className="mt-4 text-sm font-medium">{t("Analysis Result", "Resultado de análisis")}</h3>
      <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--subtle)]">{t("Complete the intake to create an Understanding Event and evaluate operational readiness.", "Completa el input para crear un Understanding Event y evaluar el readiness operativo.")}</p>
      <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2 text-[9px] text-[var(--subtle)]">
        <span className="rounded-lg border border-[var(--border)] py-2">{t("Intent", "Intención")}</span>
        <span className="rounded-lg border border-[var(--border)] py-2">{t("Context", "Contexto")}</span>
        <span className="rounded-lg border border-[var(--border)] py-2">Readiness</span>
      </div>
    </div>
  );
}

function LoadingResult() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
      <LoaderCircle className="animate-spin text-teal-300" />
      <p className="mt-3 text-xs font-medium text-[var(--muted)]">{t("Creating Understanding Event…", "Creando Understanding Event…")}</p>
      <p className="mt-1 text-[10px] text-[var(--subtle)]">{t("Evaluating receiver fit, context and readiness signals", "Evaluando ajuste al receptor, contexto y señales de readiness")}</p>
    </div>
  );
}

function AnalysisPanel({ event, result }: { event: UnderstandingEvent; result: AnalysisResult }) {
  const { t } = useLanguage();
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal-300">{t("Analysis Result", "Resultado de análisis")} · {result.id}</p>
          <h2 className="mt-1 text-base font-semibold tracking-[-.02em]">{event.title}</h2>
          <div className="mt-2 flex items-center gap-2"><StatusPill status={event.status} /><span className="text-[10px] text-[var(--subtle)]">{event.id}</span></div>
        </div>
        <ScoreRing value={result.scores.virroScore} label="Virro Score" compact />
      </div>

      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={15} className="text-teal-300" />{t("Operational summary", "Resumen operativo")}</div>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{result.summary}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ResultFact label={t("Probable intent", "Intención probable")} value={result.probableIntent} />
        <ResultFact label={t("Target receiver", "Receptor destino")} value={result.targetReceiver} />
      </div>

      <ResultList title={t("Missing information", "Información faltante")} icon={<CircleAlert size={14} />} items={result.missingInformation} empty={t("No material context gap detected.", "No se detectó una brecha material de contexto.")} />
      <ResultList title={t("Critical questions", "Preguntas críticas")} icon={<Sparkles size={14} />} items={result.criticalQuestions} />
      <ResultList title={t("Recommended actions", "Acciones recomendadas")} icon={<ArrowRight size={14} />} items={result.recommendedActions} />

      <div className="mt-5">
        <p className="text-xs font-semibold text-[var(--muted)]">{t("Readiness estimates", "Estimaciones de readiness")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ScoreCell label="DoU" value={result.scores.degreeOfUnderstanding} />
          <ScoreCell label={t("Meaning loss", "Meaning Loss")} value={result.meaningLossRisk} inverse />
          <ScoreCell label="Handoff" value={result.scores.handoffReadiness} />
          <ScoreCell label="Automation" value={result.scores.automationReadiness} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-teal-400/15 bg-teal-400/[.05] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-teal-400/10 text-teal-300"><FileCheck2 size={15} /></div>
            <div><p className="text-[10px] text-[var(--subtle)]">{t("Recommended operational output", "Output operativo recomendado")}</p><p className="mt-0.5 text-xs font-medium">{formatOutput(event.recommendedOutput)}</p></div>
          </div>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/[.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-[.08em] text-amber-300">{t("Draft", "Borrador")}</span>
        </div>
      </div>

      <p className="mt-4 text-[9px] leading-4 text-[var(--subtle)]">{t("Probabilistic assessment generated from the information currently available. Human review remains required for material decisions.", "Evaluación probabilística generada con la información disponible. La revisión humana sigue siendo requerida para decisiones materiales.")}</p>
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
