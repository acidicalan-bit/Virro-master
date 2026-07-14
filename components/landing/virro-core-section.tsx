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
        <h2 className="section-display">{t("The engine that validates whether information can move forward.", "El motor que valida si la información puede avanzar.")}</h2>
        <p className="section-lead">{t("Virro analyzes operational events, detects missing context, estimates readiness and recommends the next action without storing raw content by default.", "Virro analiza eventos operativos, detecta contexto faltante, estima readiness y recomienda la siguiente acción sin guardar contenido crudo por defecto.")}</p>
      </RevealOnScroll>

      <RevealOnScroll className="virro-core-system mt-12">
        <div className="virro-core-system-head">
          <div><span>VIRRO CORE / ANALYZE-SAFE</span><strong>{t("Operational flow", "Flujo operativo")}</strong></div>
          <p><i />{t("Safe mode active", "Modo seguro activo")}</p>
        </div>

        <ol className="virro-core-operating-flow" aria-label={t("Virro Core operational flow", "Flujo operativo de Virro Core")}>
          <li className="virro-core-stage core-stage-input">
            <div className="core-stage-heading"><FileInput aria-hidden="true" size={16} /><h3>{t("Information received", "Información recibida")}</h3></div>
            <p className="core-stage-summary">{t("Ticket / handoff / AI instruction", "Ticket / handoff / instrucción para IA")}</p>
            <blockquote>{t("“The client asked to adjust the approval flow.”", "“El cliente pidió ajustar el flujo de aprobación.”")}</blockquote>
            <ul className="core-risk-chips" aria-label={t("Missing context", "Contexto faltante")}>
              <li>{t("No owner", "Sin responsable")}</li>
              <li>{t("No success criteria", "Sin criterio de éxito")}</li>
              <li>{t("No defined impact", "Sin impacto definido")}</li>
            </ul>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-safe">
            <div className="core-stage-heading"><LockKeyhole aria-hidden="true" size={16} /><h3>Analyze-Safe</h3></div>
            <div className="core-safe-status"><span><CheckCircle2 aria-hidden="true" size={13} />Privacy Shield {t("active", "activo")}</span><b>Raw data stored: No</b></div>
            <ul className="core-analysis-list">
              {[t("Context", "Contexto"), t("Receiver", "Receptor"), t("Risk", "Riesgo"), t("Expected format", "Formato esperado"), t("Next action", "Siguiente acción")].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-readiness">
            <div className="core-stage-heading"><Radar aria-hidden="true" size={16} /><h3>Readiness Gate</h3></div>
            <p className="core-readiness-score">64<small>/100</small></p>
            <div className="core-readiness-meter" aria-label="Readiness 64/100"><i><b /></i></div>
            <p className="core-stage-risk"><span>{t("Main risk", "Riesgo principal")}</span>{t("Missing context to execute without rework.", "Falta contexto para ejecutar sin retrabajo.")}</p>
            <strong className="core-readiness-badge">Handoff Readiness · {t("Medium", "Medio")}</strong>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-pack">
            <div className="core-stage-heading"><Sparkles aria-hidden="true" size={16} /><h3>{t("Recommended pack", "Pack recomendado")}</h3></div>
            <p className="core-pack-name">Handoff Intelligence</p>
            <p className="core-stage-copy">{t("This flow requires validating whether information is ready for the next team.", "El flujo requiere validar si la información está lista para el siguiente equipo.")}</p>
            <ul className="core-analysis-list core-pack-list">
              {[t("Owner", "Responsable"), t("Scope", "Alcance"), t("Success criteria", "Criterio de éxito"), t("Receiver team", "Equipo receptor")].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <i className="core-connector-pulse" aria-hidden="true" />
          </li>

          <li className="virro-core-stage core-stage-action">
            <div className="core-stage-heading"><Workflow aria-hidden="true" size={16} /><h3>{t("Next action", "Siguiente acción")}</h3></div>
            <p className="core-decision">{t("Do not proceed yet.", "No avanzar todavía.")}</p>
            <p className="core-stage-copy">{t("Validate owner, expected format and success criteria before turning this request into work.", "Validar responsable, formato esperado y criterio de éxito antes de convertir esta solicitud en trabajo.")}</p>
            <a href="#auditoria">{t("View executive signal", "Ver señal ejecutiva")} <ArrowRight aria-hidden="true" size={13} /></a>
          </li>
        </ol>

        <footer className="virro-core-foot"><CheckCircle2 aria-hidden="true" size={14} /><span>{t("Signals stored: readiness, risks, patterns and aggregated reports.", "Señales guardadas: readiness, riesgos, patrones y reportes agregados.")}</span><span>{t("No private conversations by default.", "No conversaciones privadas por defecto.")}</span></footer>
      </RevealOnScroll>
    </div>
  </section>;
}
