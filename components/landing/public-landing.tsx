import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleAlert,
  FileBarChart,
  FileCode2,
  Handshake,
  Inbox,
  Layers3,
  LockKeyhole,
  Network,
  PackageCheck,
  ShieldCheck,
  UserSearch,
  UsersRound,
} from "lucide-react";
import { DiagnosisRequestForm } from "@/components/landing/diagnosis-request-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const understandingFlow = [
  "Información ambigua",
  "Understanding Event",
  "Meaning Loss Risk",
  "Preguntas críticas",
  "Scores estimados",
  "Output operativo",
  "Reporte ejecutivo",
];

const problemCards = [
  {
    title: "Humanos interpretando distinto",
    text: "La misma información puede convertirse en acciones distintas según rol, contexto o receptor.",
    icon: UsersRound,
  },
  {
    title: "Herramientas con datos, no claridad",
    text: "Jira, Confluence o Slack pueden almacenar información sin transferir entendimiento operativo.",
    icon: Boxes,
  },
  {
    title: "IA con contexto incompleto",
    text: "La IA responde mejor cuando recibe intención, contexto, restricciones y criterios claros.",
    icon: Bot,
  },
  {
    title: "Deuda de Entendimiento Colectivo",
    text: "Cuando la información avanza sin estar entendida, la organización acumula fricción invisible.",
    icon: Network,
  },
];

const layerFunctions = [
  "Detecta intención",
  "Clasifica Understanding Events",
  "Identifica Meaning Loss",
  "Propone preguntas críticas",
  "Estima readiness",
  "Genera outputs operativos",
  "Alimenta reports",
];

const operationalOutcomes = [
  "Más claridad antes de ejecutar",
  "Menos pérdida de entendimiento",
  "Menos fricción entre equipos",
  "Menos desperdicio de contexto con IA",
  "Mejores handoffs",
  "Mejor transferencia hacia acción",
];

const credibilityFlows = [
  { title: "Product Delivery", text: "Historias, criterios, bugs y handoffs que deben llegar listos para ejecución.", icon: PackageCheck },
  { title: "AI Adoption", text: "Contexto operativo y límites para reducir outputs genéricos o supuestos débiles.", icon: Bot },
  { title: "Technical Documentation", text: "Arquitectura y runbooks que otro equipo necesita entender para actuar.", icon: FileCode2 },
  { title: "Talent & Staffing", text: "Necesidades de rol y candidatos que deben conservar contexto entre receptores.", icon: UserSearch },
  { title: "Consulting Delivery", text: "Briefs y decisiones que no deberían degradarse antes de llegar al equipo ejecutor.", icon: Handshake },
  { title: "Operations & Process", text: "Procesos, excepciones y ownership que deben transferirse o automatizarse.", icon: Network },
];

const buyerRoles = [
  "CTO",
  "CPO",
  "Head of QA",
  "Head of AI",
  "VP Engineering",
  "Delivery Director",
  "Founder de consultora",
  "Talent / Staffing Director",
  "COO",
];

const auditInputs = [
  "Tickets e historias",
  "Handoffs",
  "Documentación",
  "Instrucciones para IA",
  "Vacantes y briefs",
  "Procesos o reportes",
];

const auditDeliverables = [
  "Riesgos de Meaning Loss",
  "Contexto faltante",
  "Preguntas críticas",
  "Scores estimados",
  "Recomendación de pack o piloto",
  "Reporte ejecutivo",
];

const auditAreas = [
  "Product Delivery",
  "AI Understanding",
  "Technical Documentation",
  "Talent & Staffing",
  "Consulting Delivery",
  "Process Understanding",
  "Onboarding",
  "Handoff Intelligence",
];

