"use client";

import { CircleAlert, ShieldQuestion } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { getSignalSufficiencyState, signalSufficiencyStates, type SignalSufficiencyState } from "@/lib/evidence/signal-sufficiency";

const tones: Record<SignalSufficiencyState, string> = {
  ready: "border-emerald-300/20 text-emerald-200",
  ready_with_conditions: "border-sky-300/20 text-sky-200",
  needs_context: "border-amber-300/20 text-amber-200",
  insufficient_signal: "border-orange-300/20 text-orange-200",
  human_review_required: "border-violet-300/20 text-violet-200",
  not_applicable: "border-[var(--border)] text-[var(--subtle)]",
};

export function SignalSufficiencyStatus({ state }: { state: SignalSufficiencyState }) {
  const { locale } = useLanguage();
  const item = getSignalSufficiencyState(state);
  return <div className={`rounded-xl border bg-[var(--panel)] p-4 ${tones[state]}`}><p className="text-[10px] font-semibold">{item[locale]}</p><p className="mt-2 text-[9px] leading-4 text-[var(--muted)]">{item.description[locale]}</p></div>;
}

export function SignalSufficiencySection() {
  const { t } = useLanguage();
  return <section id="signal-sufficiency" className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--panel-soft)] px-5 py-24 md:px-8 md:py-32"><div className="mx-auto max-w-[1380px]"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="section-kicker">Signal Sufficiency</p><h2 className="section-display">{t("Virro also knows when it should not offer an opinion.", "Virro también sabe cuándo no debería opinar.")}</h2></div><div className="rounded-2xl border border-orange-300/20 bg-orange-300/[.05] p-5"><CircleAlert aria-hidden="true" className="text-orange-200" size={18} /><p className="mt-3 text-sm font-semibold">{t("Insufficient signal is not a zero score.", "Señal insuficiente no es un score cero.")}</p><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{t("The available information cannot reliably determine whether this work was ready. Virro does not force a verdict.", "La información disponible no permite determinar de forma confiable si este trabajo estaba listo. Virro no fuerza un veredicto.")}</p></div></div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{signalSufficiencyStates.map(item => <SignalSufficiencyStatus key={item.id} state={item.id} />)}</div><p className="mt-6 flex items-center gap-2 text-[10px] text-[var(--subtle)]"><ShieldQuestion aria-hidden="true" size={13} />{t("Every status must show its evidence, missing sources and limitations.", "Cada estado debe mostrar su evidencia, fuentes ausentes y limitaciones.")}</p></div></section>;
}

