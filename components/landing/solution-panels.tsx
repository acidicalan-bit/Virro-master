"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { localizeModule, modules } from "@/lib/config/modules";

const solutionIds = ["product-delivery", "ai-understanding", "handoff-intelligence", "technical-documentation", "process-understanding", "onboarding", "consulting-delivery", "talent-staffing"];

export function SolutionPanels() {
  const { locale, t } = useLanguage();
  const solutions = modules.filter((module) => solutionIds.includes(module.id)).map((module) => localizeModule(module, locale));

  return (
    <section id="soluciones" className="border-y border-[var(--border)] bg-[var(--panel-soft)] px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--brand-blue)]">{t("Solutions", "Soluciones")}</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.052em] md:text-6xl">{t("Designed around where meaning breaks.", "Diseñado alrededor de donde el significado se distorsiona.")}</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)]">{t("Each pack examines a real transfer of operational understanding and produces evidence a team can validate before execution.", "Cada pack examina una transferencia real de entendimiento operativo y produce evidencia que un equipo puede validar antes de ejecutar.")}</p></div>
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {solutions.map(({ id, href, icon: Icon, label, description, capabilities }, index) => <article key={id} className={`solution-panel group relative overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--panel)] ${index < 4 ? "min-h-[300px] p-7 md:p-9" : "min-h-[235px] p-6 md:p-7"}`}><div className="solution-panel-number">0{index + 1}</div><div className="relative flex h-full flex-col"><span className="grid size-11 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--brand-blue)]"><Icon size={19} /></span><h3 className={`mt-7 font-semibold tracking-[-.04em] ${index < 4 ? "text-2xl md:text-3xl" : "text-xl"}`}>{label}</h3><p className="mt-3 max-w-xl text-xs leading-6 text-[var(--muted)]">{description}</p><div className="mt-6 flex flex-wrap gap-2">{capabilities.slice(0, 3).map((item) => <span key={item} className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-[9px] text-[var(--subtle)]">{item}</span>)}</div><Link href={href} className="mt-auto inline-flex items-center gap-2 pt-8 text-[10px] font-semibold text-[var(--brand-blue)]">{t("Explore in enterprise demo", "Explorar en demo enterprise")} <ArrowUpRight size={13} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></div></article>)}
        </div>
      </div>
    </section>
  );
}
