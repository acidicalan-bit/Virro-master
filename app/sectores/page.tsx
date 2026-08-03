import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { sectors } from "@/content/site";
export const metadata: Metadata = { title: "Sectores", description: "Rutas de transformación adaptadas a distintos tipos de negocio." };
export default function Page() { return <main id="main-content"><section className="page-hero section"><div className="shell"><span className="eyebrow">Sectores</span><h1 className="display">El mismo sistema. Un recorrido distinto para cada negocio.</h1><p className="lead">El lenguaje, las decisiones y la demo cambian según cómo compra, opera y vuelve el cliente.</p></div></section><section className="section section-rule"><div className="shell sector-index">{sectors.map((sector,index) => <Link href={`/sectores/${sector.slug}`} key={sector.slug}><span>0{index+1}</span><div><small>{sector.pain}</small><h2>{sector.name}</h2><p>{sector.flow}</p></div><ArrowUpRight /></Link>)}</div></section></main>; }
