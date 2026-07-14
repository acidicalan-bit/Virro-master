import type { Metadata } from "next";
import Link from "next/link";

const questions = [
  ["¿Qué es Virro?", "Virro es infraestructura empresarial de entendimiento operativo digital. Revisa si la información tiene suficiente contexto, criterio y claridad para avanzar."],
  ["¿Cómo empieza una auditoría de entendimiento operativo?", "Con un flujo crítico, reglas de privacidad y alcance, ejemplos reales revisados y un Enterprise Understanding Map con una recomendación de piloto o pack."],
  ["¿Qué información guarda Virro?", "En modo seguro, Virro procesa contenido crudo de forma transitoria y conserva señales seguras, scores, categorías de contexto y reportes agregados, no conversaciones completas por defecto."],
  ["¿Virro evalúa personas?", "No. Virro analiza señales de claridad, contexto y readiness en información operativa; sus scores son estimaciones probabilísticas y requieren validación humana."],
  ["¿Qué entrega una auditoría?", "Un mapa ejecutivo del flujo revisado, riesgos priorizados, contexto faltante, preguntas críticas para validar, scores estimados y una recomendación de siguiente acción."],
  ["¿Qué pasa después del piloto?", "El piloto permite validar el pack recomendado en un flujo acotado antes de acordar una expansión, licencia o modelo de despliegue enterprise."],
] as const;

const steps = [
  "Seleccionamos un flujo crítico.",
  "Definimos reglas de privacidad y alcance.",
  "Revisamos ejemplos reales.",
  "Entregamos Enterprise Understanding Map.",
  "Recomendamos pack o piloto.",
];

export const metadata: Metadata = {
  title: "Preguntas frecuentes | Virro",
  description: "Respuestas sobre auditorías, privacidad, readiness y pilotos de Virro.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "FAQPage", mainEntity: questions.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) },
      { "@type": "HowTo", name: "Cómo empieza una auditoría Virro", step: steps.map((text, position) => ({ "@type": "HowToStep", position: position + 1, text })) },
    ],
  };
  return <main className="min-h-screen bg-[var(--app-bg)] px-5 py-16 text-[var(--text)] md:px-8 md:py-24"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><article className="mx-auto max-w-4xl"><Link href="/" className="text-xs font-semibold text-[var(--brand-blue)]">← Volver a Virro</Link><p className="section-kicker mt-10">Virro · FAQ</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.055em] md:text-6xl">Preguntas frecuentes</h1><section className="mt-14" aria-labelledby="audit-steps"><h2 id="audit-steps" className="text-xl font-semibold">Cómo empieza una auditoría Virro</h2><ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-7 text-[var(--muted)]">{steps.map((step) => <li key={step}>{step}</li>)}</ol></section><section className="mt-14 space-y-4" aria-labelledby="faq-questions"><h2 id="faq-questions" className="text-xl font-semibold">Respuestas para evaluar Virro</h2>{questions.map(([question, answer]) => <details key={question} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5"><summary className="cursor-pointer text-sm font-semibold">{question}</summary><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{answer}</p></details>)}</section></article></main>;
}
