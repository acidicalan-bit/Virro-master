"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { modules } from "@/lib/config/modules";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text)]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[var(--border)] px-5">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-cyan-500 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(45,212,191,.18)]">V</div>
            <div><p className="text-[17px] font-semibold tracking-[-0.03em]">Virro</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">Enterprise</p></div>
          </Link>
          <button aria-label="Close navigation" className="rounded-lg p-2 text-[var(--muted)] lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--subtle)]">Understanding system</p>
          <div className="space-y-0.5">
            {modules.filter((module) => module.showInNavigation !== false).map((module) => {
              const active = module.href === "/" ? pathname === "/" : pathname.startsWith(module.href);
              const Icon = module.icon;
              return (
                <div key={module.id}>
                  {module.id === "product-delivery" && <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--subtle)]">Analysis packs</p>}
                  {module.id === "reports" && <div className="my-3 border-t border-[var(--border)]" />}
                  <Link href={module.href} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${active ? "bg-[var(--active)] font-medium text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"}`}>
                    <Icon size={17} strokeWidth={active ? 2 : 1.7} className={active ? "text-teal-300" : "text-[var(--subtle)] group-hover:text-[var(--muted)]"} />
                    <span>{module.label}</span>
                    {module.id === "inbox" && <span className="ml-auto rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300">12</span>}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex items-center justify-between text-xs"><span className="text-[var(--muted)]">Workspace health</span><span className="font-semibold text-teal-300">74</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className="h-full w-[74%] rounded-full bg-gradient-to-r from-cyan-400 to-teal-300" /></div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--subtle)]">Estimated from 128 active understanding signals.</p>
          </div>
        </div>
      </aside>
      {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-[var(--border)] bg-[color:var(--header)] px-4 backdrop-blur-xl md:px-7">
          <button aria-label="Open navigation" className="rounded-lg p-2 text-[var(--muted)] lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <button className="flex min-w-0 items-center gap-2 text-left">
            <div className="hidden size-7 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[10px] font-bold text-teal-300 sm:grid">AP</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">Aperture Systems</p><p className="hidden text-[10px] text-[var(--subtle)] sm:block">Enterprise workspace</p></div>
            <ChevronDown size={14} className="text-[var(--subtle)]" />
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs text-[var(--subtle)] transition hover:text-[var(--text)] md:flex"><Search size={15} /> Search events <kbd className="ml-6 text-[10px]">⌘ K</kbd></button>
            <button aria-label="Toggle theme" onClick={() => setDark((value) => !value)} className="grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)]">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)]"><Bell size={17} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-teal-300" /></button>
            <div className="ml-1 grid size-8 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-[10px] font-bold text-white">MC</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 md:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
