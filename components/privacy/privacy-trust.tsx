"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, EyeOff, Fingerprint, LockKeyhole, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

type TrustMode = "private" | "pattern";

export function PrivacyTrust() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<TrustMode>("private");
  const principles = [
    t("Virro must be more trustworthy than intelligent.", "Virro debe ser más confiable que inteligente."),
    t("Virro does not retain raw private text or unnecessary messages by default.", "Virro no guarda texto privado crudo por defecto ni mensajes innecesarios."),
    t("Store anonymized patterns only with permission.", "Guardar patrones anonimizados solo con permiso."),
    t("Virro is not designed to monitor employees or evaluate personal performance.", "Virro no está diseñado para vigilar empleados ni evaluar desempeño personal."),
    t("Virro does not evaluate people. It estimates interpretation risks in operational information.", "Virro no evalúa personas. Estima riesgos de interpretación en información operativa."),
    t("Scores are probabilistic estimates, not guarantees or personal evaluations.", "Los scores son estimaciones probabilísticas, no garantías ni evaluaciones personales."),
  ];
  const current = mode === "private" ? {
    label: t("Private Mode", "Modo privado"),
    description: t("Process the current event through Analyze-Safe without retaining raw operational content by default.", "Procesa el evento actual mediante Analyze-Safe sin retener contenido operativo crudo por defecto."),
    saved: [t("Event ID and selected pack", "ID del evento y pack seleccionado"), t("Estimated scores when explicitly saved", "Scores estimados cuando se guardan explícitamente"), "AnalysisTrace", t("Approved operational deliverables", "Entregables operativos aprobados")],
    notSaved: [t("Private conversations", "Conversaciones privadas"), t("Raw input after the session boundary", "Input crudo después del límite de sesión"), t("Employee behavior profiles", "Perfiles de comportamiento de empleados"), t("Cross-customer learning patterns", "Patrones de aprendizaje entre clientes")],
  } : {
    label: t("Pattern Learning Allowed", "Aprendizaje por patrones permitido"),
    description: t("Preview a future permissioned policy for anonymized, workspace-level patterns.", "Previsualiza una política futura y autorizada para patrones anonimizados a nivel workspace."),
    saved: [t("Anonymized context-gap categories", "Categorías anonimizadas de brechas de contexto"), t("Aggregated risk/readiness patterns", "Patrones agregados de riesgo/readiness"), t("Pack effectiveness trends", "Tendencias de efectividad por pack"), t("Permission and retention record", "Registro de permiso y retención")],
    notSaved: [t("Names or performance profiles", "Nombres o perfiles de desempeño"), t("Private conversation history", "Historial de conversaciones privadas"), t("Unrelated raw messages", "Mensajes crudos no relacionados"), t("Cross-customer model training data", "Datos para entrenamiento entre clientes")],
  };

  return <div className="space-y-6">
    <section><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-teal-300"><span className="grid size-7 place-items-center rounded-md bg-teal-400/10"><LockKeyhole size={14} /></span>16 · {t("Privacy & Trust", "Privacidad y confianza")}</div><h1 className="text-2xl font-semibold tracking-[-.035em] md:text-[30px]">{t("Trust boundaries visible before analysis begins.", "Límites de confianza visibles antes de iniciar el análisis.")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{t("Virro analyzes risks in operational information—not people—and makes retention choices explicit.", "Virro analiza riesgos en información operativa, no personas, y hace explícitas las decisiones de retención.")}</p></section>
    <section className="grid gap-4 xl:grid-cols-[.88fr_1.12fr]">
      <article className="panel p-5"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-300" /><h2 className="text-sm font-semibold">{t("Virro Trust Principles", "Principios de confianza Virro")}</h2></div><div className="mt-4 space-y-2">{principles.map((principle) => <div key={principle} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-300" /><p className="text-[11px] leading-5 text-[var(--muted)]">{principle}</p></div>)}</div></article>
      <div className="space-y-4"><article className="panel p-5"><h2 className="text-sm font-semibold">{t("Workspace data policy · Demo preview", "Política de datos del workspace · Vista demo")}</h2><p className="mt-1 text-[10px] text-[var(--subtle)]">{t("Compare retention policies. Safe mode is the production default; pattern learning requires explicit future authorization.", "Compara políticas de retención. El modo seguro es el valor productivo por defecto; el aprendizaje por patrones requiere autorización explícita futura.")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><ModeButton active={mode === "private"} onClick={() => setMode("private")} icon={<EyeOff size={17} />} title={t("Private Mode", "Modo privado")} detail={t("Minimal retention by default", "Retención mínima por defecto")} /><ModeButton active={mode === "pattern"} onClick={() => setMode("pattern")} icon={<Fingerprint size={17} />} title={t("Pattern Learning Allowed", "Aprendizaje por patrones permitido")} detail={t("Future permissioned policy", "Política futura con autorización")} /></div><div className="mt-4 rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-teal-300" /><p className="text-xs font-semibold">{current.label} · {t("policy preview", "vista de política")}</p></div><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{current.description}</p></div></article>
      <article className="panel p-5"><div className="grid gap-5 md:grid-cols-2"><DataList title={t("What is saved", "Qué se guarda")} items={current.saved} saved /><DataList title={t("What is not saved", "Qué no se guarda")} items={current.notSaved} /></div></article>
      <article className="panel p-5"><div className="flex items-center gap-2"><UsersRound size={16} className="text-indigo-300" /><h2 className="text-sm font-semibold">{t("No employee surveillance", "Sin vigilancia de empleados")}</h2></div><p className="mt-3 text-xs leading-6 text-[var(--muted)]">{t("Virro identifies signals of missing context, ambiguous ownership and interpretation risk in operational information. It does not rank people, infer motivation or create individual performance scores.", "Virro identifica señales de contexto faltante, ownership ambiguo y riesgo de interpretación en información operativa. No clasifica personas, infiere motivación ni crea scores individuales de desempeño.")}</p></article></div>
    </section>
    <section className="panel p-5"><div className="grid gap-4 md:grid-cols-4">{[
      { n: "01", title: t("Initial information", "Información inicial"), detail: t("Only relevant operational content", "Solo contenido operativo relevante") },
      { n: "02", title: "Privacy Shield", detail: t("Mask PII and secrets before analysis", "Enmascarar PII y secretos antes del análisis") },
      { n: "03", title: "Analyze-Safe", detail: t("Analyze masked operational meaning", "Analizar significado operativo enmascarado") },
      { n: "04", title: t("Safe signals", "Señales seguras"), detail: t("Store metadata and results, not raw content", "Guardar metadata y resultados, no contenido crudo") },
    ].map((step) => <div key={step.n} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-[9px] font-semibold text-teal-300">{step.n}</p><p className="mt-2 text-xs font-medium">{step.title}</p><p className="mt-1 text-[10px] leading-4 text-[var(--subtle)]">{step.detail}</p></div>)}</div><div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--border)] pt-5 text-[10px] font-semibold"><Link href="/legal/privacy" className="text-teal-300">{t("Read privacy notice", "Leer aviso de privacidad")}</Link><Link href="/legal/terms" className="text-[var(--muted)]">{t("Terms of use", "Términos de uso")}</Link><Link href="/legal" className="text-[var(--muted)]">{t("Legal center", "Centro legal")}</Link></div></section>
  </div>;
}

function ModeButton({ active, onClick, icon, title, detail }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; detail: string }) { return <button onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-teal-400/30 bg-teal-400/[.06]" : "border-[var(--border)] bg-[var(--panel-soft)]"}`}><span className={active ? "text-teal-300" : "text-[var(--subtle)]"}>{icon}</span><p className="mt-3 text-xs font-semibold">{title}</p><p className="mt-1 text-[9px] text-[var(--subtle)]">{detail}</p></button>; }
function DataList({ title, items, saved = false }: { title: string; items: string[]; saved?: boolean }) { return <div><div className="flex items-center gap-2"><span className={saved ? "text-emerald-300" : "text-rose-300"}>{saved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}</span><h3 className="text-xs font-semibold">{title}</h3></div><div className="mt-3 space-y-2">{items.map((item) => <div key={item} className="flex items-start gap-2 text-[10px] leading-4 text-[var(--muted)]"><span className={`mt-1.5 size-1 shrink-0 rounded-full ${saved ? "bg-emerald-300" : "bg-rose-300"}`} />{item}</div>)}</div></div>; }
