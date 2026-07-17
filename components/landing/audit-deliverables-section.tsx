"use client";

import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { auditDeliverables } from "@/lib/config/audit-offer";

export function AuditDeliverablesSection({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useLanguage();
  return <section aria-labelledby="audit-deliverables-title" className={compact ? "mt-8" : "border-y border-[var(--border)] bg-[var(--panel-soft)] px-5 py-24 md:px-8 md:py-32"}><div className={compact ? "" : "mx-auto max-w-[1380px]"}><p className="section-kicker">Flow Understanding Audit</p><h2 id="audit-deliverables-title" className={compact ? "mt-3 text-2xl font-semibold tracking-[-.04em]" : "section-display max-w-5xl"}>{t("Twelve concrete outputs from one bounded workflow.", "Doce entregables concretos de un flujo acotado.")}</h2><p className="mt-4 max-w-3xl text-xs leading-6 text-[var(--muted)]">{t("Every finding is tied to available evidence, its limitations and a human review point.", "Cada hallazgo se vincula con la evidencia disponible, sus limitaciones y un punto de revisión humana.")}</p><ol className={`mt-7 grid gap-2 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>{auditDeliverables.map((item, index) => <li key={item.en} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 text-[10px] leading-5"><span className="font-semibold text-[var(--brand-blue)]">{String(index + 1).padStart(2, "0")}</span><CheckCircle2 aria-hidden="true" size={12} className="mt-1 shrink-0 text-teal-300" /><span>{item[locale]}</span></li>)}</ol></div></section>;
}
