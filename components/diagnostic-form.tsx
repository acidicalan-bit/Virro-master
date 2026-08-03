"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

const steps = ["Tu negocio", "Prioridad", "Contacto"];
export function DiagnosticForm() {
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); if (step < 2) setStep((value) => value + 1); else setSent(true); }
  if (sent) return <div className="diagnostic-success"><CheckCircle2 /><span className="eyebrow">Diagnóstico recibido</span><h2>Ya tenemos un punto de partida.</h2><p>En esta versión demo no se envían datos a un servidor. La integración segura se activa en la fase de captación.</p><Button asChild><Link href="/demo">Mientras tanto, explora una demo</Link></Button></div>;
  return (
    <form className="diagnostic" onSubmit={submit}>
      <div className="diagnostic-progress">{steps.map((label, index) => <span className={index <= step ? "active" : ""} key={label}><b>{index + 1}</b>{label}</span>)}</div>
      <div className="diagnostic-step" key={step}>
        {step === 0 && <><label>Nombre del negocio<input name="business" required autoComplete="organization" placeholder="Ej. Café Jacaranda" /></label><div className="field-grid"><label>Giro<input name="sector" required placeholder="Cafetería, taller, clínica…" /></label><label>Alcaldía o municipio<input name="location" required placeholder="Ej. Coyoacán" /></label></div></>}
        {step === 1 && <fieldset><legend>¿Qué quieres mejorar primero?</legend><div className="choice-grid">{["Imagen", "Visibilidad", "Atención", "Ventas", "Operación", "Adopción"].map((choice) => <label className="choice" key={choice}><input type="radio" name="priority" value={choice} required /><span>{choice}</span></label>)}</div></fieldset>}
        {step === 2 && <><label>Tu nombre<input name="name" required autoComplete="name" /></label><div className="field-grid"><label>Correo<input type="email" name="email" required autoComplete="email" /></label><label>Teléfono o WhatsApp<input type="tel" name="phone" autoComplete="tel" /></label></div><label className="consent"><input type="checkbox" required /> <span>He leído el <Link href="/privacidad">aviso de privacidad</Link> y autorizo el contacto sobre este diagnóstico.</span></label><p className="micro">No incluyas credenciales, datos sensibles ni información de terceros.</p></>}
      </div>
      <div className="diagnostic-actions">{step > 0 && <Button type="button" variant="ghost" onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Atrás</Button>}<Button type="submit" variant="acid">{step === 2 ? "Terminar diagnóstico" : "Continuar"}<ArrowRight /></Button></div>
    </form>
  );
}
