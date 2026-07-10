"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function ScoreRing({ value, label, compact = false }: { value: number; label: string; compact?: boolean }) {
  const { t } = useLanguage();
  const color = value >= 75 ? "#5eead4" : value >= 55 ? "#fbbf24" : "#fb7185";
  return (
    <div className="flex items-center gap-3">
      <div className={`relative grid shrink-0 place-items-center rounded-full ${compact ? "size-11" : "size-16"}`} style={{ background: `conic-gradient(${color} ${value * 3.6}deg, var(--ring-track) 0deg)` }}>
        <div className={`grid place-items-center rounded-full bg-[var(--panel)] font-semibold ${compact ? "size-9 text-xs" : "size-[52px] text-base"}`}>{value}</div>
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        {!compact && <p className="mt-1 text-[11px] text-[var(--subtle)]">{t("Estimated signal", "Señal estimada")}</p>}
      </div>
    </div>
  );
}