export function PublicLanding() {
  return (
    <div className="public-landing min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
      <header className="landing-header sticky top-0 z-30 border-b border-white/[.06] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-5 md:px-8">
          <Link href="/" className="virro-brand flex shrink-0 items-center gap-2" aria-label="Virro, inicio">
            <Image src="/brand/virro-icon.svg" alt="" width={31} height={25} priority className="h-auto w-[29px] object-contain" />
            <span className="text-lg font-semibold tracking-[-.045em]">Virro</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-[11px] text-[var(--muted)] lg:flex" aria-label="Navegación pública">
            <a href="#categoria" className="transition hover:text-[var(--text)]">Categoría</a>
            <a href="#arquitectura" className="transition hover:text-[var(--text)]">Arquitectura</a>
            <a href="#producto" className="transition hover:text-[var(--text)]">Producto</a>
            <a href="#audit" className="transition hover:text-[var(--text)]">Meaning Loss Audit</a>
          </nav>
          <ThemeToggle />
          <a href="#audit" className="brand-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition lg:ml-2">Diagnosticar flujo <ArrowRight size={13} /></a>
        </div>
      </header>

      <main>
        <section id="categoria" className="relative px-5 pb-24 pt-16 md:px-8 md:pb-32 md:pt-24">
          <div className="pointer-events-none absolute left-[12%] top-0 h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,.10),transparent_68%)]" />
          <div className="pointer-events-none absolute right-[-8%] top-[12%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,.07),transparent_68%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/15 bg-teal-400/[.05] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-teal-200">
                <Layers3 size={12} /> Operating Understanding Layer
              </div>
              <h1 className="mt-7 max-w-4xl text-[2.65rem] font-semibold leading-[1.02] tracking-[-.058em] sm:text-6xl lg:text-[4.4rem]">
                The Operating Understanding Layer for Modern Organizations.
              </h1>
              <p className="mt-6 text-base font-medium tracking-[-.02em] text-teal-100 md:text-lg">La capa de entendimiento operativo para organizaciones modernas.</p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-[15px]">
                Virro es la infraestructura invisible que ayuda a que personas, equipos, herramientas e IA entiendan mejor la comunicación digital antes de convertirla en trabajo, decisión o automatización.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#audit" className="brand-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold shadow-[0_20px_60px_rgba(9,105,255,.18)] transition">
                  Diagnosticar un flujo crítico <ArrowRight size={15} />
                </a>
                <Link href="/app" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-6 text-sm font-medium transition hover:border-white/20 hover:bg-white/[.06]">
                  Ver demo enterprise
                </Link>
              </div>
              <p className="mt-5 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-[var(--subtle)]">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-teal-300" />
                Scores estimados · No son garantías · No evalúan personas
              </p>
            </div>
            <HeroProductPreview />
          </div>
        </section>

        <section id="problema" className="border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow="El costo invisible" title="La información puede existir y aun así no estar entendida." tone="rose">
              <p>Cuando la comunicación digital se degrada entre personas, equipos, herramientas e IA, la operación acumula fricción, costo y <strong className="font-medium text-[var(--text)]">Deuda de Entendimiento Colectivo</strong>.</p>
              <p>Virro ayuda a detectar esa pérdida antes de que se convierta en retrabajo, errores, mala ejecución, documentación inútil, mala contratación o desperdicio con IA.</p>
            </SectionIntro>
            <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {problemCards.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-2xl border border-white/[.07] bg-[var(--panel)] p-5 shadow-[0_18px_55px_rgba(0,0,0,.08)]">
                  <span className="grid size-9 place-items-center rounded-xl border border-white/[.06] bg-white/[.025] text-rose-300"><Icon size={17} /></span>
                  <h3 className="mt-4 text-sm font-semibold tracking-[-.02em]">{title}</h3>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="px-5 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow="Cómo funciona" title="De información ambigua a evidencia para decidir.">
              <p>Virro convierte cada punto donde una información necesita ser entendida en un evento observable, analizable y revisable por personas.</p>
            </SectionIntro>
            <div className="mt-9 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
              {understandingFlow.map((item, index) => (
                <div key={item} className="relative rounded-xl border border-white/[.07] bg-[var(--panel-soft)] p-4">
                  <span className="text-[9px] font-semibold text-teal-300">0{index + 1}</span>
                  <p className="mt-2 text-[10px] font-medium leading-4">{item}</p>
                  {index < understandingFlow.length - 1 && <ArrowRight size={12} className="absolute -right-[7px] top-1/2 z-10 hidden -translate-y-1/2 text-[var(--subtle)] lg:block" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <ArchitectureDiagram />

        <section id="producto" className="px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <SectionIntro eyebrow="Producto visible" title="Cómo se ve Virro en acción.">
                <p>Un workspace demo muestra cómo Virro transforma información ambigua en Understanding Events, riesgos, preguntas críticas, scores y reportes ejecutivos.</p>
              </SectionIntro>
              <div className="flex flex-wrap gap-2">
                <Link href="/app/demo-scenarios" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[.025] px-4 text-[10px] font-semibold transition hover:border-white/20">Explorar escenarios demo <ArrowRight size={12} /></Link>
                <Link href="/app/reports" className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-400/15 bg-teal-400/[.05] px-4 text-[10px] font-semibold text-teal-200 transition hover:bg-teal-400/[.08]">Ver reporte ejecutivo <ArrowRight size={12} /></Link>
              </div>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <ProductPreviewCard kind="dashboard" title="Tablero ejecutivo" text="Dónde se concentra la pérdida de entendimiento, por área, riesgo y readiness." href="/app" />
              <ProductPreviewCard kind="assistant" title="Asistente de Entendimiento" text="Convierte información ambigua en un Understanding Event auditable." href="/app/inbox" />
              <ProductPreviewCard kind="report" title="Reporte ejecutivo" text="Resume riesgos, contexto faltante, scores estimados y recomendaciones de siguiente acción." href="/app/reports" />
            </div>
          </div>
        </section>

        <section className="border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow="Credibilidad sin claims artificiales" title="Diseñado para flujos donde el entendimiento operativo es crítico.">
              <p>Virro no reemplaza las herramientas existentes. Ayuda a revisar si la información que circula entre ellas conserva suficiente contexto para que el siguiente receptor pueda actuar.</p>
            </SectionIntro>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {credibilityFlows.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-2xl border border-white/[.07] bg-[var(--panel)] p-5">
                  <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-teal-400/[.07] text-teal-300"><Icon size={15} /></span><h3 className="text-sm font-semibold">{title}</h3></div>
                  <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-white/[.07] bg-[var(--panel-soft)] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--subtle)]">Perfiles para los que fue diseñado</p>
              <div className="mt-4 flex flex-wrap gap-2">{buyerRoles.map((role) => <span key={role} className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[9px] text-[var(--muted)]">{role}</span>)}</div>
              <p className="mt-5 border-t border-white/[.06] pt-4 text-[10px] leading-5 text-[var(--subtle)]">Virro está siendo construido para pilotos, feedback privado y diagnósticos de flujo crítico. No usamos logos ni métricas de clientes sin autorización.</p>
            </div>
          </div>
        </section>

        <section id="audit" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-teal-400/15 bg-[linear-gradient(135deg,rgba(45,212,191,.075),rgba(56,189,248,.02)_52%,rgba(255,255,255,.018))] shadow-[0_35px_110px_rgba(0,0,0,.16)]">
            <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[.78fr_1.22fr] lg:p-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/15 bg-teal-400/[.06] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.14em] text-teal-200"><Braces size={12} /> Oferta inicial</div>
                <h2 className="mt-6 text-3xl font-semibold tracking-[-.045em] md:text-5xl">Meaning Loss Audit</h2>
                <p className="mt-3 text-sm font-medium text-teal-100">Diagnóstico de pérdida de entendimiento en un flujo crítico.</p>
                <p className="mt-5 max-w-xl text-xs leading-6 text-[var(--muted)]">Revisamos de 3 a 5 Understanding Events para detectar señales de pérdida, contexto faltante, preguntas críticas y la siguiente acción que conviene validar.</p>
                <a href="#solicitar-diagnostico" className="brand-primary-button mt-7 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-semibold transition">Solicitar diagnóstico <ArrowRight size={14} /></a>
                <p className="mt-4 max-w-md text-[10px] leading-5 text-[var(--subtle)]">No necesitas saber qué pack elegir. Empieza describiendo el flujo donde hoy se pierde claridad.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <AuditColumn title="Qué analizamos" items={auditInputs} />
                <AuditColumn title="Qué entregamos" items={auditDeliverables} />
                <AuditColumn title="Por dónde puede entrar" items={auditAreas} />
              </div>
            </div>
            <div className="grid gap-3 border-t border-teal-300/10 bg-black/10 px-6 py-4 text-[9px] leading-4 text-[var(--subtle)] md:grid-cols-3 md:px-10 lg:px-14">
              <p className="flex items-start gap-2"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-teal-300" />Virro no evalúa personas. Evalúa riesgos de entendimiento en información operativa.</p>
              <p className="flex items-start gap-2"><CircleAlert size={12} className="mt-0.5 shrink-0 text-teal-300" />Los scores son estimaciones probabilísticas, no garantías.</p>
              <p className="flex items-start gap-2"><LockKeyhole size={12} className="mt-0.5 shrink-0 text-teal-300" />No compartas información sensible antes de definir privacidad y alcance.</p>
            </div>
          </div>
        </section>

        <DiagnosisRequestForm />

        <section className="border-y border-white/[.055] bg-white/[.018] px-5 py-14 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-teal-400/15 bg-teal-400/[.05] text-teal-300"><ShieldCheck size={20} /></span>
            <div>
              <h2 className="text-xl font-semibold tracking-[-.03em]">Virro debe ser más confiable que inteligente.</h2>
              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--muted)]">Virro no guarda texto privado crudo por defecto. No está diseñado para vigilar empleados ni evaluar desempeño personal. Los scores son estimaciones probabilísticas para apoyar criterio humano.</p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto max-w-3xl">
            <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-teal-300">Operating Understanding Layer</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-5xl">Empieza por un flujo donde hoy se pierde claridad.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)]">Virro puede ayudar a convertir ese dolor en evidencia, preguntas críticas y una primera recomendación operativa.</p>
            <a href="#audit" className="brand-primary-button mt-7 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition">Diagnosticar un flujo crítico <ArrowRight size={15} /></a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[.055] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[10px] text-[var(--subtle)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="virro-brand flex items-center gap-2"><Image src="/brand/virro-icon.svg" alt="" width={26} height={21} className="h-auto w-6 object-contain" /><span className="text-sm font-semibold tracking-[-.035em] text-[var(--text)]">Virro</span></span><span>Operating Understanding Layer</span></div>
          <div className="flex flex-wrap gap-4"><Link href="/app/privacy-trust">Privacidad y confianza</Link><Link href="/app/reports">Reporte ejecutivo</Link><Link href="/app">Demo enterprise</Link></div>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, tone = "teal", children }: { eyebrow: string; title: string; tone?: "teal" | "rose"; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className={`text-[9px] font-semibold uppercase tracking-[.16em] ${tone === "rose" ? "text-rose-300" : "text-teal-300"}`}>{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] md:text-4xl">{title}</h2>
      <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">{children}</div>
    </div>
  );
}

function HeroProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[610px] lg:mx-0">
      <div className="visual-dark rounded-[24px] border border-white/[.09] bg-[linear-gradient(145deg,rgba(18,24,33,.98),rgba(10,14,20,.98))] p-3 text-[#f2f5f7] shadow-[0_40px_120px_rgba(0,0,0,.34)] sm:p-4">
        <div className="flex items-center justify-between border-b border-white/[.06] px-2 pb-3">
          <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-lg bg-teal-300 text-[9px] font-black text-slate-950">V</span><span className="text-[10px] font-semibold">Aperture Systems</span></div>
          <span className="rounded-full border border-sky-400/15 bg-sky-400/[.05] px-2.5 py-1 text-[8px] font-semibold text-sky-200">Demo preview · Datos simulados</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <PreviewMetric label="DoU Score" value="68" tone="teal" />
          <PreviewMetric label="Meaning Loss" value="34" tone="rose" />
          <PreviewMetric label="Handoffs en riesgo" value="1" tone="amber" />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-4">
            <div className="flex items-center justify-between"><p className="text-[9px] font-semibold">Riesgo por área</p><ChartNoAxesCombined size={13} className="text-teal-300" /></div>
            <div className="mt-4 space-y-3">
              <RiskBar label="Documentación técnica" value={61} tone="rose" />
              <RiskBar label="Handoff Intelligence" value={38} tone="amber" />
              <RiskBar label="Product Delivery" value={24} tone="teal" />
            </div>
          </div>
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-4">
            <p className="text-[9px] font-semibold">Siguiente acción</p>
            <div className="mt-3 rounded-lg border border-teal-400/15 bg-teal-400/[.045] p-3">
              <p className="text-[8px] uppercase tracking-[.1em] text-teal-300">UE-2479</p>
              <p className="mt-2 text-[10px] font-medium leading-4">Resolver ownership de rollback antes de migrar consumidores.</p>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[8px] text-[var(--subtle)]"><ShieldCheck size={10} className="text-teal-300" /> Estimación · requiere validación humana</div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-7 -left-4 hidden w-48 rounded-xl border border-indigo-400/15 bg-[#111620] p-3 shadow-[0_20px_60px_rgba(0,0,0,.32)] sm:block">
        <div className="flex items-center gap-2"><Inbox size={12} className="text-indigo-300" /><p className="text-[8px] font-semibold uppercase tracking-[.1em] text-indigo-300">Understanding Event</p></div>
        <p className="mt-2 text-[10px] font-medium">Handoff no listo para QA</p>
        <p className="mt-1 text-[8px] text-[var(--subtle)]">3 preguntas críticas detectadas</p>
      </div>
      <div className="absolute -right-3 -top-6 hidden w-44 rounded-xl border border-teal-400/15 bg-[#111620] p-3 shadow-[0_20px_60px_rgba(0,0,0,.32)] md:block">
        <div className="flex items-center gap-2"><FileBarChart size={12} className="text-teal-300" /><p className="text-[8px] font-semibold uppercase tracking-[.1em] text-teal-300">Executive Report</p></div>
        <p className="mt-2 text-[10px] font-medium">Meaning Loss Audit</p>
        <p className="mt-1 text-[8px] text-[var(--subtle)]">Riesgos · contexto · siguiente acción</p>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value, tone }: { label: string; value: string; tone: "teal" | "rose" | "amber" }) {
  const colors = { teal: "text-teal-300", rose: "text-rose-300", amber: "text-amber-300" };
  return <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><p className="text-[8px] text-[var(--subtle)]">{label}</p><p className={`mt-1 text-2xl font-semibold tracking-[-.04em] ${colors[tone]}`}>{value}<span className="ml-1 text-[8px] font-normal text-[var(--subtle)]">{label === "Handoffs en riesgo" ? "" : "/100"}</span></p></div>;
}

