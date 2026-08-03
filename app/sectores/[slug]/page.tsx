import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectors } from "@/content/site";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return sectors.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const sector = sectors.find((entry) => entry.slug === slug); return sector ? { title: sector.name, description: sector.pain } : {}; }
export default async function Page({ params }: Props) { const { slug } = await params; const sector = sectors.find((entry) => entry.slug === slug); if (!sector) notFound(); return <main id="main-content"><section className="page-hero section"><div className="shell"><span className="eyebrow">Ruta por sector · {sector.name}</span><h1 className="display">De {sector.pain.toLowerCase()} a un recorrido que sí continúa.</h1><p className="lead">{sector.flow}. Esta página plantea una ruta conceptual que debe validarse con la realidad del negocio.</p><div className="actions"><Button asChild variant="acid" size="lg"><Link href={`/demo/${sector.slug}`}>Probar demo del sector <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/diagnostico">Solicitar diagnóstico</Link></Button></div></div></section><section className="section section-rule"><div className="shell"><span className="eyebrow">Módulos iniciales</span><div className="feature-list sector-features">{sector.modules.map((module,index) => <article key={module}><span>0{index+1}</span><CheckCircle2 /><h2>{module}</h2></article>)}</div></div></section></main>; }
