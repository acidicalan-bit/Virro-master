"use client";

import Link from "next/link";
import { ArrowUpRight, GraduationCap, Palette, Workflow } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { capabilities } from "@/content/site";

type Ring = keyof typeof capabilities;
const ringMeta = {
  studio: { icon: Palette, number: "01", position: "ring-studio" },
  systems: { icon: Workflow, number: "02", position: "ring-systems" },
  academy: { icon: GraduationCap, number: "03", position: "ring-academy" },
} as const;

export function MotorVirro() {
  const [active, setActive] = useState<Ring[]>(["studio", "systems", "academy"]);
  const current = active.length === 1 ? capabilities[active[0]] : null;
  const message = (() => {
    if (active.length === 3) return "La transformación se ve, funciona y permanece.";
    if (active.length === 2) return "Dos capacidades coordinadas eliminan el espacio entre la idea y la operación.";
    if (current) return current.copy;
    return "Activa una capacidad para construir tu ruta.";
  })();

  function toggle(ring: Ring) {
    setActive((selected) => selected.includes(ring) ? selected.filter((item) => item !== ring) : [...selected, ring]);
  }

  return (
    <div className="motor-grid">
      <div className="motor-stage" aria-label="Motor Virro: selecciona Studio, Systems y Academy">
        <div className="motor-core"><span>VIRRO</span><strong>{active.length || "—"}/3</strong><small>capacidades activas</small></div>
        {(Object.keys(capabilities) as Ring[]).map((ring) => {
          const data = capabilities[ring];
          const Icon = ringMeta[ring].icon;
          const selected = active.includes(ring);
          return (
            <button
              key={ring}
              type="button"
              aria-pressed={selected}
              className={`motor-ring ${ringMeta[ring].position} ${selected ? "is-active" : ""}`}
              style={{ "--ring-color": data.accent } as React.CSSProperties}
              onClick={() => toggle(ring)}
            >
              <span className="ring-number">{ringMeta[ring].number}</span><Icon aria-hidden="true" /><strong>{ring}</strong>
            </button>
          );
        })}
      </div>
      <div className="motor-panel" aria-live="polite">
        <span className="eyebrow">Combinación activa</span>
        <h3>{message}</h3>
        <p>{active.length === 3 ? "Studio crea confianza. Systems conecta los pasos. Academy convierte la herramienta en una capacidad del equipo." : "Selecciona otro anillo para ver cómo cambia el resultado cuando las capacidades trabajan juntas."}</p>
        <div className="motor-pills">{active.map((ring) => <span key={ring} style={{ "--pill": capabilities[ring].accent } as React.CSSProperties}>{capabilities[ring].eyebrow}</span>)}</div>
        <Button asChild variant="outline"><Link href="/motor-virro">Construir mi ruta <ArrowUpRight /></Link></Button>
      </div>
    </div>
  );
}
