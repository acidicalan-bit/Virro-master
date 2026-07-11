"use client";

import { type FormEvent, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { buildDiagnosisMailto } from "@/lib/conversion/diagnosis-mailto";

const flowOptions = [
  "Product Delivery",
  "AI Understanding",
  "Handoff Intelligence",
  "Technical Documentation",
  "Talent & Staffing",
  "Consulting Delivery",
  "Process Understanding",
  "Onboarding",
  "No estoy seguro",
];

export function DiagnosisRequestForm() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const mailto = buildDiagnosisMailto({
      name: String(data.get("name") ?? ""),
      company: String(data.get("company") ?? ""),
      role: String(data.get("role") ?? ""),
      email: String(data.get("email") ?? ""),
      flow: String(data.get("flow") ?? ""),
      context: String(data.get("context") ?? ""),
    });
    setSubmitted(true);
    window.location.assign(mailto);
  }

  return <section id="solicitar-diagnostico" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--brand-blue)]">Meaning Loss Audit</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-5xl">{t("Request a diagnosis", "Solicitar diagnóstico")}</h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)]">{t("Describe the flow that is losing clarity, context or execution capacity. We will prepare an email to", "Comparte el flujo que hoy pierde claridad, contexto o capacidad de ejecución. Prepararemos un correo dirigido a")} <span className="font-medium text-[var(--text)]">contacto@virro.app</span> {t("for you to review and send from your email client.", "para que puedas revisarlo y enviarlo desde tu cliente de correo.")}</p>
        <div className="mt-7 space-y-3 text-[11px] leading-5 text-[var(--muted)]">
          <p className="flex gap-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Virro does not evaluate people. It estimates interpretation risk in operational information.", "Virro no evalúa personas. Estima riesgos de interpretación en información operativa.")}</p>
          <p className="flex gap-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Scores are probabilistic estimates, not guarantees.", "Los scores son estimaciones probabilísticas, no garantías.")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-white/[.08] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] md:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("Name", "Nombre")}><input name="name" required maxLength={80} autoComplete="name" className="field-control" /></FormField>
          <FormField label={t("Company", "Empresa")}><input name="company" required maxLength={120} autoComplete="organization" className="field-control" /></FormField>
          <FormField label={t("Role", "Rol")}><input name="role" required maxLength={120} autoComplete="organization-title" className="field-control" /></FormField>
          <FormField label="Email"><input name="email" type="email" required maxLength={254} autoComplete="email" className="field-control" /></FormField>
          <FormField label={t("Flow to diagnose", "Flujo a diagnosticar")} className="sm:col-span-2"><select name="flow" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a flow", "Selecciona un flujo")}</option>{flowOptions.map((option) => <option key={option} value={option}>{option === "No estoy seguro" ? t("I am not sure", option) : option}</option>)}</select></FormField>
          <FormField label={t("Brief description", "Descripción breve")} className="sm:col-span-2"><textarea name="context" required minLength={12} maxLength={1200} placeholder={t("Describe where clarity, context or execution capacity is being lost.", "Describe dónde se está perdiendo claridad, contexto o capacidad de ejecución.")} className="field-control min-h-32 resize-y py-3 leading-6" /></FormField>
        </div>
        <button type="submit" className="brand-primary-button mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold"><Mail size={14} />{t("Request diagnosis by email", "Solicitar diagnóstico por correo")}</button>
        <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Do not share sensitive information. Privacy, scope and confidentiality rules are defined before reviewing real events.", "No compartas información sensible. Antes de analizar eventos reales se definen reglas de privacidad, alcance y confidencialidad.")}</p>
        {submitted && <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[.07] p-4 text-[11px] leading-5 text-sky-200"><Mail size={16} className="mt-0.5 shrink-0" /><span>{t("We will open your email client with the diagnosis request prepared. It is sent only after you confirm it.", "Abriremos tu cliente de correo con la información preparada para solicitar el diagnóstico. El envío solo ocurre cuando tú lo confirmas.")}</span></div>}
      </form>
    </div>
  </section>;
}

function FormField({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-2 block text-[11px] font-medium text-[var(--muted)]">{label}</span>{children}</label>;
}
