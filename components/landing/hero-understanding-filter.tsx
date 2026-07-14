"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

const heroVideos = [
  { src: "/hero/virro-flow-01.mp4" },
  { src: "/hero/virro-flow-02.mp4" },
  { src: "/hero/virro-flow-03.mp4" },
];

const signals = [
  { index: "01", flow: ["Meeting → Delivery", "Junta → Delivery"], message: ["Validate owner and success criteria", "Validar responsable y criterio de éxito"], pack: "Handoff Intelligence" },
  { index: "02", flow: ["Data request → BI", "Solicitud de datos → BI"], message: ["Decision and period need validation", "Decisión y periodo por validar"], pack: "Data Request Readiness" },
  { index: "03", flow: ["AI instruction → Context Pack", "Instrucción IA → Context Pack"], message: ["Operational constraints need validation", "Restricciones operativas por validar"], pack: "AI Understanding" },
];

const CROSSFADE_MS = 1000;
const CROSSFADE_LEAD_SECONDS = 1.15;
const SIGNAL_DURATION_MS = 6800;

export function HeroUnderstandingFilter() {
  const { t } = useLanguage();
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const currentVideoIndex = useRef(0);
  const isTransitioning = useRef(false);
  const transitionTimer = useRef<number | undefined>(undefined);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);
  const activeSignal = signals[activeSignalIndex];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const videos = videoRefs.current;
    const play = (video: HTMLVideoElement) => { void video.play().catch(() => undefined); };

    const transitionToNext = () => {
      if (isTransitioning.current) return;

      const outgoingIndex = currentVideoIndex.current;
      const incomingIndex = (outgoingIndex + 1) % heroVideos.length;
      const outgoing = videos[outgoingIndex];
      const incoming = videos[incomingIndex];
      if (!outgoing || !incoming) return;

      isTransitioning.current = true;
      incoming.currentTime = 0;

      const beginCrossfade = () => {
        play(incoming);
        currentVideoIndex.current = incomingIndex;
        setActiveVideoIndex(incomingIndex);
        transitionTimer.current = window.setTimeout(() => {
          outgoing.pause();
          outgoing.currentTime = 0;
          isTransitioning.current = false;
        }, CROSSFADE_MS);
      };

      if (incoming.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) beginCrossfade();
      else incoming.addEventListener("canplay", beginCrossfade, { once: true });
    };

    const handleTimeUpdate = (index: number) => () => {
      const video = videos[index];
      if (!video || index !== currentVideoIndex.current || !Number.isFinite(video.duration)) return;
      if (video.duration - video.currentTime <= CROSSFADE_LEAD_SECONDS) transitionToNext();
    };

    const handleEnded = (index: number) => () => {
      if (index === currentVideoIndex.current) transitionToNext();
    };

    const listeners = videos.map((video, index) => {
      if (!video) return undefined;
      const timeUpdate = handleTimeUpdate(index);
      const ended = handleEnded(index);
      video.addEventListener("timeupdate", timeUpdate);
      video.addEventListener("ended", ended);
      return { ended, timeUpdate };
    });

    const initialVideo = videos[0];
    if (initialVideo) {
      initialVideo.currentTime = 0;
      play(initialVideo);
    }

    return () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
      videos.forEach((video, index) => {
        const listener = listeners[index];
        if (!video || !listener) return;
        video.removeEventListener("timeupdate", listener.timeUpdate);
        video.removeEventListener("ended", listener.ended);
      });
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveSignalIndex((index) => (index + 1) % signals.length), SIGNAL_DURATION_MS);
    return () => window.clearInterval(timer);
  }, []);

  return <section id="plataforma" className="landing-hero has-video-hero relative min-h-[820px] scroll-mt-24 overflow-hidden px-5 pb-24 pt-36 md:px-8 md:pt-44">
    <div className="hero-video-poster" aria-hidden="true" />
    {heroVideos.map((video, index) => <video key={video.src} ref={(element) => { videoRefs.current[index] = element; }} className={`hero-video-media${activeVideoIndex === index ? " is-active" : ""}`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} src={video.src} />)}
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
      <aside className="hero-flow-messages" aria-label={t("Analyze-Safe operational signal", "Señal operativa Analyze-Safe")}>
        <div className="hero-flow-caption"><span><LockKeyhole size={13} />Analyze-Safe</span><b>{t("Operational flow signal", "Señal de flujo operativo")}</b></div>
        <article key={activeSignal.index} className="hero-flow-bubble">
          <span className="hero-flow-number">{activeSignal.index}</span>
          <div>
            <p>{t(activeSignal.flow[0], activeSignal.flow[1])}</p>
            <strong>{t(activeSignal.message[0], activeSignal.message[1])}</strong>
          </div>
          <em>{activeSignal.pack}</em>
          <span className="hero-flow-action">{t("Next action", "Siguiente acción")}: {t("validate before advancing", "validar antes de avanzar")}</span>
        </article>
      </aside>
    </div>
  </section>;
}
