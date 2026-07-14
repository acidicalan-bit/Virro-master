"use client";

import Image from "next/image";
import { Bot, Boxes, FileCode2, Handshake, Network, PackageCheck, UserSearch, UsersRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

const nodes = [
  { en: "Product Delivery", es: "Entrega de producto", icon: PackageCheck },
  { en: "AI Understanding", es: "Entendimiento para IA", icon: Bot },
  { en: "Handoffs", es: "Handoffs", icon: Handshake },
  { en: "Processes", es: "Procesos", icon: Network },
  { en: "Onboarding", es: "Onboarding", icon: UsersRound },
  { en: "Consulting", es: "Consultoras", icon: Boxes },
  { en: "Talent & Staffing", es: "Talento y staffing", icon: UserSearch },
  { en: "Technical context", es: "Contexto técnico", icon: FileCode2 },
];

export function ArchitectureOrbit() {
  const { locale, t } = useLanguage();
  return (
    <section id="arquitectura" className="architecture-orbit-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--brand-blue)]">{t("Organizational architecture", "Arquitectura organizacional")}</p>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-.052em] md:text-6xl">{t("One understanding layer. Every critical flow.", "Una capa de entendimiento. Todos los flujos críticos.")}</h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--muted)]">{t("Virro sits between scattered information and execution. It makes intent, missing context, interpretation risk and readiness visible before another person, team, tool or AI acts.", "Virro vive entre la información dispersa y la ejecución. Hace visibles intención, contexto faltante, riesgo de interpretación y readiness antes de que actúe otra persona, equipo, herramienta o IA.")}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[t("Capture the event", "Captura el evento"), t("Estimate the risk", "Estima el riesgo"), t("Guide the action", "Orienta la acción")].map((item, index) => <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"><span className="text-[9px] font-semibold text-[var(--brand-blue)]">0{index + 1}</span><p className="mt-2 text-[10px] font-medium">{item}</p></div>)}
          </div>
        </div>
        <div className="orbit-stage" aria-label={t("Virro solution architecture", "Arquitectura de soluciones Virro")}>
          <div className="orbit-ring orbit-ring-outer" aria-hidden />
          <div className="orbit-ring orbit-ring-inner" aria-hidden />
          <div className="orbit-core"><Image src="/brand/virro-icon.svg" alt="" width={48} height={40} sizes="48px" /><strong>Virro</strong><span>Operating Understanding Layer</span></div>
          <div className="orbit-nodes">
            {nodes.map(({ en, es, icon: Icon }, index) => <div key={en} className="orbit-node" style={{ "--orbit-index": index } as React.CSSProperties}><span><Icon size={14} /></span><strong>{locale === "es" ? es : en}</strong></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
