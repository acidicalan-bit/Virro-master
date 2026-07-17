"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { capabilityStatusLabels, type CapabilityStatus } from "@/lib/config/capability-registry";

const tone: Record<CapabilityStatus, string> = {
  available: "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200",
  assisted: "border-sky-300/20 bg-sky-300/[.07] text-sky-200",
  pilot: "border-amber-300/20 bg-amber-300/[.07] text-amber-200",
  planned: "border-violet-300/20 bg-violet-300/[.07] text-violet-200",
  future: "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--subtle)]",
};

export function CapabilityStatusBadge({ status }: { status: CapabilityStatus }) {
  const { locale } = useLanguage();
  const label = capabilityStatusLabels[status][locale];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.08em] ${tone[status]}`}>{label}</span>;
}

