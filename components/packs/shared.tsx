"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { packUiText } from "@/lib/i18n/pack-ui-copy";

export function PackHeader({ order, eyebrow, title, description, statement, icon }: { order: string; eyebrow: string; title: string; description: string; statement: string; icon: ReactNode }) {
  const { locale, t } = useLanguage();
  return <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-4xl"><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-teal-300"><span className="grid size-7 place-items-center rounded-md bg-teal-400/10">{icon}</span>{order} · {packUiText(locale, eyebrow)}</div><h1 className="text-2xl font-semibold tracking-[-.035em] md:text-[30px]">{title}</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p><p className="mt-3 border-l-2 border-teal-300 pl-3 text-xs font-medium leading-5 text-[var(--text)]">{statement}</p></div><Link href="/app/inbox" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-semibold text-slate-950">{t("Analyze new event", "Analizar nuevo evento")} <ArrowRight size={13} /></Link></section>;
}

export function ScoreHero({ label, value, detail }: { label: string; value: number; detail: string }) {
  const { locale, t } = useLanguage();
  const band = value >= 75 ? t("Stronger signal", "Señal más sólida") : value >= 55 ? t("Needs context", "Necesita contexto") : t("Insufficient for a verdict", "Insuficiente para un veredicto");
  const color = value >= 75 ? "text-teal-300" : value >= 55 ? "text-amber-300" : "text-rose-300";
  return <div className="panel p-5"><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-[var(--subtle)]">{packUiText(locale, label)}</p><p className={`mt-4 text-2xl font-semibold tracking-[-.04em] ${color}`}>{band}</p><p className="mt-2 text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--subtle)]">{t("Directional demo finding", "Hallazgo direccional de demo")}</p><p className="mt-4 text-[10px] leading-4 text-[var(--muted)]">{packUiText(locale, detail)}</p></div>;
}

export function SectionCard({ title, subtitle, icon, children, className = "" }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  const { locale } = useLanguage();
  return <article className={`panel p-5 ${className}`}><div className="flex items-center gap-2">{icon && <span className="text-teal-300">{icon}</span>}<div><h2 className="text-sm font-semibold">{packUiText(locale, title)}</h2>{subtitle && <p className="mt-1 text-[10px] text-[var(--subtle)]">{packUiText(locale, subtitle)}</p>}</div></div><div className="mt-4">{children}</div></article>;
}

export function InsightList({ items, empty = "No material gap detected.", tone = "teal" }: { items: string[]; empty?: string; tone?: "teal" | "amber" | "rose" }) {
  const { locale, t } = useLanguage(); const colors = { teal: "text-teal-300", amber: "text-amber-300", rose: "text-rose-300" };
  return <div className="space-y-2">{items.length ? items.map((item) => <div key={item} className="flex items-start gap-2 text-[11px] leading-5 text-[var(--muted)]">{tone === "teal" ? <CheckCircle2 size={13} className={`mt-1 shrink-0 ${colors[tone]}`} /> : <CircleAlert size={13} className={`mt-1 shrink-0 ${colors[tone]}`} />}{packUiText(locale, item)}</div>) : <p className="text-[11px] text-emerald-300">{empty === "No material gap detected." ? t(empty, "No se detectó una brecha material.") : packUiText(locale, empty)}</p>}</div>;
}

export function OutputChips({ outputs }: { outputs: string[] }) { const { locale } = useLanguage(); return <div className="flex flex-wrap gap-2">{outputs.map((output) => <span key={output} className="rounded-lg border border-teal-400/15 bg-teal-400/[.05] px-3 py-2 text-[10px] font-medium text-teal-200">{packUiText(locale, output)}</span>)}</div>; }
export function FactGrid({ facts }: { facts: Array<{ label: string; value: string }> }) { const { locale } = useLanguage(); return <div className="grid gap-3 sm:grid-cols-2">{facts.map((fact) => <div key={fact.label} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><p className="text-[9px] uppercase tracking-[.1em] text-[var(--subtle)]">{packUiText(locale, fact.label)}</p><p className="mt-1.5 text-xs leading-5">{packUiText(locale, fact.value)}</p></div>)}</div>; }
export function LabeledList({ label, items, tone = "teal" }: { label: string; items: string[]; tone?: "teal" | "amber" | "rose" }) { const { locale } = useLanguage(); return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--subtle)]">{packUiText(locale, label)}</p><InsightList items={items} tone={tone} /></div>; }
