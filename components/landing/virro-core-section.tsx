"use client";

import { ArrowRight, CheckCircle2, FileInput, LockKeyhole, Radar, Sparkles, Workflow } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";

export function VirroCoreSection() {
  const { t } = useLanguage();

  return <section id="virro-core" className="virro-core-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
    <div className="mx-auto max-w-[1380px]">
      <RevealOnScroll className="virro-core-intro">
        <p className="section-kicker">Virro Core</p>
        <h2 className="section-display">{t("Virro Core maintains operational understanding when information moves, changes or becomes action.", "Virro Core mantiene el entendimiento operativo cuando la información se mueve, cambia o se convierte en acción.")}</h2>
        <p className="section-lead">{t("It analyzes operational events, detects missing context, estimates readiness, identifies critical changes and recommends actions to keep teams, tools and AI aligned.", "Analiza eventos operativos, detecta contexto faltante, estima readiness, identifica cambios críticos y recomienda acciones para mantener alineados equipos, herramientas e IA.")}</p>
      </RevealOnScroll>

      <RevealOnScroll className="virro-core-system mt-12">
        <div className="virro-core-system-head">
          <div><span>VIRRO CORE / ANALYZE-SAFE</span><strong>{t("Operational flow", "Flujo operativo")}</strong></div>
          <p><i />{t("Safe mode active", "Modo seguro activo")}</p>
        </div>

        <ol className="virro-core-operating-flow" aria-label={t("Virro Core operational flow", "Flujo operativo de Virro Core")}>
          <li className="virro-core-stage core-stage-input">
            <div className="core-stage-heading"><FileInput aria-hidden="true" size={16} /><h3>{t("Daily information", "Información diaria")}</h3></div>
            <p className="core-stage-summary">{t("Messages / tickets / user stories / bugs", "Mensajes / tickets / HUs / bugs")}</p>
            <blockquote>{t("“Priority changed after the critical integration issue.”", "“La prioridad cambió después del error crítico de integración.”")}</blockquote>
            <ul className="core-risk-chips" aria-label={t("Operating inputs", "Entradas operativas")}>
              <li>{t("Processes", "Procesos")}</li>
              <li>Handoffs</li>
              <li>{t("AI instructions", "Instrucciones para IA")}</li>
            </ul>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-safe">
            <div className="core-stage-heading"><LockKeyhole aria-hidden="true" size={16} /><h3>{t("Company standards", "Estándares de la empresa")}</h3></div>
            <div className="core-safe-status"><span><CheckCircle2 aria-hidden="true" size={13} />Privacy Shield {t("active", "activo")}</span><b>Raw data stored: No</b></div>
            <ul className="core-analysis-list">
              {[t("Guidelines", "Lineamientos"), t("Criteria", "Criterios"), t("Handoff rules", "Reglas de handoff"), t("Formats", "Formatos"), t("Ways of working", "Modo de trabajo")].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-readiness">
            <div className="core-stage-heading"><Radar aria-hidden="true" size={16} /><h3>{t("Readiness & risks", "Readiness & riesgos")}</h3></div>
            <p className="core-readiness-score">64<small>/100</small></p>
            <div className="core-readiness-meter" aria-label="Readiness 64/100"><i><b /></i></div>
            <p className="core-stage-risk"><span>{t("Main risk", "Riesgo principal")}</span>{t("Outdated knowledge and ambiguous impact.", "Conocimiento desactualizado e impacto ambiguo.")}</p>
            <strong className="core-readiness-badge">Change Readiness · {t("Medium", "Medio")}</strong>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-pack">
            <div className="core-stage-heading"><Sparkles aria-hidden="true" size={16} /><h3>{t("Operational change", "Cambio operativo")}</h3></div>
            <p className="core-pack-name">Change Understanding</p>
            <p className="core-stage-copy">{t("Identifies what changed, what is impacted and who must act.", "Identifica qué cambió, qué se impacta y quién debe actuar.")}</p>
            <ul className="core-analysis-list core-pack-list">
              {[t("Changed priority", "Prioridad modificada"), t("Affected artifacts", "Artefactos afectados"), t("Outdated context", "Contexto obsoleto"), t("Required owner", "Responsable requerido")].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-action">
            <div className="core-stage-heading"><Workflow aria-hidden="true" size={16} /><h3>{t("Clear action", "Acción clara")}</h3></div>
            <p className="core-decision">{t("Update the shared operating context.", "Actualizar el contexto operativo compartido.")}</p>
            <p className="core-stage-copy">{t("Generates updated deliverables, recommendations, onboarding and safe context for AI.", "Genera entregables, recomendaciones, artefactos actualizados, onboarding y contexto seguro para IA.")}</p>
            <a href="#auditoria">{t("View executive signal", "Ver señal ejecutiva")} <ArrowRight aria-hidden="true" size={13} /></a>
          </li>
        </ol>

        <footer className="virro-core-foot"><CheckCircle2 aria-hidden="true" size={14} /><span>{t("Virro masks sensitive information by default. It retains understanding signals, patterns and standards—not private conversations.", "Virro enmascara información delicada por defecto. Conserva señales, patrones y estándares de entendimiento; no conversaciones privadas.")}</span></footer>
      </RevealOnScroll>
    </div>
  </section>;
}
