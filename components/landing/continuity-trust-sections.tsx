"use client";

import { ArrowRight, CheckCircle2, KeyRound, Layers3, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";

const changeOutputs = [
  "Change Impact Map",
  "Updated HUs",
  "Updated Test Cases",
  "Development Impact Brief",
  "Documentation Update Plan",
  "Support Brief",
  "AI Context Update",
  "Onboarding Pack",
  "Executive Change Summary",
];

export function ChangeKnowledgeLayer() {
  const { t } = useLanguage();
  return <section id="change-knowledge" className="capability-system-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36"><div className="mx-auto max-w-[1380px]"><RevealOnScroll><p className="section-kicker">Change & Knowledge Integration Layer</p><h2 className="section-display max-w-5xl">{t("Virro also helps when the company changes.", "Virro también ayuda cuando la empresa cambia.")}</h2><p className="section-lead mt-6 max-w-4xl">{t("Changes in priority, scope, provider, tool, integration, critical errors, blockers or new people can misalign complete areas when they are not understood correctly.", "Cambios de prioridad, alcance, proveedor, herramienta, integración, error crítico, bloqueante o incorporación de nuevas personas pueden desalinear áreas completas si no se entienden correctamente.")}</p><p className="section-lead mt-4 max-w-4xl">{t("Virro identifies what changed, which areas are impacted, what knowledge enters or becomes obsolete, which artifacts must be updated and the minimum actions required to keep the workflow clear.", "Virro identifica qué cambió, qué áreas se impactan, qué conocimiento entra o queda obsoleto, qué artefactos deben actualizarse y qué acciones mínimas permiten mantener claro el flujo de trabajo.")}</p></RevealOnScroll><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{changeOutputs.map((output, index) => <div key={output} className="flex min-h-20 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-xs font-semibold shadow-[0_18px_55px_rgba(0,0,0,.08)]"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--panel-soft)] text-[var(--brand-blue)]">{index === 7 ? <UsersRound aria-hidden="true" size={15} /> : index === 8 ? <Sparkles aria-hidden="true" size={15} /> : <RefreshCw aria-hidden="true" size={15} />}</span>{output}</div>)}</div></div></section>;
}

export function PrivacyTrustHome() {
  const { t } = useLanguage();
  const cards = [
    [t("Masks sensitive information", "Enmascara información delicada"), t("Emails, phone numbers, tokens, secrets and sensitive data are masked before safe analysis.", "Emails, teléfonos, tokens, secretos y datos sensibles se enmascaran antes del análisis seguro."), LockKeyhole],
    [t("Does not store private conversations by default", "No guarda conversaciones privadas por defecto"), t("Virro does not need complete messages, raw documents or transcripts to detect understanding patterns.", "Virro no necesita conservar mensajes completos, documentos crudos o transcripciones para detectar patrones de entendimiento."), ShieldCheck],
    [t("Stores operational signals", "Guarda señales operativas"), t("Readiness, risks, standards, guidelines, missing criteria, handoff rules and ways of working.", "Readiness, riesgos, estándares, lineamientos, criterios faltantes, reglas de handoff y modo de trabajo del equipo."), Layers3],
    [t("Designed for enterprise", "Pensado para enterprise"), t("Improves understanding without becoming another repository of sensitive information.", "Mejora entendimiento sin convertirse en un nuevo repositorio de información sensible."), KeyRound],
  ] as const;
  return <section id="privacy-home" className="privacy-shield-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36"><div className="mx-auto max-w-[1380px]"><div className="privacy-shield-shell"><div className="privacy-shield-copy"><div className="privacy-icon"><ShieldCheck aria-hidden="true" size={22} /></div><p className="section-kicker">Privacy by design</p><h2>{t("Understanding signals, not private conversations.", "Señales de entendimiento, no conversaciones privadas.")}</h2><p>{t("Virro is designed to analyze operational information without becoming the client’s document repository. In safe mode, it masks sensitive information, processes content transiently and retains understanding signals—not raw content.", "Virro está diseñado para analizar información operativa sin convertirse en repositorio documental del cliente. En modo seguro, enmascara información delicada, procesa el contenido de forma transitoria y conserva señales de entendimiento, no contenido crudo.")}</p><strong>{t("Virro stores understanding signals, not private conversations.", "Virro guarda señales de entendimiento, no conversaciones privadas.")}</strong></div><div className="privacy-points">{cards.map(([title, copy, Icon], index) => <div key={title}><span>0{index + 1}</span><Icon aria-hidden="true" size={20} /><p>{title}</p><small className="mt-2 text-[9px] leading-4 text-[var(--subtle)]">{copy}</small></div>)}</div></div></div></section>;
}

export function ClosingUnderstandingCta() {
  const { t } = useLanguage();
  return <section className="px-5 py-24 md:px-8 md:py-36"><div className="mx-auto max-w-[1380px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--panel)_90%,var(--brand-blue)_10%),var(--panel))] p-7 shadow-[0_35px_120px_rgba(0,0,0,.16)] md:p-14"><div className="max-w-5xl"><p className="section-kicker">Operational understanding continuity</p><h2 className="section-display mt-5">{t("Keep your company’s operational understanding clear as work moves and changes.", "Mantén el entendimiento operativo de tu empresa mientras el trabajo avanza y cambia.")}</h2><p className="section-lead mt-6 max-w-4xl">{t("Virro helps detect where information becomes ambiguous, incomplete or outdated, and turns that understanding into standards, deliverables, actions, onboarding and safe context for AI.", "Virro ayuda a detectar dónde la información se vuelve ambigua, incompleta o desactualizada, y convierte ese entendimiento en estándares, entregables, acciones, onboarding y contexto seguro para IA.")}</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="#solicitar-diagnostico" className="brand-primary-button">{t("Request diagnosis", "Solicitar diagnóstico")} <ArrowRight aria-hidden="true" size={14} /></a><a href="mailto:contacto@virro.app" className="brand-secondary-button">{t("Talk to Virro", "Hablar con Virro")}</a></div><p className="mt-8 flex items-center gap-2 text-[10px] text-[var(--subtle)]"><CheckCircle2 aria-hidden="true" size={13} className="text-[var(--brand-blue)]" />{t("Designed to process operational information without becoming the client’s document repository.", "Diseñado para procesar información operativa sin convertirse en repositorio documental del cliente.")}</p></div></div></section>;
}
