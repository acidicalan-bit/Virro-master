"use client";

import { useEffect, useState } from "react";

import type { BenchmarkCase, BenchmarkRunResult } from "@/src/domain/benchmark";
import type { BenchmarkSummary } from "@/src/application/benchmark-service";

export function BenchmarkLab() {
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [results, setResults] = useState<BenchmarkRunResult[]>([]);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultBySlug = new Map(results.map((result) => [result.benchmarkCase.slug, result]));

  useEffect(() => {
    let active = true;
    fetch("/api/benchmarks")
      .then(async (response) => {
        const body = (await response.json()) as { cases?: BenchmarkCase[]; error?: string };
        if (!response.ok || !body.cases) throw new Error(body.error || "No se pudieron cargar los casos.");
        if (active) setCases(body.cases);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "No se pudieron cargar los casos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function run(slugs?: string[]) {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const body = (await response.json()) as { results?: BenchmarkRunResult[]; summary?: BenchmarkSummary; error?: string };
      if (!response.ok || !body.results || !body.summary) throw new Error(body.error || "Falló el benchmark.");
      setResults(body.results);
      setSummary(body.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falló el benchmark.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="benchmark-shell">
      <header className="benchmark-header">
        <div>
          <p className="eyebrow">Evaluación interna</p>
          <h1>Benchmarks</h1>
          <p>Casos humanos reales, puntuación determinista y revisión manual cuando el significado no puede reducirse a una coincidencia exacta.</p>
        </div>
        <button className="primary-button" type="button" disabled={running || loading || cases.length === 0} onClick={() => void run()}>
          {running ? "Ejecutando…" : `Ejecutar ${cases.length} casos`}
        </button>
      </header>
      <p className="environment-note">Con un proveedor remoto, ejecutar todos los casos consume llamadas y tokens del modelo configurado.</p>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {summary ? <Summary summary={summary} /> : null}
      <div className="benchmark-table-wrap">
        <table className="benchmark-table">
          <thead><tr><th>Caso</th><th>Contexto</th><th>Modo esperado</th><th>Resultado</th><th><span className="sr-only">Acción</span></th></tr></thead>
          <tbody>
            {cases.map((item) => {
              const result = resultBySlug.get(item.slug);
              return (
                <tr key={item.slug}>
                  <td><strong>{item.input}</strong><small>{item.slug}</small></td>
                  <td>{item.context ?? "—"}</td>
                  <td><code>{item.expectedInteractionMode}</code></td>
                  <td>{result ? <span className={result.evaluation.passed ? "status-pass" : "status-fail"}>{result.evaluation.passed ? "Pass" : result.evaluation.manualReview ? "Revisión manual" : "Fail"}</span> : "Sin ejecutar"}</td>
                  <td><button className="text-button" type="button" disabled={running} onClick={() => void run([item.slug])}>Ejecutar</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Summary({ summary }: { summary: BenchmarkSummary }) {
  const metrics: Array<[string, string | number]> = [
    ["Total", summary.total],
    ["Passed", summary.passed],
    ["Failed", summary.failed],
    ["Interaction mode", `${summary.interactionModeAccuracy}%`],
    ["Concept coverage", `${summary.expectedConceptCoverage}%`],
    ["Forbidden questions", summary.forbiddenQuestionViolations],
    ["Assumption violations", summary.assumptionViolations],
    ["Manual review", summary.manualReview],
  ];
  return <dl className="metrics-strip">{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
