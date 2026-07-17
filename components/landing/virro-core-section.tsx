"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";
import { FlowMap } from "@/components/landing/flow-map";
import { TransferPointCard } from "@/components/landing/transfer-point-card";
import { CapabilityStatusBadge } from "@/components/ui/capability-status-badge";
import { capabilityRegistry } from "@/lib/config/capability-registry";

export function VirroCoreSection() {
  const { locale, t } = useLanguage();
  return <section id="virro-core" className="virro-core-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
    <div className="mx-auto max-w-[1380px]">
      <RevealOnScroll>
        <p className="section-kicker">Virro Core</p>
        <h2 className="section-display max-w-5xl">{t("Understand the transfer before judging the result.", "Entiende la transferencia antes de evaluar el resultado.")}</h2>
        <p className="section-lead mt-6 max-w-4xl">{t("Virro analyzes the points where work is created, changes or passes to the next owner, and detects when information still does not enable sufficiently clear execution.", "Virro analiza los puntos donde el trabajo se crea, cambia o pasa al siguiente responsable, y detecta cuándo la información todavía no permite ejecutar con suficiente claridad.")}</p>
      </RevealOnScroll>
      <TransferPointCard />
      <FlowMap />
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {capabilityRegistry.map(capability => <article key={capability.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-lg font-semibold">{capability.name}</h3><CapabilityStatusBadge status={capability.status} /></div>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{capability.description[locale]}</p>
        </article>)}
      </div>
      <p className="mt-8 flex items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]"><CheckCircle2 aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-teal-300" />{t("Virro does not force a score when the evidence cannot support a reliable verdict.", "Virro no fuerza un score cuando la evidencia no permite sostener un veredicto confiable.")}</p>
      <Link href="/app/scenarios" className="brand-secondary-button mt-7 text-sm">{t("Explore enterprise demo", "Explorar demo enterprise")} <ArrowRight aria-hidden="true" size={14} /></Link>
    </div>
  </section>;
}
