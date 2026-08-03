import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { capabilities } from "@/content/site";

type Capability = keyof typeof capabilities;
const details: Record<Capability, { intro: string; examples: string[]; outcome: string }> = {
  studio: { intro: "La identidad sale del archivo y entra al establecimiento, la promoción y cada punto de contacto.", examples: ["Logo, tipografía y color", "Señalización, menú y exhibidores", "Campañas y contenido multicanal", "Mockups antes de producir"], outcome: "Una marca reconocible dentro y fuera de internet." },
  systems: { intro: "Las herramientas siguen el recorrido del cliente y la operación, no la moda tecnológica del momento.", examples: ["Web y SEO local", "WhatsApp, chatbot y escalamiento humano", "Agenda, cotización y seguimiento", "Automatización y microherramientas"], outcome: "Menos fugas visibles y pasos repetitivos." },
  academy: { intro: "Cada implementación incluye la capacidad humana necesaria para usarla de forma segura y sostenida.", examples: ["Onboarding y responsables", "Práctica sobre herramientas reales", "Manuales y checklists por rol", "IA y ciberseguridad básicas"], outcome: "Un cambio que el equipo puede mantener." },
};

export function CapabilityPage({ type }: { type: Capability }) {
  const capability = capabilities[type]; const detail = details[type];
  return <main id="main-content"><section className="page-hero section"><div className="shell"><span className="eyebrow">{capability.eyebrow}</span><h1 className="display">{capability.title}</h1><p className="lead">{detail.intro}</p><div className="actions"><Button asChild variant="acid" size="lg"><Link href={`/diagnostico?intent=${type}`}>Explorar esta capacidad <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/motor-virro">Ver cómo se combina</Link></Button></div></div></section><section className="section section-rule"><div className="shell capability-detail"><div><span className="eyebrow">Qué activamos</span><h2 className="section-title">Lo necesario para producir un resultado operable.</h2></div><div className="feature-list">{detail.examples.map((item, index) => <article key={item}><span>0{index + 1}</span><CheckCircle2 /><h3>{item}</h3></article>)}</div></div></section><section className="section section-rule"><div className="shell outcome-card" style={{ "--outcome": capability.accent } as React.CSSProperties}><span className="eyebrow">Resultado operativo</span><h2>{detail.outcome}</h2><p>No prometemos ventas. Diseñamos la capacidad, documentamos la implementación y medimos lo que sí puede observarse.</p><Button asChild variant="outline"><Link href="/transformaciones">Ver transformaciones <ArrowRight /></Link></Button></div></section></main>;
}
