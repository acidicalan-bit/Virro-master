import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, Eye, Layers3, Sparkles } from "lucide-react";

import { BeforeAfter } from "@/components/before-after";
import { FAQ } from "@/components/faq";
import { MotorVirro } from "@/components/motor-virro";
import { OpportunityCalculator } from "@/components/opportunity-calculator";
import { SectorShowcase } from "@/components/sector-showcase";
import { Button } from "@/components/ui/button";
import { cases } from "@/content/site";

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero section">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">VIRRO IMPULSA · CDMX</span>
            <h1 className="display">Transformamos cómo se ve, <span>trabaja y vende</span> tu negocio.</h1>
            <p className="lead">Diseño, tecnología y acompañamiento en un solo sistema. Vemos dónde estás, hacemos visible una siguiente versión e implementamos solo lo que necesitas para avanzar.</p>
            <div className="actions"><Button asChild variant="acid" size="lg"><Link href="/diagnostico">Quiero ver mi negocio transformado <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/transformaciones">Explorar transformaciones</Link></Button></div>
            <p className="micro" style={{ marginTop: 18 }}>Diagnóstico breve · Sin promesas de ventas · Sin obligación de contratar todo</p>
          </div>
          <div className="hero-stage" aria-label="Vista conceptual de una transformación física, digital y operativa">
            <div className="orbit one" /><div className="orbit two" />
            <div className="stage-card stage-store"><div className="stage-storefront"><div className="store-mark"><span>CAFÉ JACARANDA</span><span>CDMX · 2026</span></div><div className="store-window">Una marca que se reconoce.</div><div className="store-footer"><span>Menú · Pedidos · Lealtad</span><span>VIRRO STUDIO</span></div></div></div>
            <div className="stage-card stage-phone"><div className="phone-screen"><div className="phone-bar" /><span className="phone-chip">ABIERTO AHORA</span><h3>Tu café de barrio, listo para encontrarte.</h3><p>Menú claro, pedido simple y una razón para volver.</p><div className="phone-button">Hacer un pedido →</div></div></div>
            <div className="stage-card stage-flow"><div className="flow-head"><span>Recorrido coordinado</span><span>VIRRO SYSTEMS</span></div><div className="flow-track">{[["01","Encontrar"],["02","Confiar"],["03","Pedir"],["04","Volver"]].map(([n,label]) => <div className="flow-step" key={n}>{n}<strong>{label}</strong></div>)}</div></div>
          </div>
        </div>
      </section>

      <section className="section section-rule">
        <div className="shell">
          <span className="eyebrow">La brecha</span><h2 className="section-title">Tu negocio no necesita diez proveedores. Necesita que las piezas trabajen juntas.</h2><p className="lead">Una pieza aislada puede verse bien. El cambio ocurre cuando imagen, atención, venta, operación y adopción continúan el mismo recorrido.</p>
          <div className="bento">
            <article className="bento-card" style={{ "--tone": "#ff7a59" } as React.CSSProperties}><span className="bento-index">01 · SER VISTO</span><div className="bento-signal" /><h3>Una identidad que cruza la puerta.</h3><p>Logo, establecimiento, promociones y canales digitales hablando con una sola voz.</p></article>
            <article className="bento-card" style={{ "--tone": "#69d9ff" } as React.CSSProperties}><span className="bento-index">02 · CONTINUAR</span><div className="bento-signal" /><h3>De la atención a un proceso que no se pierde.</h3><p>Web, WhatsApp, agenda, seguimiento y automatización conectados a una acción real.</p></article>
            <article className="bento-card" style={{ "--tone": "#d8ff5b" } as React.CSSProperties}><span className="bento-index">03 · ADOPTAR</span><div className="bento-signal" /><h3>Tecnología que el equipo sí puede usar.</h3><p>Capacitación por rol, manuales breves y práctica sobre las herramientas implementadas.</p></article>
            <article className="bento-card" style={{ "--tone": "#9a7cff" } as React.CSSProperties}><span className="bento-index">04 · PRIORIZAR</span><div className="bento-signal" /><h3>Ahora. Después. Todavía no.</h3><p>La ruta protege tu presupuesto y evita construir complejidad antes de que la operación pueda sostenerla.</p></article>
          </div>
        </div>
      </section>

      <section className="section section-rule" id="motor">
        <div className="shell"><span className="eyebrow">El Motor Virro</span><h2 className="section-title">Tres capacidades. Un solo motor para hacer avanzar tu negocio.</h2><p className="lead">Activa los anillos. Combínalos. Mira cómo cambia el resultado cuando la transformación se diseña como sistema.</p><MotorVirro /></div>
      </section>

      <section className="section section-rule">
        <div className="shell"><span className="eyebrow">Transformación visual</span><h2 className="section-title">No solo cambiamos una fachada. Convertimos tu negocio en una marca reconocible.</h2><p className="lead">Primero lo visualizamos. Después coordinamos únicamente lo que el negocio permite, necesita y puede pagar.</p><BeforeAfter /></div>
      </section>

      <section className="section section-rule">
        <div className="shell"><div className="section-heading-row"><div><span className="eyebrow">Portafolio conceptual</span><h2 className="section-title">No imagines la transformación. Explórala.</h2></div><Button asChild variant="outline"><Link href="/transformaciones">Ver todas <ArrowUpRight /></Link></Button></div><div className="case-grid">{cases.slice(0,3).map((item) => <Link className="case-card" href={`/transformaciones/${item.slug}`} key={item.slug} style={{ "--case": item.color } as React.CSSProperties}><div className="case-visual"><span className="case-label">{item.label}</span></div><div className="case-body"><small>{item.sector}</small><h3>{item.name}</h3><p>{item.after}</p></div></Link>)}</div><p className="micro" style={{ marginTop: 16 }}>Proyectos conceptuales para demostrar capacidades. No representan clientes ni resultados obtenidos.</p></div>
      </section>

      <section className="section section-rule">
        <div className="shell"><span className="eyebrow">Tu negocio digital en vivo</span><h2 className="section-title">Una demo cambia con el giro. La lógica sigue siendo clara.</h2><p className="lead">Prueba cómo una persona podría encontrar, comprender, preguntar, reservar o pedir y volver.</p><div style={{ marginTop: 48 }}><SectorShowcase /></div></div>
      </section>

      <section className="section section-rule"><div className="shell"><span className="eyebrow">Escenarios responsables</span><h2 className="section-title">Haz visibles las oportunidades antes de invertir.</h2><p className="lead">Mueve tus propias variables. El resultado abre una conversación; nunca promete cuánto vas a ganar.</p><OpportunityCalculator /></div></section>

      <section className="section section-rule"><div className="shell"><span className="eyebrow">Cómo avanzamos</span><h2 className="section-title">De lo que existe hoy al siguiente paso que sí puedes operar.</h2><div className="journey">{[[Eye,"Observar","Evidencia, restricciones y realidad operativa."],[Sparkles,"Visualizar","Mockups y flujos antes de producir."],[Compass,"Priorizar","Ahora, después y todavía no."],[Layers3,"Implementar","Studio, Systems y Academy coordinados."]].map(([Icon,title,copy],index) => { const I = Icon as typeof Eye; return <article key={title as string}><span>0{index+1}</span><I /><h3>{title as string}</h3><p>{copy as string}</p></article>})}</div></div></section>

      <section className="section section-rule"><div className="shell faq-grid"><div><span className="eyebrow">Preguntas frecuentes</span><h2 className="section-title">Claridad antes de contratar.</h2><p className="lead">Alcance, evidencia y expectativas visibles desde el principio.</p></div><FAQ /></div></section>

      <section className="section cta-section"><div className="shell cta-card"><span className="eyebrow">Tu siguiente versión</span><h2>Tu negocio ya tiene potencial. Ayudemos a que se vea, se organice y avance.</h2><p>Comparte lo mínimo necesario. Te indicaremos cuál podría ser un siguiente paso realista.</p><div className="actions"><Button asChild variant="acid" size="lg"><Link href="/diagnostico">Descubrir el potencial de mi negocio <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/demo">Ver una demo primero</Link></Button></div></div></section>
    </main>
  );
}
