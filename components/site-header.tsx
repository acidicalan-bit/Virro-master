"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const nav = [
  ["Cómo funciona", "/impulsa"],
  ["Transformaciones", "/transformaciones"],
  ["Sectores", "/sectores"],
  ["Capacidades", "/motor-virro"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="VIRRO IMPULSA, inicio" onClick={() => setOpen(false)}>
          <Image src="/brand/virro-icon.svg" width={30} height={24} alt="" priority />
          <span>VIRRO</span>
          <span className="brand-program">IMPULSA</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          <Link className="core-link" href="/labs">Virro Core ↗</Link>
        </nav>
        <Button className="header-cta" asChild size="sm"><Link href="/diagnostico">Ver mi negocio transformado</Link></Button>
        <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((value) => !value)}>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}<span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
      </div>
      <nav id="mobile-nav" className={`mobile-nav ${open ? "is-open" : ""}`} aria-label="Navegación móvil">
        {nav.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link href="/labs" onClick={() => setOpen(false)}>Virro Core ↗</Link>
        <Button asChild variant="acid"><Link href="/diagnostico" onClick={() => setOpen(false)}>Quiero iniciar</Link></Button>
      </nav>
    </header>
  );
}
