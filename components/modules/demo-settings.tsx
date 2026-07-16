"use client";

import { CheckCircle2, LockKeyhole, Settings } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

const teams = ["Producto", "Desarrollo", "QA", "Operaciones", "Soporte", "AI Enablement"];
const flows = ["Cambio de alcance", "Producto a desarrollo", "Desarrollo a QA", "Instrucción para IA", "Onboarding"];
const packs = ["Product Delivery", "Handoff Intelligence", "Change Understanding", "AI Understanding"];
const privacy = ["Safe mode activo", "Contenido crudo no almacenado por defecto", "Enmascaramiento activo", "Señales seguras habilitadas"];

export function DemoSettings() {
  const { t } = useLanguage();
  return <div className="space-y-6"><header><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-teal-300"><Settings size={14} />{t("Demo configuration", "Configuración de demo")}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">Virro Demo Enterprise</h1><p className="mt-2 text-sm text-[var(--muted)]">{t("Simulated configuration for demonstration purposes", "Configuración simulada para fines de demostración")}</p></header><div className="grid gap-4 lg:grid-cols-2"><Panel title={t("Teams", "Equipos")} items={teams} /><Panel title={t("Active workflows", "Flujos activos")} items={flows} /><Panel title={t("Enabled packs", "Packs habilitados")} items={packs} /><Panel title={t("Privacy", "Privacidad")} items={privacy} icon={<LockKeyhole size={15} />} /></div><section className="panel p-5"><h2 className="text-sm font-semibold">Scoring</h2><dl className="mt-4 grid gap-3 sm:grid-cols-3"><Value term={t("Version", "Versión")} value="virro-scoring-v1" /><Value term={t("Model", "Modelo")} value={t("Probabilistic scores", "Scores probabilísticos")} /><Value term={t("Control", "Control")} value={t("Human review required", "Revisión humana requerida")} /></dl></section></div>;
}
function Panel({ title, items, icon }: { title: string; items: string[]; icon?: React.ReactNode }) { return <section className="panel p-5"><div className="flex items-center gap-2">{icon}<h2 className="text-sm font-semibold">{title}</h2></div><ul className="mt-4 grid gap-2 sm:grid-cols-2">{items.map((item) => <li key={item} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-[11px]"><CheckCircle2 size={13} className="shrink-0 text-teal-300" />{item}</li>)}</ul></section>; }
function Value({ term, value }: { term: string; value: string }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><dt className="text-[9px] uppercase tracking-[.1em] text-[var(--subtle)]">{term}</dt><dd className="mt-2 text-xs font-semibold">{value}</dd></div>; }
