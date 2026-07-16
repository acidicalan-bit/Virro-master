"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { trackPublicEvent } from "@/lib/analytics/public-events";

const flowOptions = ["Design Delivery", "Product Delivery", "Operational Handoff", "Sales to Delivery", "Vendor Handoff", "Documentation and Knowledge", "AI Understanding", "Otro"];
const toolOptions = ["Jira", "Figma", "GitHub", "Slack/Teams", "Correo/documentos", "Sistema interno", "No existe una fuente clara", "Otro"];

export function DiagnosisRequestForm() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  function markStarted() { if (!started) { setStarted(true); trackPublicEvent("audit_form_started"); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("sending"); setError("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/audit-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || t("The request could not be sent.", "No se pudo enviar la solicitud."));
      setStatus("success"); form.reset(); trackPublicEvent("audit_form_submitted");
    } catch (reason) { setStatus("error"); setError(reason instanceof Error ? reason.message : t("The request could not be sent.", "No se pudo enviar la solicitud.")); }
  }

  if (status === "success") return <div id="solicitar-auditoria" className="scroll-mt-24 rounded-2xl border border-teal-400/20 bg-teal-400/[.06] p-7" role="status"><CheckCircle /><h3 className="mt-4 text-2xl font-semibold">{t("Request received.", "Solicitud recibida.")}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t("We will review the described flow and respond within two business days.", "Revisaremos el flujo descrito y responderemos en un máximo de dos días hábiles.")}</p><a href="mailto:contacto@virro.app?subject=Auditor%C3%ADa%20de%20flujo%20Virro" className="brand-secondary-button mt-6">{t("Schedule a conversation", "Agendar conversación")} <ArrowRight aria-hidden="true" size={14} /></a></div>;

  return <form id="solicitar-auditoria" onSubmit={submit} onFocusCapture={markStarted} aria-describedby="audit-sensitive-note" className="diagnosis-request-form scroll-mt-24 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] md:p-7">
    <div className="mb-7"><p className="section-kicker">Workflow Discovery Audit</p><h3 className="mt-3 text-2xl font-semibold tracking-[-.04em]">{t("Analyze where operational understanding is being lost.", "Analiza dónde se está perdiendo el entendimiento operativo.")}</h3><p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">{t("Describe one real transfer point. Virro will identify the receiver, expected action and evidence needed.", "Describe un punto de transferencia real. Virro identificará receptor, acción esperada y evidencia necesaria.")}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="audit-name" label={t("Name", "Nombre")}><input id="audit-name" name="name" required maxLength={80} autoComplete="name" className="field-control" /></FormField>
      <FormField id="audit-email" label={t("Business email", "Correo empresarial")} help={t("Enter a valid business email address.", "Ingresa una dirección de correo empresarial válida.")}><input id="audit-email" name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" spellCheck={false} aria-describedby="audit-email-help audit-sensitive-note" className="field-control" /></FormField>
      <FormField id="audit-company" label={t("Company", "Empresa")}><input id="audit-company" name="company" required maxLength={120} autoComplete="organization" className="field-control" /></FormField>
      <FormField id="audit-size" label={t("Company size", "Tamaño de empresa")}><select id="audit-size" name="companySize" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a range", "Selecciona un rango")}</option>{["1–10", "11–50", "51–200", "201–1000", "1001+"].map(value => <option key={value}>{value}</option>)}</select></FormField>
      <FormField id="audit-area" label={t("Area", "Área")}><input id="audit-area" name="area" required maxLength={120} className="field-control" /></FormField>
      <FormField id="audit-flow" label={t("Workflow type", "Tipo de flujo")}><select id="audit-flow" name="flowType" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a workflow", "Selecciona un flujo")}</option>{flowOptions.map(option => <option key={option}>{option}</option>)}</select></FormField>
      <FormField id="audit-location" label={t("Where does the information live?", "¿Dónde vive la información?")}><input id="audit-location" name="informationLocation" required maxLength={160} className="field-control" /></FormField>
      <FormField id="audit-tool" label={t("Primary tool", "Herramienta principal")}><select id="audit-tool" name="tool" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a tool", "Selecciona una herramienta")}</option>{toolOptions.map(option => <option key={option}>{option}</option>)}</select></FormField>
      <FormField id="audit-sender" label={t("Who sends the information?", "¿Quién envía la información?")}><input id="audit-sender" name="sender" required maxLength={160} className="field-control" /></FormField>
      <FormField id="audit-receiver" label={t("Who receives it?", "¿Quién la recibe?")}><input id="audit-receiver" name="receiver" required maxLength={160} className="field-control" /></FormField>
      <FormField id="audit-action" label={t("What action should happen next?", "¿Qué acción debe ocurrir después?")} className="sm:col-span-2"><input id="audit-action" name="nextAction" required maxLength={240} className="field-control" /></FormField>
      <FormField id="audit-change" label={t("What commonly changes?", "¿Qué cambia con frecuencia?")}><input id="audit-change" name="commonChange" required maxLength={200} className="field-control" /></FormField>
      <FormField id="audit-volume" label={t("Approximate volume", "Volumen aproximado")}><input id="audit-volume" name="volume" required maxLength={120} placeholder={t("e.g. 30 handoffs per week", "Ej. 30 entregas por semana")} className="field-control" /></FormField>
      <FormField id="audit-problem" label={t("Main problem", "Problema principal")} className="sm:col-span-2"><textarea id="audit-problem" name="problem" required minLength={20} maxLength={1000} aria-describedby="audit-sensitive-note" className="field-control min-h-32 resize-y py-3 leading-6" /></FormField>
    </div>
    <div className="honeypot-field" aria-hidden="true"><label htmlFor="audit-website">Website</label><input id="audit-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    <label className="mt-5 flex items-start gap-3 text-[10px] leading-5 text-[var(--muted)]"><input name="privacyConsent" value="accepted" type="checkbox" required className="mt-1 size-4 shrink-0 accent-[var(--brand-blue)]" /><span>{t("I have read the privacy notice and consent to Virro using this information to respond to my request.", "He leído el aviso de privacidad y autorizo a Virro a usar esta información para responder mi solicitud.")} <Link href="/legal/privacy" className="font-semibold text-[var(--brand-blue)]">{t("Privacy notice", "Aviso de privacidad")}</Link>.</span></label>
    <p id="audit-sensitive-note" className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]"><ShieldCheck aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Do not include credentials, private conversations, personal data or confidential documentation.", "No incluyas credenciales, conversaciones privadas, datos personales ni documentación confidencial.")}</p>
    <button type="submit" disabled={status === "sending"} className="brand-primary-button mt-5 w-full text-xs disabled:opacity-60"><Mail aria-hidden="true" size={14} />{status === "sending" ? t("Sending…", "Enviando…") : t("Request workflow audit", "Solicitar auditoría de flujo")}</button>
    {status === "error" && <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-4 text-[11px] leading-5 text-rose-200">{error}</div>}
  </form>;
}

function FormField({ id, label, help, className = "", children }: { id: string; label: string; help?: string; className?: string; children: React.ReactNode }) { return <div className={className}><label htmlFor={id} className="mb-2 block text-[11px] font-medium text-[var(--muted)]">{label}</label>{children}{help && <span id={`${id}-help`} className="mt-1.5 block text-[9px] leading-4 text-[var(--subtle)]">{help}</span>}</div>; }
function CheckCircle() { return <span className="grid size-10 place-items-center rounded-full bg-teal-400/10 text-teal-300"><ShieldCheck aria-hidden="true" size={19} /></span>; }
