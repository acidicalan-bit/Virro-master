import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  FileCode2,
  Handshake,
  Network,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UserSearch,
  UsersRound,
} from "lucide-react";
import { DiagnosisRequestForm } from "@/components/landing/diagnosis-request-form";

const painCases = [
  "Historias de usuario ambiguas.",
  "Handoffs incompletos.",
  "Documentación técnica que nadie entiende.",
  "IA con contexto insuficiente.",
  "Vacantes técnicas mal interpretadas.",
  "Procesos internos difíciles de transferir.",
];

const flow = ["Información ambigua", "Understanding Event", "Meaning Loss Risk", "Preguntas críticas", "Scores estimados", "Output operativo", "Reporte ejecutivo"];

const areas = [
  { title: "Product Delivery", pain: "Cuando producto, desarrollo y QA ejecutan interpretaciones distintas.", icon: PackageCheck },
  { title: "AI Understanding", pain: "Cuando la IA recibe intención sin suficiente contexto operativo.", icon: Bot },
  { title: "Handoff Intelligence", pain: "Cuando el siguiente equipo recibe información, pero aún no puede actuar.", icon: Handshake },
  { title: "Technical Documentation", pain: "Cuando Confluence y los runbooks existen, pero no transfieren entendimiento.", icon: FileCode2 },
  { title: "Talent & Staffing", pain: "Cuando la necesidad real del rol se pierde entre cliente, consultora y candidato.", icon: UserSearch },
  { title: "Consulting Delivery", pain: "Cuando lo que el cliente quiso decir cambia antes de llegar a ejecución.", icon: Boxes },
  { title: "Process Understanding", pain: "Cuando decisiones y excepciones viven en conocimiento implícito.", icon: Network },
  { title: "Onboarding", pain: "Cuando un nuevo miembro accede al contenido, pero no entiende cómo operar.", icon: UsersRound },
];

const auditAreas = ["Producto / QA / desarrollo", "IA", "Documentación técnica", "Staffing", "Consultoras", "Handoffs", "Procesos", "Onboarding"];
const auditIncludes = ["3–5 Understanding Events del flujo", "Riesgos y contexto faltante", "Preguntas críticas", "Scores estimados", "Pack o piloto recomendado", "Reporte ejecutivo"];

const deliverables = [
  "Mapa del flujo crítico analizado.",
  "3 a 5 Understanding Events revisados.",
  "Riesgos principales de Meaning Loss.",
  "Contexto faltante y preguntas críticas.",
  "Scores estimados de entendimiento y readiness.",
  "Recomendación de audit, piloto o siguiente acción.",
  "Reporte ejecutivo listo para compartir.",
];

const buyerFit = [
  { role: "CTO / VP Engineering", pain: "Cuando documentación, handoffs o decisiones técnicas no llegan suficientemente claras." },
  { role: "CPO / Head of Product", pain: "Cuando historias, criterios, cambios o prioridades se interpretan distinto entre producto, diseño, desarrollo y QA." },
  { role: "Head of QA / Automation", pain: "Cuando matrices, bugs o requerimientos no están listos para probarse o automatizarse." },
  { role: "Head of AI / Transformación Digital", pain: "Cuando la IA responde genérico porque la empresa no comunica suficiente contexto operativo." },
  { role: "Directores de consultoras / staffing", pain: "Cuando briefs, vacantes, candidatos o entregables avanzan con pérdida de entendimiento." },
  { role: "COO / Operaciones", pain: "Cuando procesos internos son difíciles de transferir, explicar o automatizar." },
];

const staffingOutputs = ["Riesgos de Meaning Loss", "Preguntas críticas para el cliente", "Screening Readiness Score", "Candidate Handoff Readiness", "Recomendación de Talent & Staffing Understanding Audit"];