function RiskBar({ label, value, tone }: { label: string; value: number; tone: "teal" | "rose" | "amber" }) {
  const colors = { teal: "bg-teal-300", rose: "bg-rose-400", amber: "bg-amber-300" };
  return <div><div className="flex justify-between gap-2 text-[8px] text-[var(--muted)]"><span>{label}</span><span>{value}</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.06]"><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${value}%` }} /></div></div>;
}

function ArchitectureDiagram() {
  const interactors = [
    { title: "Personas", items: ["Producto", "Dev", "QA", "Arquitectura", "Operaciones", "Staffing"], icon: UsersRound },
    { title: "Herramientas", items: ["Jira", "Confluence", "Slack", "Docs", "ATS", "CRM"], icon: Boxes },
    { title: "IA", items: ["ChatGPT", "Copilot", "Gemini", "Agentes internos", "Automatizaciones"], icon: Bot },
  ];
  return (
    <section id="arquitectura" className="brand-architecture border-y border-white/[.055] bg-white/[.018] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Arquitectura organizacional" title="Dónde vive Virro dentro de la operación moderna.">
          <p>Virro no reemplaza tus herramientas. Vive entre la comunicación digital y la ejecución para ayudar a que la información llegue mejor entendida.</p>
        </SectionIntro>
        <div className="mt-10 rounded-[28px] border border-white/[.07] bg-[var(--panel)] p-4 shadow-[0_28px_90px_rgba(0,0,0,.15)] md:p-7">
          <div className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4 md:p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--subtle)]">Capa superior · Interactores</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {interactors.map(({ title, items, icon: Icon }) => <div key={title} className="rounded-xl border border-white/[.06] bg-black/10 p-4"><div className="flex items-center gap-2"><Icon size={14} className="text-cyan-300" /><p className="text-xs font-semibold">{title}</p></div><div className="mt-3 flex flex-wrap gap-1.5">{items.map((item) => <span key={item} className="rounded-md border border-white/[.06] bg-white/[.025] px-2 py-1 text-[8px] text-[var(--muted)]">{item}</span>)}</div></div>)}
            </div>
          </div>
          <LayerConnector />
          <div className="architecture-core rounded-2xl border p-5 md:p-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-teal-300">Capa intermedia</p><h3 className="mt-2 text-xl font-semibold tracking-[-.03em]">Virro — Operating Understanding Layer</h3><p className="mt-3 max-w-3xl text-xs leading-6 text-[var(--muted)]">La capa que procesa, aclara, clasifica, estructura y valida si la información está lista para que otra persona, equipo, herramienta o IA pueda actuar.</p></div><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-300 text-slate-950"><Layers3 size={19} /></span></div>
            <div className="mt-5 flex flex-wrap gap-2">{layerFunctions.map((item) => <span key={item} className="rounded-lg border border-teal-300/15 bg-black/10 px-3 py-2 text-[9px] text-teal-100">{item}</span>)}</div>
          </div>
          <LayerConnector />
          <div className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4 md:p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--subtle)]">Capa inferior · Resultados operativos</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{operationalOutcomes.map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/[.06] bg-black/10 px-3 py-3 text-[10px] text-[var(--muted)]"><CheckCircle2 size={12} className="shrink-0 text-teal-300" />{item}</div>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LayerConnector() {
  return <div className="flex h-12 items-center justify-center"><div className="h-7 w-px bg-gradient-to-b from-white/[.04] to-teal-300/40" /><ArrowDown size={14} className="-ml-[7px] mt-8 text-teal-300" /></div>;
}

