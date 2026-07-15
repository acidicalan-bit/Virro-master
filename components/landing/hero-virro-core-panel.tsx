"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function HeroVirroCorePanel() {
  const { t } = useLanguage();

  return (
    <aside className="hero-virro-core-panel hero-product-scene" aria-label={t("Virro Core operational analysis", "Análisis operativo de Virro Core")}>
      <header className="hero-core-panel-header">
        <div>
          <span>VIRRO CORE</span>
          <strong>Understanding Layer</strong>
        </div>
        <b>{t("Analyze-Safe", "Analyze-Safe")}</b>
      </header>

      <div className="hero-core-panel-analysis">
        <span>{t("Information analyzed", "Información analizada")}</span>
        <strong>{t("Priority change in a critical flow", "Cambio de prioridad en flujo crítico")}</strong>
      </div>

      <div className="hero-core-panel-readiness">
        <div>
          <span>Readiness</span>
          <strong>64<small>/100</small></strong>
        </div>
        <i><b /></i>
      </div>

      <div className="hero-core-panel-signals">
        <section>
          <span>{t("Risk detected", "Riesgo detectado")}</span>
          <strong>{t("Information may advance with incomplete context.", "La información puede avanzar con contexto incompleto.")}</strong>
        </section>
        <section>
          <span>{t("Next action", "Siguiente acción")}</span>
          <strong>{t("Update owners, criteria and artifacts before turning it into work.", "Actualizar responsables, criterios y artefactos antes de convertirlo en trabajo.")}</strong>
        </section>
      </div>

      <footer className="hero-core-panel-footer">
        <span>{t("Stores understanding signals, not private conversations.", "Guarda señales de entendimiento, no conversaciones privadas.")}</span>
      </footer>
    </aside>
  );
}
