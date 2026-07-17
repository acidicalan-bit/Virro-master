"use client";

import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { CapabilityStatusBadge } from "@/components/ui/capability-status-badge";
import type { EntryModeDefinition } from "@/lib/config/capability-registry";

export function EntryModeCard({ entry }: { entry: EntryModeDefinition }) {
  const { locale, t } = useLanguage();
  return <article className="flex h-full flex-col rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-6"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-xl font-semibold">{entry.name}</h3><CapabilityStatusBadge status={entry.status} /></div><p className="mt-4 text-xs leading-6 text-[var(--muted)]">{entry.description[locale]}</p><p className="mt-3 text-[10px] leading-5 text-[var(--subtle)]">{entry.detail[locale]}</p><a href="#solicitar-auditoria" className="brand-secondary-button mt-6 self-start text-[10px]">{t("Analyze a workflow", "Analizar un flujo")} <ArrowRight aria-hidden="true" size={13} /></a></article>;
}

