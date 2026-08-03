import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MotorVirro } from "@/components/motor-virro";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = { title: "El Motor Virro", description: "Studio, Systems y Academy trabajando como un solo sistema." };
export default function Page() { return <main id="main-content"><section className="page-hero section"><div className="shell"><span className="eyebrow">Interacción insignia</span><h1 className="display">Tres capacidades. Un solo motor.</h1><p className="lead">Explora cada anillo y descubre por qué una transformación funciona cuando imagen, sistema y adopción avanzan juntos.</p><MotorVirro /></div></section><section className="section section-rule"><div className="shell cta-card"><span className="eyebrow">Construye tu combinación</span><h2>No tienes que activar todo. Tienes que activar lo correcto.</h2><Button asChild variant="acid" size="lg"><Link href="/diagnostico">Construir mi ruta <ArrowRight /></Link></Button></div></section></main>; }
