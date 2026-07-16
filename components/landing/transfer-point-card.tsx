"use client";

import { Network } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function TransferPointCard() {
  const { t } = useLanguage();
  return <article className="mt-8 rounded-[24px] border border-sky-300/20 bg-[linear-gradient(135deg,var(--panel),color-mix(in_srgb,var(--panel)_88%,var(--brand-blue)_12%))] p-6 md:p-8"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-300/[.07] text-sky-200"><Network aria-hidden="true" size={19} /></span><div><p className="section-kicker">Understanding Transfer Point</p><h3 className="mt-3 text-xl font-semibold tracking-[-.03em]">{t("The central unit Virro evaluates", "La unidad central que Virro evalúa")}</h3><p className="mt-3 max-w-4xl text-xs leading-6 text-[var(--muted)]">{t("The moment when information changes owner, stage, tool or purpose, and a receiver needs to understand it in order to act.", "El momento en que una información cambia de responsable, etapa, herramienta o propósito, y un receptor necesita entenderla para actuar.")}</p></div></div></article>;
}

