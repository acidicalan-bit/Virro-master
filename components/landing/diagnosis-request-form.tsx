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
    const mailto = buildDiagnosisMailto({
      name: String(data.get("name") ?? ""),
      company: String(data.get("company") ?? ""),
      role: String(data.get("role") ?? ""),
      email: String(data.get("email") ?? ""),
      area: String(data.get("area") ?? ""),
      tools: String(data.get("tools") ?? ""),
      flow: String(data.get("flow") ?? ""),
      context: String(data.get("context") ?? ""),
      engagement: data.get("engagement") === "pilot" ? "pilot" : "audit",
    });
    setSubmitted(true);
    window.location.assign(mailto);
  }

  return <form id="solicitar-diagnostico" onSubmit={submit} className="diagnosis-request-form scroll-mt-24 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] md:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("Name", "Nombre")}><input name="name" required maxLength={80} autoComplete="name" className="field-control" /></FormField>
          <FormField label={t("Company", "Empresa")}><input name="company" required maxLength={120} autoComplete="organization" className="field-control" /></FormField>
          <FormField label={t("Role", "Rol")}><input name="role" required maxLength={120} autoComplete="organization-title" className="field-control" /></FormField>
          <FormField label="Email"><input name="email" type="email" required maxLength={254} autoComplete="email" className="field-control" /></FormField>
          <FormField label={t("Area where rework or confusion is highest today", "Área donde hoy se genera más retrabajo o confusión")}><input name="area" required maxLength={160} placeholder={t("e.g. Product and QA", "Ej. Producto y QA")} className="field-control" /></FormField>
          <FormField label={t("Tools where this flow lives", "Herramientas donde vive ese flujo")}><input name="tools" required maxLength={240} placeholder={t("e.g. Slack, Jira, Figma, Zendesk, Drive, Copilot", "Ej. Slack, Jira, Figma, Zendesk, Drive, Copilot")} className="field-control" /></FormField>
          <FormField label={t("Critical flow you want to diagnose", "Flujo crítico que quieres diagnosticar")} className="sm:col-span-2"><select name="flow" required defaultValue="" className="field-control"><option value="" disabled>{t("Select a flow", "Selecciona un flujo")}</option>{flowOptions.map((option) => <option key={option} value={option}>{option === "No estoy seguro" ? t("I am not sure", option) : option}</option>)}</select></FormField>
          <FormField label={t("Additional message", "Mensaje adicional")} className="sm:col-span-2"><textarea name="context" required minLength={12} maxLength={1200} placeholder={t("Describe the flow, its receivers and the rework or risk it is creating.", "Describe el flujo, sus receptores y el retrabajo o riesgo que está generando.")} className="field-control min-h-32 resize-y py-3 leading-6" /></FormField>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="submit" name="engagement" value="audit" className="brand-primary-button w-full text-xs"><Mail size={14} />{t("Request an audit", "Solicitar auditoría")}</button><button type="submit" name="engagement" value="pilot" className="brand-secondary-button w-full text-xs"><ShieldCheck size={14} />{t("Explore a pilot", "Explorar piloto")}</button></div>
        <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{t("Do not share sensitive information in this form. In a real audit, Virro defines privacy, scope and confidentiality rules before analyzing operational events.", "No compartas información sensible en este formulario. En una auditoría real, Virro define reglas de privacidad, alcance y confidencialidad antes de analizar eventos operativos.")}</p>
        {submitted && <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[.07] p-4 text-[11px] leading-5 text-sky-200"><Mail size={16} className="mt-0.5 shrink-0" /><span>{t("Your email client will open with the formal request and selected engagement prepared. Nothing is sent until you confirm it.", "Tu cliente de correo abrirá con la solicitud formal y el tipo de engagement seleccionados. Nada se envía hasta que lo confirmes.")}</span></div>}
  </form>;
}

function FormField({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-2 block text-[11px] font-medium text-[var(--muted)]">{label}</span>{children}</label>;
}
