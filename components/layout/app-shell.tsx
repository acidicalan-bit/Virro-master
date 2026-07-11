"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { localizeModule, modules } from "@/lib/config/modules";
import { events } from "@/lib/data/seed";
import { buildWorkspaceStats } from "@/lib/domain/understanding-event";
import { useLanguage } from "@/components/i18n/language-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const shellStats = buildWorkspaceStats(events);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const updateViewport = () => setIsDesktop(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text)]">
      <aside aria-hidden={!isDesktop && !open} inert={!isDesktop && !open} className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[var(--border)] px-5">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="grid size-9 place-items-center rounded-xl border border-[var(--border)] bg-white p-1.5"><Image src="/brand/virro-icon.svg" alt="" width={28} height={24} className="h-auto w-full" /></div>
            <div><p className="text-[17px] font-semibold tracking-[-0.03em]">Virro</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">Enterprise</p></div>
          </Link>
          <button aria-label={t("Close navigation", "Cerrar navegación")} className="rounded-lg p-2 text-[var(--muted)] lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--subtle)]">{t("Understanding system", "Sistema de entendimiento")}</p>
          <div className="space-y-0.5">
            {modules.filter((module) => module.showInNavigation !== false).map((module) => {
              const localizedModule = localizeModule(module, locale);
              const active = module.id === "dashboard" ? pathname === "/app" : pathname.startsWith(module.href);
              const Icon = module.icon;
              return (
                <div key={module.id}>
                  {module.id === "product-delivery" && <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--subtle)]">{t("Analysis packs", "Packs de análisis")}</p>}
                  {module.id === "reports" && <div className="my-3 border-t border-[var(--border)]" />}
                  <Link href={module.href} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${active ? "bg-[var(--active)] font-medium text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"}`}>
                    <Icon size={17} strokeWidth={active ? 2 : 1.7} className={active ? "text-teal-300" : "text-[var(--subtle)] group-hover:text-[var(--muted)]"} />
                    <span>{localizedModule.label}</span>
                    {module.id === "inbox" && <span className="ml-auto rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300">{events.length}</span>}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex items-center justify-between text-xs"><span className="text-[var(--muted)]">{t("Workspace health", "Salud del workspace")}</span><span className="font-semibold text-teal-300">{shellStats.virroScore}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300" style={{ width: `${shellStats.virroScore}%` }} /></div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--subtle)]">{t(`Estimated from ${events.length} active Understanding Events.`, `Estimado a partir de ${events.length} Understanding Events activos.`)}</p>
          </div>
          <Link href="/" className="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-[10px] font-medium text-[var(--subtle)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]"><span>{t("Back to public site", "Volver al sitio público")}</span><ArrowUpRight size={12} /></Link>
        </div>
      </aside>
      {open && <button aria-label={t("Close navigation overlay", "Cerrar superposición de navegación")} className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-[var(--border)] bg-[color:var(--header)] px-4 backdrop-blur-xl md:px-7">
          <button aria-label={t("Open navigation", "Abrir navegación")} className="rounded-lg p-2 text-[var(--muted)] lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <button className="flex min-w-0 items-center gap-2 text-left">
            <div className="hidden size-7 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[10px] font-bold text-teal-300 sm:grid">AP</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">Aperture Systems</p><p className="hidden text-[10px] text-sky-300 sm:block">{t("Demo workspace · Simulated data", "Demo workspace · Datos simulados")}</p></div>
            <ChevronDown size={14} className="text-[var(--subtle)]" />
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs text-[var(--subtle)] transition hover:text-[var(--text)] md:flex"><Search size={15} /> {t("Search events", "Buscar eventos")} <kbd className="ml-6 text-[10px]">⌘ K</kbd></button>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel-soft)]" aria-label={t("Language selector", "Selector de idioma")}><button aria-pressed={locale === "es"} onClick={() => setLocale("es")} className={`px-2.5 py-2 text-[10px] font-semibold ${locale === "es" ? "bg-teal-400/15 text-teal-200" : "text-[var(--subtle)]"}`}>ES</button><button aria-pressed={locale === "en"} onClick={() => setLocale("en")} className={`px-2.5 py-2 text-[10px] font-semibold ${locale === "en" ? "bg-teal-400/15 text-teal-200" : "text-[var(--subtle)]"}`}>EN</button></div>
            <ThemeToggle label={t("Toggle theme", "Cambiar tema")} />
            <button aria-label={t("Notifications", "Notificaciones")} className="relative grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)]"><Bell size={17} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-teal-300" /></button>
            <div className="ml-1 grid size-8 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-[10px] font-bold text-white">MC</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 md:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