function ProductPreviewCard({ kind, title, text, href }: { kind: "dashboard" | "assistant" | "report"; title: string; text: string; href: string }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/[.075] bg-[var(--panel)] shadow-[0_24px_75px_rgba(0,0,0,.12)] transition duration-300 hover:-translate-y-1 hover:border-white/[.13]">
      <div className="border-b border-white/[.06] bg-[var(--panel-soft)] p-3">
        <div className="flex items-center justify-between"><span className="text-[8px] font-semibold uppercase tracking-[.12em] text-[var(--subtle)]">Demo preview · Datos simulados</span><span className="size-1.5 rounded-full bg-teal-300" /></div>
        <div className="visual-dark text-[#f2f5f7]"><ProductMiniature kind={kind} /></div>
      </div>
      <div className="p-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{text}</p>
        <Link href={href} className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-teal-300">Abrir en demo <ArrowRight size={12} className="transition group-hover:translate-x-0.5" /></Link>
      </div>
    </article>
  );
}

function ProductMiniature({ kind }: { kind: "dashboard" | "assistant" | "report" }) {
  if (kind === "dashboard") return <div className="mt-3 grid h-40 grid-cols-[.3fr_.7fr] gap-2 rounded-xl border border-white/[.06] bg-[#090d13] p-3"><div className="space-y-2 border-r border-white/[.05] pr-2">{["Dashboard", "Inbox", "Packs", "Reports"].map((item, index) => <div key={item} className={`rounded px-2 py-1.5 text-[7px] ${index === 0 ? "bg-teal-400/[.08] text-teal-200" : "text-[var(--subtle)]"}`}>{item}</div>)}</div><div><div className="grid grid-cols-3 gap-1.5">{["68", "34", "1"].map((value, index) => <div key={value} className="rounded-md border border-white/[.05] p-2"><p className={`text-sm font-semibold ${index === 1 ? "text-rose-300" : "text-teal-300"}`}>{value}</p><div className="mt-1 h-1 rounded bg-white/[.05]" /></div>)}</div><div className="mt-2 h-[70px] rounded-md border border-white/[.05] p-2"><div className="space-y-2"><RiskBar label="Technical" value={61} tone="rose" /><RiskBar label="Handoff" value={38} tone="amber" /></div></div></div></div>;
  if (kind === "assistant") return <div className="mt-3 h-40 rounded-xl border border-white/[.06] bg-[#090d13] p-3"><div className="flex gap-1">{[1,2,3,4,5].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step < 4 ? "bg-teal-300/60" : "bg-white/[.06]"}`} />)}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-md border border-white/[.05] p-2"><p className="text-[7px] text-[var(--subtle)]">Pack recomendado</p><p className="mt-1 text-[9px] font-semibold text-indigo-300">Handoff Intelligence</p></div><div className="rounded-md border border-white/[.05] p-2"><p className="text-[7px] text-[var(--subtle)]">Meaning Loss</p><p className="mt-1 text-[9px] font-semibold text-rose-300">63 / 100</p></div></div><div className="mt-2 rounded-md border border-white/[.05] p-2"><p className="text-[7px] text-[var(--subtle)]">Preguntas críticas</p><div className="mt-1.5 space-y-1">{["Receptor final", "Acción esperada", "Contexto no asumible"].map((item) => <div key={item} className="flex items-center gap-1.5 text-[7px] text-[var(--muted)]"><span className="size-1 rounded-full bg-teal-300" />{item}</div>)}</div></div></div>;
  return <div className="mt-3 h-40 rounded-xl border border-white/[.06] bg-[#090d13] p-3"><div className="flex items-center justify-between border-b border-white/[.05] pb-2"><div><p className="text-[7px] text-teal-300">VIRRO ENTERPRISE REPORT</p><p className="mt-1 text-[9px] font-semibold">Meaning Loss Audit</p></div><span className="grid size-6 place-items-center rounded bg-teal-300 text-[8px] font-black text-slate-950">V</span></div><div className="mt-2 grid grid-cols-3 gap-1.5">{["Resumen", "Riesgos", "Scores"].map((item, index) => <div key={item} className="rounded border border-white/[.05] p-2"><p className="text-[7px] text-[var(--subtle)]">0{index + 1}</p><p className="mt-1 text-[8px]">{item}</p></div>)}</div><div className="mt-2 rounded border border-teal-400/10 bg-teal-400/[.03] p-2"><p className="text-[7px] text-teal-300">Siguiente acción</p><div className="mt-1 h-1.5 w-4/5 rounded bg-white/[.06]" /><div className="mt-1 h-1.5 w-3/5 rounded bg-white/[.06]" /></div></div>;
}

function AuditColumn({ title, items }: { title: string; items: string[] }) {
  return <article className="rounded-2xl border border-white/[.07] bg-black/10 p-4"><h3 className="text-[9px] font-semibold uppercase tracking-[.12em] text-teal-200">{title}</h3><div className="mt-4 space-y-2.5">{items.map((item) => <div key={item} className="flex items-start gap-2 text-[9px] leading-4 text-[var(--muted)]"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-teal-300" />{item}</div>)}</div></article>;
}
