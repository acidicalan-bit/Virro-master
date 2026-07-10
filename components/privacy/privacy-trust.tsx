"use client";

import { useState } from "react";
import { CheckCircle2, EyeOff, Fingerprint, LockKeyhole, ShieldCheck, UsersRound, XCircle } from "lucide-react";

type TrustMode = "private" | "pattern";

const principles = [
  "Virro debe ser más confiable que inteligente.",
  "No guardar conversaciones privadas por defecto.",
  "No guardar mensajes crudos innecesarios.",
  "Guardar patrones anonimizados solo con permiso.",
  "No usar Virro para vigilar empleados.",
  "No culpar personas; detectar pérdida de entendimiento.",
  "Los scores son estimaciones de riesgo operativo, no evaluaciones personales.",
];

const modeData = {
  private: {
    label: "Private Mode",
    description: "Analyze the event for the current session without retaining raw operational content for pattern learning.",
    saved: ["Event ID and selected Analysis Pack", "Generated scores when the workspace chooses to keep them", "Approved operational outputs"],
    notSaved: ["Private conversations", "Raw messages after the configured session boundary", "Employee behavior profiles", "Cross-customer learning patterns"],
  },
  pattern: {
    label: "Pattern Learning Allowed",
    description: "Store permissioned, anonymized understanding patterns to improve workspace-level risk detection.",
    saved: ["Anonymized missing-context categories", "Aggregated risk and readiness patterns", "Pack effectiveness trends", "Permission and retention audit record"],
    notSaved: ["Names or employee performance profiles", "Private conversation history", "Raw messages unrelated to the approved pattern", "Data for cross-customer model training"],
  },
};

export function PrivacyTrust() {
  const [mode, setMode] = useState<TrustMode>("private");
  const current = modeData[mode];
  return <div className="space-y-6"><section><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-teal-300"><span className="grid size-7 place-items-center rounded-md bg-teal-400/10"><LockKeyhole size={14} /></span>15 · Privacy & Trust</div><h1 className="text-2xl font-semibold tracking-[-.035em] md:text-[30px]">Trust boundaries visible before analysis begins.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Virro separates operational understanding from employee surveillance and makes retention choices explicit at workspace level.</p></section>
    <section className="grid gap-4 xl:grid-cols-[.88fr_1.12fr]"><article className="panel p-5"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-300" /><h2 className="text-sm font-semibold">Virro Trust Principles</h2></div><div className="mt-4 space-y-2">{principles.map((principle) => <div key={principle} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-300" /><p className="text-[11px] leading-5 text-[var(--muted)]">{principle}</p></div>)}</div></article><div className="space-y-4"><article className="panel p-5"><h2 className="text-sm font-semibold">Workspace data mode</h2><p className="mt-1 text-[10px] text-[var(--subtle)]">Choose what Virro may retain after an Understanding Event is analyzed.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><ModeButton active={mode === "private"} onClick={() => setMode("private")} icon={<EyeOff size={17} />} title="Private Mode" detail="Minimal retention by default" /><ModeButton active={mode === "pattern"} onClick={() => setMode("pattern")} icon={<Fingerprint size={17} />} title="Pattern Learning Allowed" detail="Anonymized, permissioned patterns" /></div><div className="mt-4 rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-teal-300" /><p className="text-xs font-semibold">{current.label} active</p></div><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{current.description}</p></div></article><article className="panel p-5"><div className="grid gap-5 md:grid-cols-2"><DataList title="What is saved" items={current.saved} saved /><DataList title="What is not saved" items={current.notSaved} /></div></article><article className="panel p-5"><div className="flex items-center gap-2"><UsersRound size={16} className="text-indigo-300" /><h2 className="text-sm font-semibold">No employee surveillance</h2></div><p className="mt-3 text-xs leading-6 text-[var(--muted)]">Virro analyzes where context, ownership and meaning are lost in operational systems. It does not rank people, infer motivation or create individual performance scores.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{["Process-level signals", "Workspace-level patterns", "No personal scoring"].map((item) => <span key={item} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-center text-[9px] text-[var(--muted)]">{item}</span>)}</div></article></div></section>
    <section className="panel p-5"><div className="grid gap-4 md:grid-cols-4">{[{n:"01",t:"Capture",d:"Only operationally relevant input"},{n:"02",t:"Analyze",d:"Mock engine or approved provider boundary"},{n:"03",t:"Minimize",d:"Discard unnecessary raw content"},{n:"04",t:"Retain",d:"Only according to the selected mode"}].map((step) => <div key={step.n} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-[9px] font-semibold text-teal-300">{step.n}</p><p className="mt-2 text-xs font-medium">{step.t}</p><p className="mt-1 text-[10px] leading-4 text-[var(--subtle)]">{step.d}</p></div>)}</div></section>
  </div>;
}

function ModeButton({ active, onClick, icon, title, detail }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; detail: string }) { return <button onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-teal-400/30 bg-teal-400/[.06]" : "border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--subtle)]"}`}><span className={active ? "text-teal-300" : "text-[var(--subtle)]"}>{icon}</span><p className="mt-3 text-xs font-semibold">{title}</p><p className="mt-1 text-[9px] text-[var(--subtle)]">{detail}</p></button>; }
function DataList({ title, items, saved = false }: { title: string; items: string[]; saved?: boolean }) { return <div><div className="flex items-center gap-2"><span className={saved ? "text-emerald-300" : "text-rose-300"}>{saved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}</span><h3 className="text-xs font-semibold">{title}</h3></div><div className="mt-3 space-y-2">{items.map((item) => <div key={item} className="flex items-start gap-2 text-[10px] leading-4 text-[var(--muted)]"><span className={`mt-1.5 size-1 shrink-0 rounded-full ${saved ? "bg-emerald-300" : "bg-rose-300"}`} />{item}</div>)}</div></div>; }
