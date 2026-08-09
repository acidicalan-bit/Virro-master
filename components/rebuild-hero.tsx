"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const VirroEngine = dynamic(() => import("@/components/virro-engine").then((module) => module.VirroEngine), { ssr: false, loading: () => <div className="engine-loading" aria-label="Cargando el Motor Virro" /> });

export function RebuildHero() {
  return (
    <section className="rebuild-hero">
      <Image className="rebuild-hero-image" src="/portfolio/bella-luna-after.webp" alt="Interior de una estética para un concepto demostrativo" fill priority sizes="100vw" />
      <div className="rebuild-hero-shade" />
      <div className="shell rebuild-hero-grid">
        <div className="rebuild-hero-copy"><p className="eyebrow">VIRRO IMPULSA · CDMX</p><h1>Tu negocio puede verse mejor, trabajar mejor y vender mejor.</h1><p>VIRRO combina diseño, tecnología y acompañamiento para construir la siguiente versión de tu negocio.</p><div className="actions"><Button asChild variant="coral" size="lg"><Link href="/diagnostico">Quiero ver mi negocio transformado <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg"><Link href="#transformacion">Explorar una transformación</Link></Button></div></div>
        <VirroEngine />
      </div>
    </section>
  );
}
