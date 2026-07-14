"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function HeroVirroCorePanel() {
  const { t } = useLanguage();

  return (
    <aside className="hero-virro-core-panel hero-product-scene" aria-label={t("Virro Core operational analysis", "Análisis operativo de Virro Core")}>
      <header className="hero-core-panel-header">
        <div>
          <span>VIRRO CORE</span>
          <strong>Understanding Check</strong>
        </div>
        <b>{t("Analyze-Safe", "Analyze-Safe")}</b>
      </header>

      <div className="hero-core-panel-analysis">
        <span>{t("Information analyzed", "Información analizada")}</span>
        <strong>{t("Request for the operations team", "Solicitud para equipo de operaciones")}</strong>
      </div>

      <div className="hero-core-panel-readiness">
        <div>
          <span>Readiness</span>
          <strong>64<small>/100</small></strong>
        </div>
        <i><b /></i>
      </div>

      <div className="hero-core-panel-mobile-readiness">Readiness · 64/100</div>

      <div className="hero-core-panel-signals">
        <section>
          <span>{t("Risk detected", "Riesgo detectado")}</span>
          <strong>{t("Missing context to execute without rework", "Falta contexto para ejecutar sin retrabajo")}</strong>
        </section>
        <section>
          <span>{t("Next action", "Siguiente acción")}</span>
          <strong className="hero-core-panel-action-desktop">{t("Define owner, expected format and success criteria.", "Definir responsable, formato esperado y criterio de éxito.")}</strong>
          <strong className="hero-core-panel-action-mobile">{t("Define owner, format and criteria.", "Definir responsable, formato y criterio.")}</strong>
        </section>
      </div>

      <footer className="hero-core-panel-footer">
        <span>{t("Does not store private conversations by default.", "No guarda conversaciones privadas por defecto.")}</span>
        <span>{t("Stores signals: readiness, risks and patterns.", "Guarda señales: readiness, riesgos y patrones.")}</span>
      </footer>
    </aside>
  );
}
