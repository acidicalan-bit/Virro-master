"use client";

import { useEffect } from "react";
import { trackPublicEvent, type PublicAnalyticsEvent } from "@/lib/analytics/public-events";

export function PublicAnalyticsObserver() {
  useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || seen.has(entry.target.id)) continue;
        seen.add(entry.target.id);
        trackPublicEvent(entry.target.id === "virro-core" ? "core_section_view" : "privacy_section_view");
      }
    }, { threshold: 0.35 });
    ["virro-core", "privacidad"].forEach((id) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    const click = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-analytics-event]");
      const name = target?.dataset.analyticsEvent as PublicAnalyticsEvent | undefined;
      if (name) trackPublicEvent(name);
    };
    document.addEventListener("click", click);
    return () => { observer.disconnect(); document.removeEventListener("click", click); };
  }, []);
  return null;
}
