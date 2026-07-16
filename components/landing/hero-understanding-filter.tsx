"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers3, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { HeroVirroCorePanel } from "@/components/landing/hero-virro-core-panel";

const heroVideos = [
  { src: "/hero/virro-flow-01.mp4" },
  { src: "/hero/virro-flow-02.mp4" },
  { src: "/hero/virro-flow-03.mp4" },
  { src: "/hero/virro-flow-04.mp4" },
];

const CROSSFADE_MS = 1000;
const CROSSFADE_LEAD_SECONDS = 1.15;

export function HeroUnderstandingFilter() {
  const { t } = useLanguage();
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const currentVideoIndex = useRef(0);
  const isTransitioning = useRef(false);
  const transitionTimer = useRef<number | undefined>(undefined);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

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

  return <section id="plataforma" className="landing-hero has-video-hero relative min-h-[820px] scroll-mt-24 overflow-hidden px-5 pb-24 pt-36 md:px-8 md:pt-44">
    <div className="hero-video-poster" aria-hidden="true" />
    {heroVideos.map((video, index) => <video key={video.src} ref={(element) => { videoRefs.current[index] = element; }} className={`hero-video-media${activeVideoIndex === index ? " is-active" : ""}`} autoPlay={index === 0} muted loop playsInline preload="metadata" poster="/hero/virro-flow-poster.webp" aria-hidden="true" tabIndex={-1} src={video.src} />)}
    <div className="hero-video-scrim" aria-hidden="true" />
    <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" /><div className="hero-grid-fade" />
    <div className="relative mx-auto grid max-w-[1380px] gap-14 xl:grid-cols-[.88fr_1.12fr] xl:items-center">
      <div className="hero-copy-scene relative z-10">
        <div className="hero-scene-item inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.17em] text-[var(--brand-blue)]"><Layers3 size={12} /> {t("Operational understanding infrastructure", "Infraestructura de entendimiento operativo")}</div>
        <h1 className="hero-scene-item hero-headline mt-7 max-w-4xl text-[2.8rem] font-semibold leading-[.97] tracking-[-.065em] sm:text-6xl lg:text-[4.6rem]">{t("Keep your company’s operational understanding clear.", "Mantén claro el entendimiento operativo de tu empresa.")}</h1>
        <p className="hero-scene-item hero-primary-copy mt-7 max-w-2xl text-base font-medium leading-7 md:text-lg">{t("Virro detects where a change, handoff or instruction loses context before it becomes rework, wrong decisions or AI operating with outdated information.", "Virro detecta dónde un cambio, handoff o instrucción pierde contexto antes de convertirse en retrabajo, decisiones equivocadas o IA operando con información desactualizada.")}</p>
        <div className="hero-scene-item hero-cta-group mt-9 flex flex-col gap-3 sm:flex-row"><a href="#solicitar-auditoria" data-analytics-event="hero_audit_click" className="brand-primary-button text-sm shadow-[0_20px_60px_rgba(9,105,255,.22)]">{t("Request an audit", "Solicitar auditoría")} <ArrowRight size={15} /></a><Link href="/app" data-analytics-event="hero_demo_click" className="brand-secondary-button text-sm">{t("View Enterprise demo", "Ver demo Enterprise")}</Link></div>
        <p className="hero-scene-item hero-trust-signals mt-6 flex items-center gap-2 text-[9px] text-[var(--subtle)]"><ShieldCheck aria-hidden="true" size={12} className="shrink-0 text-[var(--brand-blue)]" />{t("Default masking · Safe signals · Human review · No employee surveillance", "Enmascaramiento por defecto · Señales seguras · Revisión humana · Sin vigilancia de empleados")}</p>
      </div>
      <HeroVirroCorePanel />
    </div>
  </section>;
}
