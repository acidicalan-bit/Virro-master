"use client";

import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function OutcomePanel({ outcomes }: { outcomes: string[] }) {
  const { t } = useLanguage();
  return <section className="rounded-2xl border border-teal-300/20 bg-teal-300/[.04] p-5"><h3 className="text-sm font-semibold">{t("Observable outcomes", "Outcomes observables")}</h3><ul className="mt-3 space-y-2">{outcomes.map(item => <li key={item} className="flex gap-2 text-[10px] leading-5 text-[var(--muted)]"><CheckCircle2 aria-hidden="true" size={12} className="mt-1 shrink-0 text-teal-300" />{item}</li>)}</ul><p className="mt-4 text-[9px] text-[var(--subtle)]">{t("An outcome is not attributed to Virro until the client confirms it.", "Un outcome no se atribuye a Virro hasta que el cliente lo confirma.")}</p></section>;
}

