"use client";

import { useState } from "react";

export function BeforeAfter() {
  const [position, setPosition] = useState(52);
  return (
    <div className="before-after">
      <div className="ba-scene ba-after">
        <div className="ba-sign">JACARANDA <span>café de barrio</span></div>
        <div className="ba-menu"><strong>Menú claro.</strong><span>Pedido simple.</span><span>Una marca reconocible.</span></div>
        <div className="ba-window"><span>Descubrir</span><span>Elegir</span><span>Pedir</span><span>Volver</span></div>
      </div>
      <div className="ba-scene ba-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <div className="ba-sign">CAFÉ</div>
        <div className="ba-menu"><strong>MENÚ</strong><span>Café ........ $</span><span>Comida ...... $</span></div>
        <div className="ba-window"><span>Publicación aislada</span><span>Pedido por mensaje</span></div>
      </div>
      <div className="ba-divider" style={{ left: `${position}%` }}><span>↔</span></div>
      <label className="sr-only" htmlFor="before-after-range">Comparar antes y después</label>
      <input id="before-after-range" type="range" min="8" max="92" value={position} onChange={(event) => setPosition(Number(event.target.value))} />
      <span className="ba-label before">ANTES</span><span className="ba-label after">DESPUÉS · CONCEPTUAL</span>
    </div>
  );
}
