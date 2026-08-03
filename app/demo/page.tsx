import type { Metadata } from "next";
import { SectorShowcase } from "@/components/sector-showcase";
export const metadata: Metadata = { title: "Demos", description: "Explora recorridos conceptuales por sector." };
export default function Page() { return <main id="main-content"><section className="page-hero section"><div className="shell"><span className="eyebrow">Tu Negocio Digital en Vivo</span><h1 className="display">No imagines cómo funcionaría. Pruébalo.</h1><p className="lead">Demos conceptuales sin datos reales, backend peligroso ni resultados inventados.</p></div></section><section className="section section-rule"><div className="shell"><SectorShowcase /></div></section></main>; }
