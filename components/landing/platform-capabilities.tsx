"use client";

import { ArrowRight, BookOpenCheck, Boxes, Camera, CheckCircle2, FileOutput, Radar, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { StaggerGroup } from "@/components/landing/motion/motion-primitives";

const capabilities = [
  { icon: Camera, name: "Capture", en: "Captures relevant operating information from real work.", es: "Captura información operativa relevante desde el trabajo real." },
  { icon: ShieldCheck, name: "Privacy Shield", en: "Applies minimization and masking before analysis.", es: "Aplica minimización y máscara antes del análisis." },
  { icon: Radar, name: "Readiness Gate", en: "Checks whether information can advance or still needs validation.", es: "Valida si la información puede avanzar o todavía necesita validación." },
  { icon: Boxes, name: "Pack Engine", en: "Selects the right review pack for the receiver and operating flow.", es: "Selecciona el pack de revisión adecuado para el receptor y flujo operativo." },
  { icon: FileOutput, name: "Executive Report", en: "Structures the signals needed for executive follow-up and decisions.", es: "Estructura las señales necesarias para seguimiento y decisiones ejecutivas." },
];

export function PlatformCapabilities() {
  const { locale, t } = useLanguage();
  return <section id="capacidades" className="capability-system-section scroll-mt-24 px-5 py-24 md:px-8 md:py-36"><div className="mx-auto max-w-[1380px]"><div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-end"><div><p className="section-kicker">{t("The operating system", "El sistema operativo")}</p><h2 className="section-display">{t("From scattered information to operational signals for better decisions.", "De información dispersa a señales operativas para decidir mejor.")}</h2></div><p className="section-lead lg:justify-self-end">{t("Virro connects evidence, readiness and receiver-specific deliverables to retain readiness, risk, context and continuity signals that inform decisions, handoffs and executive reports.", "Virro conecta evidencia, readiness y entregables por receptor para conservar señales de readiness, riesgo, contexto y continuidad que alimentan decisiones, handoffs y reportes ejecutivos.")}</p></div><div className="capability-system-rail mt-14" aria-label={t("Virro capability sequence", "Secuencia de capacidades Virro")}><span>Capture</span><ArrowRight size={14} /><span>Privacy Shield</span><ArrowRight size={14} /><span>Readiness Gate</span><ArrowRight size={14} /><span>Pack Engine</span><ArrowRight size={14} /><span>Executive Report</span></div><StaggerGroup className="capability-system-grid mt-5">{capabilities.map(({ icon: Icon, name, en, es }, index) => <article key={name} className={index === 4 ? "is-featured" : ""}><div><span>{String(index + 1).padStart(2, "0")}</span><Icon size={19} /></div><h3>{name}</h3><p>{locale === "es" ? es : en}</p><CheckCircle2 size={14} /></article>)}</StaggerGroup></div></section>;
}

const faqs = [
  { qEn: "What is Virro?", qEs: "¿Qué es Virro?", aEn: "Virro is enterprise digital operational understanding infrastructure. It reviews whether information has enough context, criteria and clarity to move forward.", aEs: "Virro es infraestructura empresarial de entendimiento operativo digital. Revisa si la información tiene suficiente contexto, criterio y claridad para avanzar." },
  { qEn: "What is an Understanding Event?", qEs: "¿Qué es un Understanding Event?", aEn: "A traceable moment where information must be understood by a person, team, tool or AI before action can continue.", aEs: "Es un momento trazable donde una persona, equipo, herramienta o IA necesita entender información antes de continuar una acción." },
  { qEn: "Does Virro require AI?", qEs: "¿Virro requiere IA?", aEn: "No. Virro creates value across human and system handoffs. AI Understanding is one strong application, not a prerequisite.", aEs: "No. Virro genera valor en handoffs entre personas y sistemas. AI Understanding es una aplicación fuerte, no un requisito." },
  { qEn: "How does a Virro pilot begin?", qEs: "¿Cómo empieza un piloto de Virro?", aEn: "With an audit of one critical flow, followed by an Enterprise Understanding Map, a recommended pack and a focused pilot.", aEs: "Con una auditoría de un flujo crítico, seguida por un Enterprise Understanding Map, un pack recomendado y un piloto enfocado." },
  { qEn: "How does Virro handle sensitive information?", qEs: "¿Cómo maneja Virro la información sensible?", aEn: "Privacy Shield favors minimization, masking, anonymization and pattern-first handling. Scope and controls are agreed before real evidence is reviewed.", aEs: "Privacy Shield prioriza minimización, máscara, anonimización y manejo pattern-first. El alcance y los controles se acuerdan antes de revisar evidencia real." },
];

const glossary = [
  ["Virro", "Enterprise digital operational understanding infrastructure.", "Infraestructura empresarial de entendimiento operativo digital."],
  ["Understanding Event", "A unit of information that must be understood before action.", "Unidad de información que debe entenderse antes de actuar."],
  ["Readiness", "A probabilistic estimate of whether information is ready to advance.", "Estimación probabilística de si la información está lista para avanzar."],
  ["Privacy Shield", "Data-minimizing controls for audits and pilots.", "Controles de minimización de datos para auditorías y pilotos."],
  ["AI Understanding", "Operational context prepared for safer AI use.", "Contexto operativo preparado para un uso más seguro de IA."],
  ["Living Understanding Map", "A living view of flows, decisions, risks and continuity.", "Vista viva de flujos, decisiones, riesgos y continuidad."],
];

export function DiscoverabilitySection() {
  const { locale, t } = useLanguage();
  return <section id="recursos" className="discoverability-section scroll-mt-24 border-y border-[var(--border)] px-5 py-24 md:px-8 md:py-36"><div className="mx-auto max-w-[1380px]"><div className="max-w-4xl"><p className="section-kicker">{t("Clear for people, search and AI", "Claro para personas, búsqueda e IA")}</p><h2 className="section-display">{t("A category that can be understood without interpretation.", "Una categoría que puede entenderse sin interpretación adicional.")}</h2><p className="section-lead mt-6">{t("Definitions, use cases and boundaries make Virro discoverable by buyers, search engines, LLMs and enterprise agents.", "Definiciones, casos de uso y límites hacen que Virro sea descubrible por compradores, buscadores, LLMs y agentes empresariales.")}</p></div><div className="discoverability-layout mt-14"><div className="faq-stack"><p className="discoverability-label">FAQ</p>{faqs.map((faq) => <details key={faq.qEn}><summary>{locale === "es" ? faq.qEs : faq.qEn}</summary><p>{locale === "es" ? faq.aEs : faq.aEn}</p></details>)}</div><div className="glossary-panel"><div className="flex items-center gap-3"><BookOpenCheck size={18} /><p className="discoverability-label">{t("Operational glossary", "Glosario operativo")}</p></div><dl>{glossary.map(([term, en, es]) => <div key={term}><dt>{term}</dt><dd>{locale === "es" ? es : en}</dd></div>)}</dl></div></div></div></section>;
}