export function PublicLanding() {
  return <div className="min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
    <header className="sticky top-0 z-30 border-b border-white/[.06] bg-[rgba(8,11,16,.82)] backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-cyan-500 text-sm font-black text-slate-950">V</span><span><span className="block text-base font-semibold tracking-[-.03em]">Virro</span><span className="block text-[9px] uppercase tracking-[.16em] text-[var(--subtle)]">Operational Understanding</span></span></Link>
        <nav className="ml-auto hidden items-center gap-6 text-xs text-[var(--muted)] md:flex"><a href="#problema" className="hover:text-white">El problema</a><a href="#como-funciona" className="hover:text-white">Cómo funciona</a><a href="#audit" className="hover:text-white">Meaning Loss Audit</a></nav>
        <Link href="/app" className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[.035] px-3 text-[11px] font-medium md:ml-2">Ver demo enterprise <ArrowRight size={13} /></Link>
      </div>
    </header>

    <main>
      <section className="relative px-5 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,.10),transparent_68%)]" />
        <div className="relative mx-auto max-w-7xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-teal-400/15 bg-teal-400/[.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal-200"><Sparkles size={12} /> Infraestructura de entendimiento operativo</div>
          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-semibold leading-[1.05] tracking-[-.055em] sm:text-5xl md:text-7xl">Convierte comunicación, procesos y documentación en <span className="bg-gradient-to-r from-teal-200 to-cyan-400 bg-clip-text text-transparent">entendimiento operativo.</span></h1>
          <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">Virro detecta dónde una empresa podría estar perdiendo entendimiento antes de que eso se convierta en retrabajo, errores, fricción o desperdicio con IA.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><a href="#solicitar-diagnostico" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-300 px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(45,212,191,.14)]">Diagnosticar un flujo crítico <ArrowRight size={15} /></a><Link href="/app" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-6 text-sm font-medium">Ver demo enterprise</Link></div>
          <p className="mt-5 text-[10px] text-[var(--subtle)]">Los scores son estimaciones probabilísticas. Virro señala riesgo y contexto faltante; la decisión sigue siendo humana.</p>
        </div>
      </section>

      <section id="problema" className="border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rose-300">El costo invisible</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-4xl">La información puede existir y aun así no estar entendida.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)]">Muchas empresas no fallan solo por falta de talento, herramientas o esfuerzo. Fallan porque una información avanza sin estar suficientemente entendida por el siguiente equipo, proveedor, consultora, herramienta o sistema de IA.</p></div><div className="grid gap-3 sm:grid-cols-2">{painCases.map((pain, index) => <div key={pain} className="rounded-xl border border-white/[.07] bg-[var(--panel-soft)] p-4"><span className="text-[9px] font-semibold text-rose-300">0{index + 1}</span><p className="mt-2 text-xs font-medium">{pain}</p></div>)}</div></div>
      </section>

      <section id="como-funciona" className="px-5 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-teal-300">Cómo funciona</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em]">De información ambigua a evidencia para decidir.</h2></div><div className="mt-10 overflow-x-auto pb-3"><div className="flex min-w-[1040px] items-center gap-2">{flow.map((item, index) => <div key={item} className="contents"><div className="flex-1 rounded-xl border border-white/[.07] bg-[var(--panel-soft)] p-4"><span className="text-[9px] font-semibold text-teal-300">0{index + 1}</span><p className="mt-2 text-[11px] font-medium leading-4">{item}</p></div>{index < flow.length - 1 && <ArrowRight size={14} className="shrink-0 text-[var(--subtle)]" />}</div>)}</div></div></div></section>

      <section className="border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-300">Dónde actúa Virro</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em]">Un mismo problema de entendimiento, en distintos flujos críticos.</h2></div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{areas.map(({ title, pain, icon: Icon }) => <article key={title} className="rounded-2xl border border-white/[.07] bg-[var(--panel)] p-5"><span className="grid size-9 place-items-center rounded-xl bg-teal-400/[.08] text-teal-300"><Icon size={17} /></span><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{pain}</p></article>)}</div></div></section>

      <section id="audit" className="px-5 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-teal-400/15 bg-[linear-gradient(135deg,rgba(45,212,191,.075),rgba(56,189,248,.025)_50%,rgba(255,255,255,.018))] p-6 md:p-10 lg:p-14"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]"><div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-300 text-slate-950"><Braces size={18} /></span><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-teal-200">Oferta inicial</p></div><h2 className="mt-6 text-3xl font-semibold tracking-[-.045em] md:text-4xl">Meaning Loss Audit</h2><p className="mt-2 text-sm font-medium text-teal-100">Diagnóstico de pérdida de entendimiento en un flujo crítico.</p><p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Un diagnóstico corto para identificar dónde un flujo crítico está perdiendo entendimiento, qué contexto falta, qué riesgos existen y qué acción conviene tomar primero.</p><div className="mt-6 grid gap-2 sm:grid-cols-2">{auditIncludes.map((item) => <div key={item} className="flex items-center gap-2 text-[10px] text-[var(--muted)]"><CheckCircle2 size={12} className="shrink-0 text-teal-300" />{item}</div>)}</div><a href="#solicitar-diagnostico" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-teal-300 px-5 text-xs font-semibold text-slate-950">Diagnosticar un flujo crítico <ArrowRight size={14} /></a></div><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--subtle)]">Puede aplicarse a</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{auditAreas.map((area) => <div key={area} className="flex items-center gap-2 rounded-lg border border-white/[.07] bg-black/10 px-3 py-2.5 text-[10px] text-[var(--muted)]"><CheckCircle2 size={12} className="text-teal-300" />{area}</div>)}</div></div></div></div></section>

      <section className="border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-teal-300">Entregable del diagnóstico</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-4xl">Qué recibe tu equipo en un diagnóstico</h2><p className="mt-5 text-sm leading-7 text-[var(--muted)]">El diagnóstico no busca culpar personas. Busca detectar dónde una información puede perder entendimiento antes de convertirse en retrabajo.</p></div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{deliverables.map((item, index) => <div key={item} className="rounded-xl border border-white/[.07] bg-[var(--panel)] p-4"><span className="text-[9px] font-semibold text-teal-300">0{index + 1}</span><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item}</p></div>)}</div></div></section>

      <section className="px-5 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-300">Para quién es</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-4xl">Para equipos donde el entendimiento ya impacta la ejecución</h2></div><div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{buyerFit.map((item) => <article key={item.role} className="rounded-2xl border border-white/[.07] bg-[var(--panel)] p-5"><h3 className="text-sm font-semibold">{item.role}</h3><p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">{item.pain}</p></article>)}</div></div></section>

      <section className="border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rose-300">Antes / Con Virro</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-4xl">Ejemplo de pérdida de entendimiento</h2><p className="mt-3 text-sm font-medium text-white">Vacante técnica mal entendida</p></div><div className="mt-10 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-white/[.07] bg-[var(--panel)] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--subtle)]">Antes</p><blockquote className="mt-4 text-lg font-medium tracking-[-.02em]">“Necesitamos un QA Automation Senior.”</blockquote></article><article className="rounded-2xl border border-rose-400/15 bg-rose-400/[.035] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-rose-300">Problema</p><p className="mt-4 text-xs leading-6 text-[var(--muted)]">La solicitud parece clara, pero no define stack, autonomía, tipo de pruebas, ownership, CI/CD, idioma, dominio ni expectativa real del equipo receptor.</p></article><article className="rounded-2xl border border-teal-400/15 bg-teal-400/[.04] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-teal-300">Con Virro</p><p className="mt-4 text-xs leading-6 text-[var(--muted)]">Virro detecta brechas, preguntas críticas, riesgos de filtro por keywords y genera un Role Understanding Pack antes de activar búsqueda o presentar candidatos.</p></article></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{staffingOutputs.map((item) => <div key={item} className="flex items-start gap-2 rounded-lg border border-white/[.07] bg-black/10 p-3 text-[10px] leading-4 text-[var(--muted)]"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-teal-300" />{item}</div>)}</div></div></section>

      <DiagnosisRequestForm />

      <section className="border-y border-white/[.055] bg-white/[.018] px-5 py-16 md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-teal-400/15 bg-teal-400/[.05] text-teal-300"><ShieldCheck size={21} /></span><div><h2 className="text-xl font-semibold tracking-[-.03em]">Virro debe ser más confiable que inteligente.</h2><p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--muted)]">Virro no guarda texto privado crudo por defecto. No está diseñado para vigilar empleados ni evaluar desempeño personal: analiza riesgos de entendimiento en información operativa. Los scores son estimaciones probabilísticas, no garantías.</p></div></div></section>

      <section className="px-5 py-24 text-center md:px-8 md:py-32"><div className="mx-auto max-w-3xl"><h2 className="text-3xl font-semibold tracking-[-.045em] md:text-5xl">Evalúa un flujo donde tu empresa está perdiendo entendimiento.</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)]">Empieza por un dolor real. Virro ayuda a convertirlo en evidencia, preguntas críticas y una primera acción operativa.</p><a href="#solicitar-diagnostico" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-teal-300 px-6 text-sm font-semibold text-slate-950">Diagnosticar un flujo crítico <ArrowRight size={15} /></a></div></section>
    </main>

    <footer className="border-t border-white/[.055] px-5 py-8 md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-[10px] text-[var(--subtle)] sm:flex-row sm:items-center sm:justify-between"><p>Virro · Infraestructura de entendimiento operativo</p><div className="flex gap-4"><Link href="/app/privacy-trust">Privacidad y confianza</Link><Link href="/app">Demo enterprise</Link></div></div></footer>
  </div>;
}
