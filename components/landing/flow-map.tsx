"use client";

import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function FlowMap() {
  const { t } = useLanguage();
  const steps = [t("Source", "Fuente"), t("Transfer point", "Punto de transferencia"), t("Receiver", "Receptor"), t("Expected action", "Acción esperada"), t("Required evidence", "Evidencia necesaria"), "Readiness", t("Change", "Cambio"), "Handoff", "Outcome"];
  return <ol className="mt-12 flex flex-wrap items-center gap-2" aria-label={t("Universal operational understanding flow", "Flujo universal de entendimiento operativo")}>{steps.map((step, index) => <li key={step} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-semibold ${index === 1 ? "border-sky-300/30 bg-sky-300/[.08] text-sky-100" : "border-[var(--border)] bg-[var(--panel)]"}`}><span className="text-[var(--brand-blue)]">{index + 1}</span>{step}{index < steps.length - 1 && <ArrowRight aria-hidden="true" size={11} />}</li>)}</ol>;
}

