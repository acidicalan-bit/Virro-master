"use client";

import { CircleAlert } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function LimitationsPanel({ limitations }: { limitations: string[] }) {
  const { t } = useLanguage();
  return <aside className="rounded-2xl border border-amber-300/20 bg-amber-300/[.04] p-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><CircleAlert aria-hidden="true" size={15} className="text-amber-200" />{t("Limitations", "Limitaciones")}</h3><ul className="mt-3 space-y-2">{limitations.map(item => <li key={item} className="text-[10px] leading-5 text-[var(--muted)]">{item}</li>)}</ul></aside>;
}

