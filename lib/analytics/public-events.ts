export type PublicAnalyticsEvent = "hero_audit_click" | "hero_demo_click" | "core_section_view" | "demo_scenario_started" | "audit_form_started" | "audit_form_submitted" | "pilot_cta_click" | "privacy_section_view";

export function trackPublicEvent(name: PublicAnalyticsEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("virro:analytics", { detail: { name } }));
  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, string>> }).dataLayer;
  dataLayer?.push({ event: name });
}
