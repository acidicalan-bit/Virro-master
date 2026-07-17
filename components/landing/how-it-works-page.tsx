"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { FlowMap } from "@/components/landing/flow-map";
import { TransferPointCard } from "@/components/landing/transfer-point-card";
import { SignalSufficiencySection } from "@/components/evidence/signal-sufficiency-status";
import { useLanguage } from "@/components/i18n/language-provider";

export function HowItWorksPage() {
  const { t } = useLanguage();
  const principles = [t("Begin with one bounded transfer point.", "Empieza con un punto de transferencia acotado."), t("Separate observed evidence from estimates and inference.", "Separa evidencia observada de estimaciones e inferencias."), t("Do not force a verdict when the signal is insufficient.", "No fuerza un veredicto cuando la señal es insuficiente."), t("Require the receiver or client to confirm material outcomes.", "Requiere que el receptor o cliente confirme outcomes materiales.")];
  return <div className="public-landing min-h-screen bg-[var(--app-bg)] text-[var(--text)]"><a href="#how-main" className="skip-link">{t("Skip to how Virro works", "Saltar a cómo funciona Virro")}</a><PublicNavbar /><main id="how-main"><section className="px-5 pb-24 pt-40 md:px-8 md:pb-32 md:pt-48"><div className="mx-auto max-w-[1380px]"><p className="section-kicker">How Virro works</p><h1 className="section-display mt-6 max-w-5xl">{t("Follow understanding from its source to a confirmed outcome.", "Sigue el entendimiento desde su origen hasta un outcome confirmado.")}</h1><p className="section-lead mt-6 max-w-4xl">{t("Virro evaluates what moves, who receives it, what action is expected and whether the available evidence is sufficient to support the next decision.", "Virro evalúa qué se mueve, quién lo recibe, qué acción se espera y si la evidencia disponible es suficiente para sostener la siguiente decisión.")}</p><FlowMap /><TransferPointCard /><ul className="mt-8 grid gap-3 md:grid-cols-2">{principles.map((principle) => <li key={principle} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-xs leading-6"><CheckCircle2 aria-hidden="true" size={14} className="mt-1 shrink-0 text-teal-300" />{principle}</li>)}</ul><div className="mt-10 flex flex-col gap-3 sm:flex-row"><Link href="/demo" className="brand-primary-button">{t("Explore the six demo areas", "Explorar las seis áreas demo")} <ArrowRight aria-hidden="true" size={13} /></Link><Link href="/flow-audit" className="brand-secondary-button">Flow Understanding Audit</Link></div></div></section><SignalSufficiencySection /></main></div>;
}
