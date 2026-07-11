"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="language-toggle inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] p-1" aria-label={t("Language selector", "Selector de idioma")}>
      {!compact && <Languages size={13} className="mx-1.5 text-[var(--subtle)]" aria-hidden />}
      {(["es", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className={`rounded-full px-2.5 py-1.5 text-[9px] font-semibold tracking-[.08em] transition ${locale === value ? "bg-[var(--text)] text-[var(--app-bg)] shadow-sm" : "text-[var(--subtle)] hover:text-[var(--text)]"}`}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
