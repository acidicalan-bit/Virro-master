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
  "Design & Experience",
  "Data Request",
  "Sales-to-Delivery",
  "Support Signal",
  "Marketing Understanding",
  "Finance / Procurement",
  "Legal / Security / Compliance",
  "Talent & Staffing",
  "Knowledge Continuity",
  "Process Understanding",
  "No estoy seguro",
];

export function DiagnosisRequestForm() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (String(data.get("website") ?? "").trim()) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mailto = buildDiagnosisMailto({
      name: String(data.get("name") ?? ""),
      company: String(data.get("company") ?? ""),
      role: String(data.get("role") ?? ""),
      email: String(data.get("email") ?? ""),
      area: String(data.get("area") ?? ""),
      tools: String(data.get("tools") ?? ""),
      flow: String(data.get("flow") ?? ""),
      context: String(data.get("context") ?? ""),
      engagement: submitter?.value === "pilot" ? "pilot" : "audit",
    });
    setSubmitted(true);
    window.location.assign(mailto);
  }

  return <form id="solicitar-diagnostico" onSubmit={submit} aria-describedby="diagnosis-sensitive-note" className="diagnosis-request-form scroll-mt-24 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] md:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="diagnosis-name" label={t("Name", "Nombre")}><input id="diagnosis-name" name="name" required aria-required="true" maxLength={80} autoComplete="name" className="field-control" /></FormField>
          <FormField id="diagnosis-company" label={t("Company", "Empresa")}><input id="diagnosis-company" name="company" required aria-required="true" maxLength={120} autoComplete="organization" className="field-control" /></FormField>
          <FormField id="diagnosis-role" label={t("Role", "Rol")}><input id="diagnosis-role" name="role" required aria-required="true" maxLength={120} autoComplete="organization-title" className="field-control" /></FormField>
          <FormField id="diagnosis-email" label="Email"><input id="diagnosis-email" name="email" type="email" required aria-required="true" aria-describedby="diagnosis-email-help" maxLength={254} autoComplete="email" inputMode="email" spellCheck={false} className="field-control" /><span id="diagnosis-email-help" className="sr-only">{t("Enter a valid business email address.", "Ingresa una dirección de correo empresarial válida.")}</span></FormField>
          <FormField id="diagnosis-area" label={t("Area where rework or confusion is highest today", "Área donde hoy se genera más retrabajo o confusión")}><input id="diagnosis-area" name="area" required aria-required="true" maxLength={160} placeholder={t("e.g. Product and QA", "Ej. Producto y QA")} className="field-control" /></FormField>
          <FormField id="diagnosis-tools" label={t("Tools where this flow lives", "Herramientas donde vive ese flujo")}><input id="diagnosis-tools" name="tools" required aria-required="true" maxLength={240} placeholder={t("e.g. Slack, Jira, Figma, Zendesk, Drive, Copilot", "Ej. Slack, Jira, Figma, Zendesk, Drive, Copilot")} className="field-control" /></FormField>
          <FormField id="diagnosis-flow" label={t("Critical flow you want to diagnose", "Flujo crítico que quieres diagnosticar")} className="sm:col-span-2"><select id="diagnosis-flow" name="flow" required aria-required="true" defaultValue="" className="field-control"><option value="" disabled>{t("Select a flow", "Selecciona un flujo")}</option>{flowOptions.map((option) => <option key={option} value={option}>{option === "No estoy seguro" ? t("I am not sure", option) : option}</option>)}</select></FormField>
          <FormField id="diagnosis-context" label={t("Additional message", "Mensaje adicional")} className="sm:col-span-2"><textarea id="diagnosis-context" name="context" required aria-required="true" minLength={12} maxLength={1200} placeholder={t("Describe the flow, its receivers and the rework or risk it is creating.", "Describe el flujo, sus receptores y el retrabajo o riesgo que está generando.")} className="field-control min-h-32 resize-y py-3 leading-6" /></FormField>
        </div>
        <div className="honeypot-field" aria-hidden="true"><label htmlFor="diagnosis-website">Website</label><input id="diagnosis-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="submit" name="engagement" value="audit" className="brand-primary-button w-full text-xs"><Mail size={14} />{t("Request an audit", "Solicitar auditoría")}</button><button type="submit" name="engagement" value="pilot" className="brand-secondary-button w-full text-xs"><ShieldCheck size={14} />{t("Explore a pilot", "Explorar piloto")}</button></div>
        <p id="diagnosis-sensitive-note" className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]"><ShieldCheck aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Share the flow where operational clarity is most often lost. Do not include sensitive data.", "Comparte el flujo donde más se pierde claridad operativa. No incluyas datos sensibles.")}</p>
        {submitted && <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[.07] p-4 text-[11px] leading-5 text-sky-200"><Mail size={16} className="mt-0.5 shrink-0" /><span>{t("Your email client will open with the formal request and selected engagement prepared. Nothing is sent until you confirm it.", "Tu cliente de correo abrirá con la solicitud formal y el tipo de engagement seleccionados. Nada se envía hasta que lo confirmes.")}</span></div>}
  </form>;
}

function FormField({ id, label, className = "", children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label htmlFor={id} className="mb-2 block text-[11px] font-medium text-[var(--muted)]">{label}</label>{children}</div>;
}
