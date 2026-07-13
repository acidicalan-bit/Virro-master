"use client";

import { ArrowRight, FileBarChart, LockKeyhole, Network, Radar, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";

const modules = [
  { title: "Privacy Shield", detail: ["Mask sensitive entities before analysis.", "Enmascara entidades sensibles antes del análisis."], icon: LockKeyhole },
  { title: "Readiness Gate", detail: ["Estimate what must be validated before moving forward.", "Estima qué falta validar antes de avanzar."], icon: Radar },
  { title: "Pack Engine", detail: ["Select the right review for the flow and receiver.", "Selecciona la revisión adecuada para el flujo y receptor."], icon: Network },
  { title: "Enterprise Understanding Map", detail: ["Connect flow signals into a management view.", "Conecta señales del flujo en una vista de gestión."], icon: Network },
  { title: "Executive Report", detail: ["Surface priority, evidence and next action.", "Expone prioridad, evidencia y siguiente acción."], icon: FileBarChart },
];

export function VirroCoreSection() {
  const { locale, t } = useLanguage();
  return <section id="virro-core" className="virro-core-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
    <div className="mx-auto max-w-[1380px]">
      <RevealOnScroll className="virro-core-intro">
        <p className="section-kicker">Virro Core</p>
        <h2 className="section-display">{t("One connected operating system for information that needs to move forward.", "Un sistema conectado para la información que necesita avanzar.")}</h2>
        <p className="section-lead">{t("The privacy-first engine that analyzes operational events, masks sensitive information, estimates readiness and retains understanding signals without storing raw content by default.", "El motor privacy-first que analiza eventos operativos, enmascara información sensible, estima readiness y conserva señales de entendimiento sin guardar contenido crudo por defecto.")}</p>
      </RevealOnScroll>

      <RevealOnScroll className="virro-core-system mt-12">
        <div className="virro-core-system-head">
          <div><span>VIRRO CORE / ANALYZE-SAFE</span><strong>{t("Operational signal engine", "Motor de señales operativas")}</strong></div>
          <p><i />{t("Safe mode active", "Modo seguro activo")}</p>
        </div>
        <div className="virro-core-rail">
          {modules.map(({ title, detail, icon: Icon }, index) => <article key={title}>
            <span>0{index + 1}</span>
            <Icon size={17} />
            <h3>{title}</h3>
            <p>{detail[locale === "es" ? 1 : 0]}</p>
          </article>)}
        </div>
        <div className="virro-core-signals">
          <div className="core-mask-signal"><span>{t("Privacy Shield masking", "Privacy Shield masking")}</span><strong>[EMAIL_1] · [CLIENT_1] · [PERSON_1]</strong><small>{t("Raw content is transient", "El contenido crudo es transitorio")}</small></div>
          <div className="core-readiness-signal"><span>READINESS</span><strong>68<small>/100</small></strong><i><b /></i></div>
          <div className="core-report-signal"><span>EXECUTIVE REPORT</span><strong>{t("Validate scope owner before delivery", "Validar responsable de alcance antes de delivery")}</strong><a href="#auditoria">{t("View next action", "Ver siguiente acción")} <ArrowRight size={12} /></a></div>
        </div>
        <div className="virro-core-foot"><ShieldCheck size={14} /><span>{t("Signals stored: readiness, interpretation risks, patterns and aggregated reports.", "Señales almacenadas: readiness, riesgos de interpretación, patrones y reportes agregados.")}</span></div>
      </RevealOnScroll>
    </div>
  </section>;
}
