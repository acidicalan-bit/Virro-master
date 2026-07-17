"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { evidenceClassificationLabels, type EvidenceItem } from "@/lib/evidence/evidence-classification";

export function EvidenceSection({ items }: { items: EvidenceItem[] }) {
  const { locale, t } = useLanguage();
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5"><h3 className="text-sm font-semibold">{t("Evidence", "Evidencia")}</h3><div className="mt-4 space-y-2">{items.map(item => <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><span className="text-[8px] font-semibold uppercase tracking-[.1em] text-[var(--brand-blue)]">{evidenceClassificationLabels[item.classification][locale]}</span><p className="mt-2 text-[11px] font-semibold">{item.title}</p><p className="mt-1 text-[9px] leading-4 text-[var(--muted)]">{item.detail}</p></article>)}</div></section>;
}

