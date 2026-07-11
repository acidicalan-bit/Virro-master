"use client";

import { type FormEvent, useState } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";

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
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    setSubmitted(true);
  }

  return <section id="solicitar-diagnostico" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-teal-300">Meaning Loss Audit</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-4xl">Solicitar diagnóstico</h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)]">Comparte el flujo que hoy pierde claridad, contexto o capacidad de ejecución. Esta demo registra la solicitud únicamente en la sesión visual y no envía información a servicios externos.</p>
        <div className="mt-7 space-y-3 text-[11px] leading-5 text-[var(--muted)]">
          <p className="flex gap-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-300" />Virro no evalúa personas. Evalúa riesgos de entendimiento en información operativa.</p>
          <p className="flex gap-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-300" />Los scores son estimaciones probabilísticas, no garantías.</p>
          <p className="flex gap-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-300" />No compartas información sensible en este formulario. Para pilotos reales se definen reglas de privacidad y alcance antes de analizar eventos.</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-white/[.08] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] md:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre"><input name="name" required maxLength={80} autoComplete="name" className="field-control" /></FormField>
          <FormField label="Empresa"><input name="company" required maxLength={120} autoComplete="organization" className="field-control" /></FormField>
          <FormField label="Rol"><input name="role" required maxLength={120} autoComplete="organization-title" className="field-control" /></FormField>
          <FormField label="Email"><input name="email" type="email" required maxLength={254} autoComplete="email" className="field-control" /></FormField>
          <FormField label="¿Qué flujo te gustaría diagnosticar?" className="sm:col-span-2"><select name="flow" required defaultValue="" className="field-control"><option value="" disabled>Selecciona un flujo</option>{flowOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormField>
          <FormField label="Describe brevemente dónde se está perdiendo claridad, contexto o ejecución." className="sm:col-span-2"><textarea name="context" required minLength={12} maxLength={1200} className="field-control min-h-32 resize-y py-3 leading-6" /></FormField>
        </div>
        <button type="submit" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 text-xs font-semibold text-slate-950"><Send size={14} />Enviar solicitud</button>
        {submitted && <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-4 text-[11px] leading-5 text-emerald-200"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><span>Gracias. Tu solicitud quedó registrada como demo. Conecta este formulario a email/CRM en la siguiente fase.</span></div>}
      </form>
    </div>
  </section>;
}

function FormField({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-2 block text-[11px] font-medium text-[var(--muted)]">{label}</span>{children}</label>;
}
