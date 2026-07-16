"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { trackPublicEvent } from "@/lib/analytics/public-events";

const flowOptions = ["Product Delivery", "Cambios críticos", "Handoffs", "IA empresarial", "Onboarding", "Documentación", "Procesos", "Otro"];

export function DiagnosisRequestForm() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  function markStarted() { if (!started) { setStarted(true); trackPublicEvent("audit_form_started"); } }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending"); setError("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/audit-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || t("The request could not be sent.", "No se pudo enviar la solicitud."));
      setStatus("success"); form.reset(); trackPublicEvent("audit_form_submitted");
    } catch (reason) {
      setStatus("error"); setError(reason instanceof Error ? reason.message : t("The request could not be sent.", "No se pudo enviar la solicitud."));
    }
  }

  if (status === "success") return <div id="solicitar-auditoria" className="scroll-mt-24 rounded-2xl border border-teal-400/20 bg-teal-400/[.06] p-7" role="status"><CheckCircle /><h3 className="mt-4 text-2xl font-semibold">{t("Request received.", "Solicitud recibida.")}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t("We will review the described flow and respond within two business days.", "Revisaremos el flujo descrito y responderemos en un máximo de dos días hábiles.")}</p><a href="mailto:contacto@virro.app?subject=Agendar%20conversaci%C3%B3n%20sobre%20auditor%C3%ADa%20Virro" className="brand-secondary-button mt-6">{t("Schedule a conversation", "Agendar conversación")} <ArrowRight aria-hidden="true" size={14} /></a></div>;

  return <form id="solicitar-auditoria" onSubmit={submit} onFocusCapture={markStarted} aria-describedby="audit-sensitive-note" className="diagnosis-request-form scroll-mt-24 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] md:p-7">
    <div className="mb-7"><p className="section-kicker">{t("Enterprise audit", "Auditoría Enterprise")}</p><h3 className="mt-3 text-2xl font-semibold tracking-[-.04em]">{t("Request an operational understanding audit.", "Solicita una auditoría de entendimiento operativo.")}</h3><p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">{t("Describe only the workflow and business impact. Do not paste operational content.", "Describe únicamente el flujo y el impacto de negocio. No pegues contenido operativo.")}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="audit-name" label={t("First name", "Nombre")}><input id="audit-name" name="name" required maxLength={80} autoComplete="given-name" className="field-control" /></FormField>
      <FormField id="audit-last-name" label={t("Last name (optional)", "Apellido (opcional)")}><input id="audit-last-name" name="lastName" maxLength={80} autoComplete="family-name" className="field-control" /></FormField>
      <FormField id="audit-email" label={t("Business email", "Correo empresarial")} help={t("Enter a valid business email address.", "Ingresa una dirección de correo empresarial válida.")}><input id="audit-email" name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" spellCheck={false} aria-describedby="audit-email-help audit-sensitive-note" className="field-control" /></FormField>
      <FormField id="audit-company" label={t("Company", "Empresa")}><input id="audit-company" name="company" required maxLength={120} autoComplete="organization" className="field-control" /></FormField>
      <FormField id="audit-role" label={t("Role", "Cargo")}><input id="audit-role" name="role" required maxLength={120} autoComplete="organization-title" className="field-control" /></FormField>
      <FormField id="audit-size" label={t("Approximate number of employees", "Número aproximado de empleados")}><select id="audit-size" name="companySize" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a range", "Selecciona un rango")}</option>{["1–20", "21–50", "51–200", "201–500", "501–1,000", "1,001+"].map((value) => <option key={value}>{value}</option>)}</select></FormField>
      <FormField id="audit-flow" label={t("Workflow to evaluate", "Flujo que desea evaluar")} className="sm:col-span-2"><select id="audit-flow" name="flow" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a workflow", "Selecciona un flujo")}</option>{flowOptions.map((option) => <option key={option}>{option}</option>)}</select></FormField>
      <FormField id="audit-tools" label={t("Tools used", "Herramientas utilizadas")}><input id="audit-tools" name="tools" required maxLength={240} placeholder="Jira, Slack, Teams, Confluence…" className="field-control" /></FormField>
      <FormField id="audit-problem" label={t("Brief problem description", "Descripción breve del problema")} className="sm:col-span-2"><textarea id="audit-problem" name="problem" required minLength={20} maxLength={800} aria-describedby="audit-sensitive-note" className="field-control min-h-32 resize-y py-3 leading-6" /></FormField>
    </div>
    <div className="honeypot-field" aria-hidden="true"><label htmlFor="audit-website">Website</label><input id="audit-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    <label className="mt-5 flex items-start gap-3 text-[10px] leading-5 text-[var(--muted)]"><input name="privacyConsent" value="accepted" type="checkbox" required className="mt-1 size-4 shrink-0 accent-[var(--brand-blue)]" /><span>{t("I have read the privacy notice and consent to Virro using this information to respond to my request.", "He leído el aviso de privacidad y autorizo a Virro a usar esta información para responder mi solicitud.")} <Link href="/legal/privacy" className="font-semibold text-[var(--brand-blue)]">{t("Privacy notice", "Aviso de privacidad")}</Link>.</span></label>
    <p id="audit-sensitive-note" className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]"><ShieldCheck aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Do not include personal data, credentials, private conversations or confidential documentation in this form.", "No incluyas datos personales, credenciales, conversaciones privadas ni documentación confidencial en este formulario.")}</p>
    <button type="submit" disabled={status === "sending"} className="brand-primary-button mt-5 w-full text-xs disabled:opacity-60"><Mail aria-hidden="true" size={14} />{status === "sending" ? t("Sending…", "Enviando…") : t("Request an audit", "Solicitar auditoría")}</button>
    {status === "error" && <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-4 text-[11px] leading-5 text-rose-200">{error}</div>}
  </form>;
}

function FormField({ id, label, help, className = "", children }: { id: string; label: string; help?: string; className?: string; children: React.ReactNode }) { return <div className={className}><label htmlFor={id} className="mb-2 block text-[11px] font-medium text-[var(--muted)]">{label}</label>{children}{help && <span id={`${id}-help`} className="mt-1.5 block text-[9px] leading-4 text-[var(--subtle)]">{help}</span>}</div>; }
function CheckCircle() { return <span className="grid size-10 place-items-center rounded-full bg-teal-400/10 text-teal-300"><ShieldCheck aria-hidden="true" size={19} /></span>; }
