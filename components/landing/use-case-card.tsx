"use client";

import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { CapabilityStatusBadge } from "@/components/ui/capability-status-badge";
import type { UseCaseDefinition } from "@/lib/config/capability-registry";

export function UseCaseCard({ useCase }: { useCase: UseCaseDefinition }) {
  const { t } = useLanguage();
  return <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-sm font-semibold">{useCase.name}</h3><CapabilityStatusBadge status={useCase.status} /></div><p className="mt-3 text-[10px] font-semibold leading-5 text-[var(--muted)]">{useCase.flow}</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><div><p className="text-[8px] font-semibold uppercase tracking-[.12em] text-[var(--subtle)]">{t("Detects", "Detecta")}</p><ul className="mt-2 space-y-1.5">{useCase.detects.map(item => <li key={item} className="flex gap-2 text-[9px] leading-4"><CheckCircle2 aria-hidden="true" size={11} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{item}</li>)}</ul></div><div><p className="text-[8px] font-semibold uppercase tracking-[.12em] text-[var(--subtle)]">Outcomes</p><ul className="mt-2 space-y-1.5">{useCase.outcomes.map(item => <li key={item} className="flex gap-2 text-[9px] leading-4"><CheckCircle2 aria-hidden="true" size={11} className="mt-0.5 shrink-0 text-teal-300" />{item}</li>)}</ul></div></div></article>;
}

