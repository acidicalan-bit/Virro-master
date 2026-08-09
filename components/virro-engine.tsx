"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const modules = [
  { id: "studio", title: "Virro Studio", detail: "Identidad y presencia física", color: "#ff6f61" },
  { id: "systems", title: "Virro Systems", detail: "Atención, web y automatización", color: "#3c8dff" },
  { id: "academy", title: "Virro Academy", detail: "Adopción y capacitación", color: "#dfe8f7" },
] as const;

type ModuleId = typeof modules[number]["id"];

export function VirroEngine() {
  const [active, setActive] = useState<ModuleId[]>(["studio"]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();
  const complete = active.length === modules.length;

  function toggle(id: ModuleId) {
    setActive((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className={`engine ${complete ? "is-complete" : ""}`} aria-label="El Motor Virro interactivo">
      <div
        className="engine-object-wrap"
        onPointerMove={(event) => {
          if (reducedMotion) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setTilt({ x: ((event.clientY - rect.top) / rect.height - .5) * -12, y: ((event.clientX - rect.left) / rect.width - .5) * 16 });
        }}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <motion.div className="engine-object" animate={{ rotateX: reducedMotion ? 0 : tilt.x, rotateY: reducedMotion ? 0 : tilt.y, scale: complete ? 1.045 : 1 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
          <motion.div className="engine-halo" animate={reducedMotion ? {} : { rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }} />
          <div className="engine-core"><span>VIRRO</span><strong>{complete ? "3 / 3" : `${active.length} / 3`}</strong><small>{complete ? "sistema completo" : "módulos activos"}</small></div>
          {modules.map((module, index) => {
            const selected = active.includes(module.id);
            return <motion.div key={module.id} className={`engine-module engine-module-${index + 1} ${selected ? "is-active" : ""}`} style={{ "--module": module.color } as React.CSSProperties} animate={{ z: selected ? 38 : 0, opacity: selected ? 1 : .35 }} transition={{ duration: .42 }}><span>{String(index + 1).padStart(2, "0")}</span><b>{module.title.replace("Virro ", "")}</b></motion.div>;
          })}
        </motion.div>
        <p className="engine-gesture">Mueve el cursor o toca los módulos</p>
      </div>
      <div className="engine-copy">
        <p className="eyebrow">El Motor Virro</p>
        <h2>{complete ? "Tu negocio deja de avanzar por partes." : "Activa las piezas que cambian el negocio."}</h2>
        <p>{complete ? "La identidad atrae, el sistema continúa y el equipo adopta. Juntas, las tres capas hacen visible un cambio que se puede operar." : "Cada módulo modifica una capa de la transformación. Combínalos para ver el sistema completo."}</p>
        <div className="engine-controls" role="group" aria-label="Activar capacidades del Motor Virro">
          {modules.map((module) => {
            const selected = active.includes(module.id);
            return <Tooltip key={module.id}><TooltipTrigger asChild><button type="button" className={selected ? "is-active" : ""} aria-pressed={selected} onClick={() => toggle(module.id)}><i style={{ background: module.color }} /><span>{module.title}</span></button></TooltipTrigger><TooltipContent>{module.detail}</TooltipContent></Tooltip>;
          })}
        </div>
      </div>
    </section>
  );
}
