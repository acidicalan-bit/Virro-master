"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealOnScroll } from "@/components/landing/motion/motion-primitives";

const heroVideos = [
  { webm: "/hero/virro-hero.webm", mp4: "/hero/virro-hero.mp4" },
  { webm: "/hero/virro-hero1.webm", mp4: "/hero/virro-hero1.mp4" },
];

export function HeroUnderstandingFilter() {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const activeVideo = heroVideos[activeVideoIndex];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const startPlayback = () => { void video.play().catch(() => undefined); };
    startPlayback();
    video.addEventListener("canplay", startPlayback, { once: true });
    return () => video.removeEventListener("canplay", startPlayback);
  }, [activeVideoIndex]);

  return <section id="plataforma" className="landing-hero has-video-hero relative min-h-[820px] scroll-mt-24 overflow-hidden px-5 pb-24 pt-36 md:px-8 md:pt-44">
    <div className="hero-video-poster" aria-hidden="true" />
    <video key={activeVideoIndex} ref={videoRef} className="hero-video-media" autoPlay muted playsInline preload="metadata" poster="/hero/virro-hero-poster.webp" aria-hidden="true" tabIndex={-1} onEnded={() => setActiveVideoIndex((index) => (index + 1) % heroVideos.length)}>
      <source src={activeVideo.webm} type="video/webm" />
      <source src={activeVideo.mp4} type="video/mp4" />
    </video>
    <div className="hero-video-scrim" aria-hidden="true" />
    <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" /><div className="hero-grid-fade" />
    <div className="relative mx-auto grid max-w-[1380px] gap-14 xl:grid-cols-[.88fr_1.12fr] xl:items-center">
      <div className="hero-copy-scene relative z-10">
        <div className="hero-scene-item inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.17em] text-[var(--brand-blue)]"><Layers3 size={12} /> {t("Enterprise digital operational understanding infrastructure", "Infraestructura empresarial de entendimiento operativo digital")}</div>
        <h1 className="hero-scene-item hero-headline mt-7 max-w-4xl text-[2.8rem] font-semibold leading-[.97] tracking-[-.065em] sm:text-6xl lg:text-[4.6rem]">{t("Reduce the cost of working with misunderstood information.", "Reduce el costo de trabajar con información mal entendida.")}</h1>
        <p className="hero-scene-item hero-primary-copy mt-7 max-w-2xl text-base font-medium leading-7 md:text-lg">{t("Virro reviews whether information moving across teams, processes, tools and AI has enough context, criteria and clarity to move forward with lower risk.", "Virro revisa si la información que se mueve entre áreas, procesos, herramientas e IA tiene suficiente contexto, criterio y claridad para avanzar con menor riesgo.")}</p>
        <p className="hero-scene-item hero-support-copy mt-4 max-w-2xl text-xs leading-6 md:text-sm">{t("It makes missing context, receiver expectations and the next recommended action visible before information becomes work or a decision.", "Hace visible el contexto faltante, lo que necesita el receptor y la siguiente acción recomendada antes de que la información se convierta en trabajo o decisión.")}</p>
        <div className="hero-scene-item mt-9 flex flex-col gap-3 sm:flex-row"><a href="#solicitar-diagnostico" className="brand-primary-button text-sm shadow-[0_20px_60px_rgba(9,105,255,.22)]">{t("Request an audit", "Solicitar auditoría")} <ArrowRight size={15} /></a><Link href="/app" className="brand-secondary-button text-sm">{t("View enterprise demo", "Ver demo enterprise")}</Link></div>
        <div className="hero-scene-item mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[9px] text-[var(--subtle)]"><span className="flex items-center gap-2"><ShieldCheck size={12} className="text-[var(--brand-blue)]" />{t("Data minimization from the audit", "Minimización de datos desde la auditoría")}</span><span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[var(--brand-blue)]" />{t("Probabilistic estimates · human validation", "Estimaciones probabilísticas · validación humana")}</span></div>
      </div>
      <RevealOnScroll className="hero-visual-reveal">
          <aside className="hero-flow-messages" aria-label={t("Analyze-Safe operational signal", "Señal operativa Analyze-Safe")}>
            <div className="hero-flow-caption"><span><LockKeyhole size={13} />Analyze-Safe</span><b>{t("Operational flow signals", "Señales de flujo operativo")}</b></div>
            <article className="hero-flow-message is-primary"><span>01</span><div><p>{t("Meeting → Delivery", "Junta → Delivery")}</p><strong>{t("Owner and criteria need validation", "Responsable y criterio por validar")}</strong></div><em>Handoff Intelligence</em></article>
            <article className="hero-flow-message"><span>02</span><div><p>{t("Data request → BI", "Solicitud de datos → BI")}</p><strong>{t("Decision and period are missing", "Faltan decisión y periodo")}</strong></div><em>Data Request Readiness</em></article>
            <article className="hero-flow-message"><span>03</span><div><p>{t("AI instruction → Context Pack", "Instrucción IA → Context Pack")}</p><strong>{t("Constraints need validation", "Restricciones por validar")}</strong></div><em>AI Understanding</em></article>
            <div className="hero-flow-next"><span>{t("Next action", "SIGUIENTE ACCIÓN")}</span><strong>{t("Validate context before advancing", "Validar contexto antes de avanzar")}</strong></div>
          </aside>
      </RevealOnScroll>
    </div>
  </section>;
}
