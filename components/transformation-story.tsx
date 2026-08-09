"use client";

import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useRef, useState } from "react";

import { Progress } from "@/components/ui/progress";

const stages = [
  { title: "Negocio actual", copy: "Una estética con servicio valioso, pero una experiencia que todavía no se reconoce.", image: "/portfolio/bella-luna-before.webp", alt: "Objetos de cuidado personal como referencia de una estética conceptual" },
  { title: "Identidad visible", copy: "Una voz, una paleta y una marca que hacen que cada punto de contacto pertenezca al mismo negocio.", image: "/home/hero-salon.webp", alt: "Cabello largo en una imagen editorial de belleza" },
  { title: "Espacio que confirma", copy: "El establecimiento respalda la promesa con detalles, señalización y una experiencia que se siente cuidada.", image: "/portfolio/bella-luna-after.webp", alt: "Interior de una estética como concepto demostrativo" },
  { title: "Atención que continúa", copy: "La consulta, el recordatorio y el seguimiento ya no se pierden entre mensajes aislados.", image: "/portfolio/bella-luna-after.webp", alt: "Interior de una estética como concepto demostrativo" },
] as const;

export function TransformationStory() {
  const target = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reducedMotion) return;
    setActive(Math.min(stages.length - 1, Math.floor(value * stages.length)));
  });
  const stage = stages[active];

  return (
    <section ref={target} className="transformation section" id="transformacion">
      <div className="shell transformation-intro"><p className="eyebrow">Transformación en vivo</p><h2 className="section-title">Mira cómo un negocio se vuelve imposible de confundir.</h2><p className="lead">Una sola historia: de lo que existe hoy a una experiencia que se ve, atiende y continúa.</p></div>
      <div className="transformation-track">
        <div className="shell transformation-grid">
          <div className="transformation-steps" aria-label="Etapas de la transformación">
            {stages.map((item, index) => <button type="button" key={item.title} className={index === active ? "is-active" : ""} onClick={() => setActive(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.copy}</p></button>)}
          </div>
          <motion.figure className="transformation-visual" initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .55 }}>
            <Image key={stage.image + active} src={stage.image} alt={stage.alt} fill sizes="(max-width: 900px) 100vw, 54vw" priority={active === 0} />
            <figcaption><span>Concepto demostrativo</span><b>{stage.title}</b><p>Studio + Systems + Academy</p></figcaption>
            <div className="transformation-caption" aria-hidden="true"><span>{String(active + 1).padStart(2, "0")}</span><strong>{stage.title}</strong></div>
          </motion.figure>
        </div>
      </div>
      <div className="shell transformation-progress"><Progress value={(active + 1) / stages.length * 100} /><span>{active + 1} de {stages.length}</span></div>
    </section>
  );
}
