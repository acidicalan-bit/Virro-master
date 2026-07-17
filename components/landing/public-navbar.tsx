"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/components/i18n/language-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function PublicNavbar() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMobileOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const anchors = [
    ["/how-it-works", t("How it works", "Cómo funciona")],
    ["/flow-audit", t("Workflow audit", "Auditoría de flujo")],
    ["/#casos-uso", t("Use cases", "Casos de uso")],
    ["/#formas-entrada", t("Ways to begin", "Formas de entrada")],
    ["/#privacidad", t("Trust", "Confianza")],
    ["/demo", t("Demo", "Demo")],
  ];

  return (
    <header className="motion-navbar fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className={`landing-nav-shell relative mx-auto max-w-[1380px] rounded-2xl border border-[var(--border)] shadow-[0_16px_60px_rgba(0,0,0,.14)] backdrop-blur-2xl ${mobileOpen ? "bg-[var(--panel)]" : "bg-[color-mix(in_srgb,var(--header)_88%,transparent)]"}`} ref={menuRef}>
        <div className="flex h-16 items-center gap-3 px-4 md:px-5">
          <Link href="/" className="virro-brand flex shrink-0 items-center gap-2.5" aria-label={t("Virro home", "Inicio de Virro")}>
            <Image src="/brand/virro-icon.svg" alt="" width={31} height={25} sizes="29px" priority className="h-auto w-[29px] object-contain" />
            <span className="text-lg font-semibold tracking-[-.05em]">Virro</span>
          </Link>
          <nav className="public-desktop-nav ml-auto hidden items-center gap-0.5 min-[1281px]:flex" aria-label={t("Virro main navigation", "Navegación principal de Virro")}>
            {anchors.map(([href, label], index) => <Fragment key={href}><Link href={href} aria-label={label} className="rounded-full px-3 py-2.5 text-[10px] font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">{label}</Link>{index < anchors.length - 1 ? " " : null}</Fragment>)}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <div className="hidden sm:block"><LanguageToggle compact /></div>
            <ThemeToggle label={t("Toggle theme", "Cambiar tema")} />
            <Link href="/#solicitar-auditoria" className="brand-primary-button hidden h-9 items-center gap-2 rounded-full px-4 text-[10px] font-semibold 2xl:inline-flex">{t("Analyze a workflow", "Analizar un flujo")} <ArrowRight size={12} /></Link>
            <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="mobile-primary-navigation" aria-label={t("Open main menu", "Abrir menú principal")} className="mobile-menu-trigger min-[1281px]:hidden"><span>{t("Menu", "Menú")}</span>{mobileOpen ? <X size={16} /> : <Menu size={16} />}</button>
          </div>
        </div>

        {mobileOpen && <div id="mobile-primary-navigation" className="mobile-menu-panel min-[1281px]:hidden"><div className="mobile-menu-heading"><div><span>{t("Main navigation", "Navegación principal")}</span>{" "}<strong>Enterprise Understanding Layer</strong></div><div className="sm:hidden"><LanguageToggle /></div></div><nav className="mobile-menu-primary" aria-label={t("Virro mobile main navigation", "Navegación principal móvil de Virro")}>{anchors.map(([href, label], index) => <Fragment key={href}><Link href={href} aria-label={label} onClick={() => setMobileOpen(false)} style={{ "--mobile-index": index } as React.CSSProperties}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><ArrowRight aria-hidden="true" size={14} /></Link>{index < anchors.length - 1 ? " " : null}</Fragment>)}</nav><div className="mobile-menu-actions"><Link href="/#solicitar-auditoria" onClick={() => setMobileOpen(false)} className="brand-primary-button">{t("Analyze a workflow", "Analizar un flujo")} <ArrowRight aria-hidden="true" size={13} /></Link></div></div>}
      </div>
    </header>
  );
}
