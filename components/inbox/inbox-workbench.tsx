"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import {
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitBranch,
  LoaderCircle,
  Radar,
  RotateCcw,
  Save,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatusPill } from "@/components/ui/status-pill";
import { packRegistry } from "@/lib/config/pack-registry";
import { workspace } from "@/lib/data/seed";
import { redactSensitiveData } from "@/lib/security/sensitive-data";
import { saveAssistantResult } from "@/lib/services/assistant-event-store";
import type { AssistantMode, AssistantResult } from "@/lib/types/assistant";
import type { PackType } from "@/lib/types/understanding";
import { assistantOrchestrator } from "@/services/assistant";

export function InboxWorkbench() {
  const { locale, t } = useLanguage();
  const [mode, setMode] = useState<AssistantMode>("new-event");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setSaved(false);
    try {
      const form = new FormData(event.currentTarget);
      const value = (name: string) => String(form.get(name) ?? "").trim();
      const redaction = redactSensitiveData(value("rawInput"));
      if (redaction.redactionCount) setNotice(t(`${redaction.redactionCount} sensitive fragment(s) were redacted before analysis.`, `${redaction.redactionCount} fragmento(s) sensible(s) fueron redactados antes del análisis.`));
      const analysis = await assistantOrchestrator.analyze({
        mode,
        workspaceId: workspace.id,
        title: value("title"),
        rawInput: redaction.sanitized,
        sourceRole: value("sourceRole"),
        expectedReceiver: value("expectedReceiver"),
        selectedPack: (value("selectedPack") || undefined) as PackType | undefined,
      }, locale);
      setResult(analysis);
    } catch {
      setError(t("The Understanding Event could not be analyzed. Review the input and try again.", "No se pudo analizar el Understanding Event. Revisa el input e inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  function selectMode(next: AssistantMode) {
    setMode(next);
    setResult(null);
    setSaved(false);
  }

  function save() {
    if (!result) return;
    saveAssistantResult(result);
    setSaved(true);
  }

  return <div className="space-y-6">
    <section>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">03 · {t("Understanding Inbox", "Bandeja de entendimiento")}</p>
      <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[30px]">{t("Virro Understanding Assistant", "Asistente de Entendimiento Virro")}</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{t("Turn ambiguous information into Understanding Events, risks, critical questions, estimated scores and operational outputs.", "Convierte información ambigua en Understanding Events, riesgos, preguntas críticas, scores y outputs operativos.")}</p>
      <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[var(--subtle)]">{t("Virro does not converse for the sake of conversation. It helps detect whether information is sufficiently understood before it moves forward.", "Virro no conversa por conversar. Ayuda a detectar si la información está suficientemente entendida antes de avanzar.")}</p>
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      <ModeCard active={mode === "new-event"} onClick={() => selectMode("new-event")} icon={<FileText size={18} />} title={t("New Understanding Event", "Nuevo Understanding Event")} description={t("Analyze a requirement, handoff, process, role need, technical document or AI instruction.", "Analiza un requerimiento, handoff, proceso, necesidad de rol, documento técnico o instrucción para IA.")} />
      <ModeCard active={mode === "critical-flow-discovery"} onClick={() => selectMode("critical-flow-discovery")} icon={<Radar size={18} />} title={t("Diagnose critical flow", "Diagnosticar flujo crítico")} description={t("Describe where your team loses clarity, time, context or execution. Virro will recommend the most probable pack and audit.", "Describe un flujo donde tu equipo pierde claridad, tiempo, contexto o ejecución. Virro intentará detectar qué pérdida de entendimiento podría estar ocurriendo.")} />
    </section>

    <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-2 sm:grid-cols-5">
      <FlowStep number="01" label={t("Describe pain or input", "Describe dolor o input")} active />
      <FlowStep number="02" label={t("Virro classifies", "Virro clasifica")} active={Boolean(result) || loading} />
      <FlowStep number="03" label={t("Virro explains why", "Virro explica por qué")} active={Boolean(result)} />
      <FlowStep number="04" label={t("Up to 3 questions", "Máximo 3 preguntas")} active={Boolean(result)} />
      <FlowStep number="05" label={t("Evidence and recommendation", "Evidencia y recomendación")} active={Boolean(result)} />
    </div>

    <div className="grid gap-2 rounded-xl border border-teal-400/15 bg-teal-400/[.035] p-3 text-[10px] leading-5 text-[var(--muted)] md:grid-cols-3">
      <p><ShieldCheck size={12} className="mr-2 inline text-teal-300" />{t("Virro does not evaluate people. It evaluates understanding risks in operational information.", "Virro no evalúa personas. Evalúa riesgos de entendimiento en información operativa.")}</p>
      <p><Sparkles size={12} className="mr-2 inline text-teal-300" />{t("Scores are probabilistic estimates, not guarantees.", "Los scores son estimaciones probabilísticas, no garantías.")}</p>
      <p><FileCheck2 size={12} className="mr-2 inline text-teal-300" />{t("Virro does not retain raw private text by default.", "Virro no guarda texto privado crudo por defecto.")}</p>
    </div>

    <section className="grid items-start gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={analyze} className="panel p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5"><div><h2 className="text-sm font-semibold">{mode === "critical-flow-discovery" ? t("Critical Flow Discovery", "Diagnóstico de flujo crítico") : t("Understanding Event intake", "Input del Understanding Event")}</h2><p className="mt-1 text-[11px] text-[var(--subtle)]">{workspace.name} · {t("Private Mode", "Modo privado")}</p></div><span className="rounded-md border border-teal-400/15 bg-teal-400/[.05] px-2.5 py-1 text-[9px] font-medium text-teal-200">{t("Controlled pipeline", "Pipeline controlado")}</span></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t("Title", "Título")} className="sm:col-span-2"><input name="title" required placeholder={mode === "critical-flow-discovery" ? t("e.g. Candidates rejected after client interviews", "ej. Candidatos rechazados después de entrevistas con cliente") : t("e.g. Billing API migration handoff", "ej. Handoff de migración de Billing API")} className="field-control" /></Field>
          <Field label={t("Source role", "Rol de origen")}><input name="sourceRole" placeholder={t("Who produced this information?", "¿Quién produjo esta información?")} className="field-control" /></Field>
          <Field label={t("Expected receiver", "Receptor esperado")}><input name="expectedReceiver" placeholder={t("Team, consultant, candidate, tool or AI", "Equipo, consultora, candidato, herramienta o IA")} className="field-control" /></Field>
          <Field label={t("Analysis pack", "Pack de análisis")} hint={t("Optional", "Opcional")} className="sm:col-span-2"><select name="selectedPack" defaultValue="" className="field-control"><option value="">{t("Let Virro classify the event", "Permitir que Virro clasifique el evento")}</option>{Object.values(packRegistry).map((pack) => <option key={pack.id} value={pack.id}>{locale === "es" ? pack.spanishName : pack.name}</option>)}</select></Field>
          <Field label={mode === "critical-flow-discovery" ? t("Describe the operational pain", "Describe el dolor operativo") : t("Original information", "Información original")} hint={t("Minimum 12 characters", "Mínimo 12 caracteres")} className="sm:col-span-2"><textarea name="rawInput" required minLength={12} placeholder={mode === "critical-flow-discovery" ? t("Where is clarity, context, time or execution being lost?", "¿Dónde se está perdiendo claridad, contexto, tiempo o ejecución?") : t("Paste the requirement, handoff, process, role need, technical context or AI instruction…", "Pega el requerimiento, handoff, proceso, necesidad de rol, contexto técnico o instrucción para IA…")} className="field-control min-h-48 resize-y py-3 leading-6" /></Field>
        </div>
        {error && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[.07] px-3 py-2 text-xs text-rose-300">{error}</p>}
        {notice && <p className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/[.07] px-3 py-2 text-xs text-sky-300">{notice}</p>}
        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-sm text-[10px] leading-4 text-[var(--subtle)]">{t("One intake, one classification, up to three critical questions and mandatory human review. Scores are estimates.", "Un input, una clasificación, máximo tres preguntas críticas y revisión humana obligatoria. Los scores son estimaciones.")}</p><button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 text-xs font-semibold text-slate-950 disabled:opacity-60">{loading ? <LoaderCircle size={15} className="animate-spin" /> : <SearchCheck size={15} />}{loading ? t("Analyzing understanding…", "Analizando entendimiento…") : mode === "critical-flow-discovery" ? t("Diagnose critical flow", "Diagnosticar flujo crítico") : t("Analyze understanding", "Analizar entendimiento")}</button></div>
      </form>

      <article className="panel min-h-[760px] p-5 md:p-6">{loading ? <LoadingState t={t} /> : result ? <AssistantResultPanel result={result} saved={saved} onSave={save} onAdjust={() => setResult(null)} onDiscard={() => { setResult(null); setSaved(false); }} /> : <EmptyState t={t} />}</article>
    </section>
  </div>;
}

function AssistantResultPanel({ result, saved, onSave, onAdjust, onDiscard }: { result: AssistantResult; saved: boolean; onSave: () => void; onAdjust: () => void; onDiscard: () => void }) {
  const { locale, t } = useLanguage();
  const pack = result.classification.pack === "critical-flow-discovery" ? null : packRegistry[result.classification.pack];
  const packLabel = pack ? (locale === "es" ? pack.spanishName : pack.name) : t("Critical Flow Discovery", "Diagnóstico de flujo crítico");
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal-300">{t("Understanding Event", "Understanding Event")} · {result.event.id}</p><h2 className="mt-1 text-base font-semibold">{result.event.title}</h2><div className="mt-2 flex items-center gap-2"><StatusPill status={result.event.status} /><span className="text-[10px] text-[var(--subtle)]">{packLabel}</span></div></div><ScoreRing value={result.scores.virroScore} label="Virro Score" compact /></div>
    <ResultSection title={t("Classification", "Clasificación")} icon={<GitBranch size={14} />}><div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{packLabel}</p><span className="text-[10px] font-semibold text-teal-300">{result.classification.confidence}/100 {t("confidence", "confianza")}</span></div><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{result.classification.reason}</p></div></ResultSection>
    <div className="grid gap-3 sm:grid-cols-2"><ResultList title={t("Meaning Loss Risks", "Riesgos de Meaning Loss")} items={result.meaningLossRisks.map((risk) => risk.title)} tone="rose" /><ResultList title={t("Missing Context", "Contexto faltante")} items={result.missingContext.map((item) => item.label)} tone="amber" /></div>
    <ResultSection title={t("Critical questions", "Preguntas críticas")} icon={<CircleAlert size={14} />}><div className="space-y-2">{result.criticalQuestions.map((question) => <div key={question.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-xs font-medium">{question.priority}. {question.question}</p><p className="mt-1 text-[9px] text-[var(--subtle)]">{question.rationale}</p></div>)}</div></ResultSection>
    <ResultSection title={t("Estimated scores", "Scores estimados")} icon={<Sparkles size={14} />}><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><ScoreCell label="DoU" value={result.scores.degreeOfUnderstanding} /><ScoreCell label="Meaning Loss" value={result.scores.meaningLossRisk} inverse /><ScoreCell label="Handoff" value={result.scores.handoffReadiness} /><ScoreCell label={t("Automation", "Automatización")} value={result.scores.automationReadiness} /></div></ResultSection>
    <div className="rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4"><div className="flex items-center gap-2"><FileCheck2 size={15} className="text-teal-300" /><p className="text-xs font-semibold">{t("Recommended operational output", "Output operativo recomendado")}</p></div><p className="mt-2 text-xs text-[var(--muted)]">{result.outputRecommendation.title}</p><p className="mt-1 text-[10px] leading-4 text-[var(--subtle)]">{result.outputRecommendation.purpose}</p></div>
    <div className="rounded-xl border border-indigo-400/15 bg-indigo-400/[.04] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-indigo-300">{t("Audit / pilot opportunity", "Oportunidad de audit / piloto")}</p><p className="mt-2 text-sm font-semibold">{result.auditOpportunity.recommendedAudit}</p><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{result.auditOpportunity.reason} {result.auditOpportunity.expectedValue}</p></div>
    <ResultSection title="AnalysisTrace" icon={<ClipboardCheck size={14} />}><div className="space-y-2">{result.trace.steps.map((step, index) => <div key={`${step.loop}-${index}`} className="flex gap-3 text-[10px] leading-4"><span className={`mt-1 size-2 shrink-0 rounded-full ${step.status === "completed" ? "bg-teal-300" : "bg-amber-300"}`} /><div><p className="font-semibold capitalize">{step.loop.replaceAll("-", " ")}</p><p className="text-[var(--subtle)]">{step.evidence}</p></div></div>)}</div><p className="mt-3 flex items-center gap-2 text-[9px] text-[var(--subtle)]"><ShieldCheck size={11} />{t("Raw private text is not retained by the mock store. Human validation is required.", "El store mock no retiene texto privado crudo. Se requiere validación humana.")}</p></ResultSection>
    <div className="grid gap-2 sm:grid-cols-3"><button onClick={onSave} disabled={saved} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-300 px-3 text-xs font-semibold text-slate-950 disabled:opacity-60"><Save size={14} />{saved ? t("Saved", "Guardado") : t("Save event", "Guardar evento")}</button><button onClick={onAdjust} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] text-xs"><RotateCcw size={14} />{t("Adjust", "Ajustar")}</button><button onClick={onDiscard} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-400/20 text-xs text-rose-300"><Trash2 size={14} />{t("Discard", "Descartar")}</button></div>
  </div>;
}

function ModeCard({ active, onClick, icon, title, description }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; description: string }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-teal-400/30 bg-teal-400/[.06]" : "border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--subtle)]"}`}><span className={active ? "text-teal-300" : "text-[var(--subtle)]"}>{icon}</span><p className="mt-3 text-xs font-semibold">{title}</p><p className="mt-1 text-[10px] leading-4 text-[var(--subtle)]">{description}</p></button>; }
function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: ReactNode }) { return <label className={className}><span className="mb-2 flex items-center justify-between text-[11px] font-medium text-[var(--muted)]">{label}{hint && <span className="font-normal text-[var(--subtle)]">{hint}</span>}</span>{children}</label>; }
function FlowStep({ number, label, active }: { number: string; label: string; active: boolean }) { return <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs ${active ? "bg-[var(--active)]" : "text-[var(--subtle)]"}`}><span className={`grid size-7 place-items-center rounded-md text-[9px] font-semibold ${active ? "bg-teal-400/10 text-teal-300" : "bg-[var(--ring-track)]"}`}>{number}</span><span className="font-medium">{label}</span></div>; }
function ResultSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <section><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">{icon}{title}</div>{children}</section>; }
function ResultList({ title, items, tone }: { title: string; items: string[]; tone: "amber" | "rose" }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[10px] font-semibold">{title}</p><div className="mt-2 space-y-1.5">{items.map((item) => <div key={item} className="flex items-start gap-2 text-[10px] leading-4 text-[var(--muted)]"><CircleAlert size={11} className={`mt-0.5 shrink-0 ${tone === "rose" ? "text-rose-300" : "text-amber-300"}`} />{item}</div>)}</div></div>; }
function ScoreCell({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) { const good = inverse ? value <= 30 : value >= 70; return <div className="rounded-lg border border-[var(--border)] p-2.5 text-center"><p className={`text-lg font-semibold ${good ? "text-teal-300" : ""}`}>{value}</p><p className="text-[9px] text-[var(--subtle)]">{label}</p></div>; }
function EmptyState({ t }: { t: (english: string, spanish: string) => string }) { return <div className="flex min-h-[700px] flex-col items-center justify-center text-center"><div className="grid size-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--subtle)]"><FileText size={22} /></div><h3 className="mt-4 text-sm font-medium">{t("Auditable understanding result", "Resultado de entendimiento auditable")}</h3><p className="mt-2 max-w-xs text-xs leading-5 text-[var(--subtle)]">{t("Complete the intake to classify the event, detect meaning-loss risks and recommend an operational output and next audit.", "Completa el input para clasificar el evento, detectar riesgos de Meaning Loss y recomendar un output operativo y próximo audit.")}</p><div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2 text-[9px] text-[var(--subtle)]"><span className="rounded-lg border border-[var(--border)] py-2">{t("Pack", "Pack")}</span><span className="rounded-lg border border-[var(--border)] py-2">{t("Risk", "Riesgo")}</span><span className="rounded-lg border border-[var(--border)] py-2">AnalysisTrace</span></div></div>; }
function LoadingState({ t }: { t: (english: string, spanish: string) => string }) { return <div className="flex min-h-[700px] flex-col items-center justify-center text-center"><LoaderCircle className="animate-spin text-teal-300" /><p className="mt-3 text-xs font-medium text-[var(--muted)]">{t("Running the controlled understanding pipeline…", "Ejecutando el pipeline controlado de entendimiento…")}</p><p className="mt-1 text-[10px] text-[var(--subtle)]">{t("Classifying, clarifying, scoring and self-checking", "Clasificando, aclarando, calculando scores y realizando self-check")}</p></div>; }
