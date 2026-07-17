"use client";

import { CapabilityStatusBadge } from "@/components/ui/capability-status-badge";
import type { CapabilityStatus } from "@/lib/config/capability-registry";

export function PrivacyRuntimeCard({ title, status, receives, rawRetention, safeSignals, limitation }: { title: string; status: CapabilityStatus; receives: string; rawRetention: string; safeSignals: string; limitation: string }) {
  return <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-sm font-semibold">{title}</h3><CapabilityStatusBadge status={status} /></div><dl className="mt-4 space-y-3 text-[10px] leading-5"><div><dt className="text-[8px] uppercase tracking-[.1em] text-[var(--subtle)]">Receive</dt><dd>{receives}</dd></div><div><dt className="text-[8px] uppercase tracking-[.1em] text-[var(--subtle)]">Raw content retained</dt><dd>{rawRetention}</dd></div><div><dt className="text-[8px] uppercase tracking-[.1em] text-[var(--subtle)]">Safe signals</dt><dd>{safeSignals}</dd></div><div><dt className="text-[8px] uppercase tracking-[.1em] text-[var(--subtle)]">Scope limitation</dt><dd className="text-[var(--muted)]">{limitation}</dd></div></dl></article>;
}
