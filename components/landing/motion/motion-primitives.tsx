"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

type MotionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function RevealOnScroll({ children, className = "", delay = 0 }: MotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const Observer = window.IntersectionObserver as typeof IntersectionObserver | undefined;
    if (!Observer) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new Observer(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -8%", threshold: 0.12 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const style = { "--motion-delay": `${delay}ms` } as CSSProperties;
  return <div ref={ref} style={style} className={`motion-reveal ${visible ? "is-visible" : ""} ${className}`}>{children}</div>;
}

export function FadeIn(props: MotionProps) {
  return <RevealOnScroll {...props} className={`motion-fade ${props.className ?? ""}`} />;
}

export function SlideUp(props: MotionProps) {
  return <RevealOnScroll {...props} className={`motion-slide-up ${props.className ?? ""}`} />;
}

export function StaggerGroup(props: MotionProps) {
  return <RevealOnScroll {...props} className={`motion-stagger ${props.className ?? ""}`} />;
}

export function FloatingLayer({ children, className = "" }: Omit<MotionProps, "delay">) {
  return <div className={`motion-floating ${className}`}>{children}</div>;
}

export function MotionCard({ children, className = "" }: Omit<MotionProps, "delay">) {
  return <div className={`motion-card ${className}`}>{children}</div>;
}

export function AnimatedConnectorLine({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`motion-connector ${className}`} />;
}

export function CountUpMetric({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const Observer = window.IntersectionObserver as typeof IntersectionObserver | undefined;
    if (!Observer) {
      const frame = window.requestAnimationFrame(() => setStarted(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new Observer(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : 900;
    const startedAt = window.performance.now();
    let frame = 0;

    const update = (time: number) => {
      const progress = duration === 0 ? 1 : Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [started, value]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
}
