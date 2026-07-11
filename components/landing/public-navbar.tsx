"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/components/i18n/language-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { modules, localizeModule } from "@/lib/config/modules";

const solutionIds = ["product-delivery", "ai-understanding", "handoff-intelligence", "process-understanding", "onboarding", "consulting-delivery", "talent-staffing", "technical-documentation"];

export function PublicNavbar() {
  const { locale, t } = useLanguage();
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const solutions = modules.filter((module) => solutionIds.includes(module.id)).map((module) => localizeModule(module, locale));

  useEffect(() => {
    function close(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setSolutionsOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setSolutionsOpen(false); setMobileOpen(false); }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const anchors = [
    ["#plataforma", t("Platform", "Plataforma")],
    ["#donde-entra", t("Where it fits", "Dónde entra")],
    ["#ai-understanding", "AI Understanding"],
    ["#auditoria", t("Audit", "Auditoría")],
    ["#confianza", t("Trust", "Confianza")],
    ["#demo", "Demo"],
  ];

  return (
    <header className="motion-navbar fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className={`landing-nav-shell relative mx-auto max-w-[1380px] rounded-2xl border border-[var(--border)] shadow-[0_16px_60px_rgba(0,0,0,.14)] backdrop-blur-2xl ${mobileOpen ? "bg-[var(--panel)]" : "bg-[color-mix(in_srgb,var(--header)_88%,transparent)]"}`} ref={menuRef}>
        <div className="flex h-16 items-center gap-3 px-4 md:px-5">
          <Link href="/" className="virro-brand flex shrink-0 items-center gap-2.5" aria-label={t("Virro home", "Inicio de Virro")}>
            <Image src="/brand/virro-icon.svg" alt="" width={31} height={25} priority className="h-auto w-[29px] object-contain" />
            <span className="text-lg font-semibold tracking-[-.05em]">Virro</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-0.5 xl:flex" aria-label={t("Public navigation", "Navegación pública")}>
            <button type="button" onClick={() => setSolutionsOpen((value) => !value)} aria-expanded={solutionsOpen} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[10px] font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">Packs <ChevronDown size={12} className={`transition ${solutionsOpen ? "rotate-180" : ""}`} /></button>
            {anchors.map(([href, label]) => <a key={href} href={href} className="rounded-full px-3 py-2.5 text-[10px] font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">{label}</a>)}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <div className="hidden sm:block"><LanguageToggle compact /></div>
            <ThemeToggle label={t("Toggle theme", "Cambiar tema")} />
            <Link href="/app" className="hidden h-9 items-center rounded-full border border-[var(--border)] px-3 text-[10px] font-semibold md:inline-flex">{t("Enterprise demo", "Demo enterprise")}</Link>
            <a href="#solicitar-diagnostico" className="brand-primary-button hidden h-9 items-center gap-2 rounded-full px-4 text-[10px] font-semibold 2xl:inline-flex">{t("Diagnose a critical flow", "Diagnosticar un flujo crítico")} <ArrowRight size={12} /></a>
            <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label={t("Open menu", "Abrir menú")} className="grid size-9 place-items-center rounded-full border border-[var(--border)] xl:hidden">{mobileOpen ? <X size={17} /> : <Menu size={17} />}</button>
          </div>
        </div>

        {solutionsOpen && <div className="absolute left-1/2 top-[calc(100%+10px)] hidden w-[min(960px,calc(100vw-48px))] -translate-x-1/2 rounded-[22px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[0_30px_100px_rgba(0,0,0,.24)] xl:block"><div className="mb-3 flex items-center justify-between px-2"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[var(--brand-blue)]">Operating Understanding</p><p className="mt-1 text-xs text-[var(--muted)]">{t("Analysis packs for critical operational flows", "Packs de análisis para flujos operativos críticos")}</p></div><Link href="/app" className="text-[10px] font-semibold text-[var(--brand-blue)]">{t("Explore demo", "Explorar demo")} →</Link></div><div className="grid grid-cols-2 gap-1">{solutions.map(({ id, href, icon: Icon, label, description }) => <Link key={id} href={href} onClick={() => setSolutionsOpen(false)} className="group flex gap-3 rounded-xl p-3 transition hover:bg-[var(--hover)]"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--brand-blue)]"><Icon size={16} /></span><span><span className="block text-[11px] font-semibold">{label}</span><span className="mt-1 block text-[9px] leading-4 text-[var(--subtle)]">{description}</span></span></Link>)}</div></div>}

        {mobileOpen && <div className="max-h-[calc(100vh-96px)] overflow-y-auto border-t border-[var(--border)] bg-[var(--panel)] p-4 xl:hidden"><div className="mb-4 sm:hidden"><LanguageToggle /></div><p className="px-2 text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--subtle)]">{t("Packs", "Packs")}</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{solutions.map(({ id, href, icon: Icon, label }) => <Link key={id} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-[10px] font-medium hover:bg-[var(--hover)]"><Icon size={14} className="text-[var(--brand-blue)]" />{label}</Link>)}</div><div className="my-3 h-px bg-[var(--border)]" />{anchors.map(([href, label]) => <a key={href} href={href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-2 py-3 text-[11px] text-[var(--muted)]">{label}</a>)}<div className="mt-3 grid grid-cols-2 gap-2"><Link href="/app" className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] text-[10px] font-semibold">{t("View demo", "Ver demo")}</Link><a href="#solicitar-diagnostico" onClick={() => setMobileOpen(false)} className="brand-primary-button inline-flex h-11 items-center justify-center rounded-xl text-[10px] font-semibold">{t("Diagnose flow", "Diagnosticar flujo")}</a></div></div>}
      </div>
    </header>
  );
}
