"use client";

import { useState } from "react";
import { Clock3, MessageCircleMore } from "lucide-react";

export function OpportunityCalculator() {
  const [consultas, setConsultas] = useState(80);
  const [respuesta, setRespuesta] = useState(65);
  const [minutes, setMinutes] = useState(12);
  const result = { unattended: Math.round(consultas * (1 - respuesta / 100)), hours: Math.round((consultas * minutes) / 60) };
  return (
    <div className="calculator">
      <div className="calculator-controls">
        <label>Consultas al mes <strong>{consultas}</strong><input type="range" min="10" max="400" value={consultas} onChange={(event) => setConsultas(Number(event.target.value))} /></label>
        <label>Porcentaje que recibe respuesta <strong>{respuesta}%</strong><input type="range" min="10" max="100" value={respuesta} onChange={(event) => setRespuesta(Number(event.target.value))} /></label>
        <label>Minutos por respuesta repetitiva <strong>{minutes} min</strong><input type="range" min="2" max="45" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
      </div>
      <div className="calculator-result" aria-live="polite">
        <span className="tag"><span className="dot" /> Escenario editable</span>
        <div className="result-stat"><MessageCircleMore /><div><strong>{result.unattended}</strong><span>consultas podrían quedar sin respuesta</span></div></div>
        <div className="result-stat"><Clock3 /><div><strong>{result.hours} h</strong><span>de atención repetitiva visibles al mes</span></div></div>
        <p>Estos escenarios no garantizan ventas ni ahorro. Sirven para visualizar oportunidades con los datos disponibles.</p>
      </div>
    </div>
  );
}
