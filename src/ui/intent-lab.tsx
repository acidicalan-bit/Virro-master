"use client";

import { useState, type FormEvent } from "react";

import type { ExecutionContract } from "@/src/domain/execution-contract";
import type { IntentContract } from "@/src/domain/intent-contract";

type CompileResponse = {
  contract: IntentContract;
  runId: string;
  storageMode: "supabase" | "memory";
  metadata: {
    provider: string;
    modelName: string;
    modelVersion: string | null;
    latencyMs: number;
    compilerVersion: string;
    schemaVersion: string;
    usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } | null;
  };
};

const examples = [
  ["Haz magia con esta foto.", "edición fotográfica"],
  ["Hizo magia con el balón.", "fútbol"],
  ["Que se vea caro pero no mamador.", "branding de restaurante"],
];

export function IntentLab() {
  const [rawInput, setRawInput] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [executionContract, setExecutionContract] = useState<ExecutionContract | null>(null);
  const [status, setStatus] = useState<"idle" | "compiling" | "execution">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleCompile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("compiling");
    setError(null);
    setResult(null);
    setExecutionContract(null);
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, context: context.trim() || null }),
      });
      const body = (await response.json()) as CompileResponse | { error?: string };
      if (!response.ok || !("contract" in body)) {
        throw new Error("error" in body && body.error ? body.error : "No pudimos compilar la intención.");
      }
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ocurrió un error inesperado.");
    } finally {
      setStatus("idle");
    }
  }

  async function handleExecutionContract() {
    if (!result) return;
    setStatus("execution");
    setError(null);
    try {
      const response = await fetch("/api/execution-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract: result.contract }),
      });
      const body = (await response.json()) as { executionContract?: ExecutionContract; error?: string };
      if (!response.ok || !body.executionContract) throw new Error(body.error || "No se pudo generar el contrato.");
      setExecutionContract(body.executionContract);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo generar el contrato.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="lab-shell">
      <section className="intro" aria-labelledby="lab-title">
        <p className="eyebrow">Intent Lab · Build 001</p>
        <h1 id="lab-title">¿Qué quieres hacer?</h1>
        <p className="intro-copy">
          Escribe como hablas. El laboratorio separa intención, contexto, supuestos y límites antes de que otra IA actúe.
        </p>
      </section>

      <form className="compiler-form" onSubmit={handleCompile}>
        <label htmlFor="intent-input">Tu instrucción</label>
        <textarea
          id="intent-input"
          name="intent"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder="Ej. Déjalo igual, nomás arregla eso."
          rows={5}
          required
          maxLength={8_000}
          autoFocus
        />
        <label htmlFor="intent-context">
          Contexto <span>opcional</span>
        </label>
        <input
          id="intent-context"
          name="context"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="Ej. edición fotográfica, fútbol, branding…"
          maxLength={4_000}
        />
        <div className="example-row" aria-label="Ejemplos rápidos">
          {examples.map(([example, exampleContext]) => (
            <button
              className="text-button"
              type="button"
              key={`${example}-${exampleContext}`}
              onClick={() => {
                setRawInput(example);
                setContext(exampleContext);
              }}
            >
              {example}
            </button>
          ))}
        </div>
        <button className="primary-button" type="submit" disabled={status !== "idle" || !rawInput.trim()}>
          {status === "compiling" ? "Interpretando…" : "Compilar intención"}
        </button>
      </form>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {result ? (
        <section className="result-stack" aria-live="polite">
          {result.storageMode === "memory" ? (
            <p className="environment-note">
              Modo local: los resultados viven en memoria. Configura Supabase para persistencia real.
            </p>
          ) : null}
          <IntentResult result={result} />
          <FeedbackPanel runId={result.runId} />
          <div className="execution-action">
            <div>
              <p className="eyebrow">Siguiente capa</p>
              <h2>Contrato para Codex</h2>
              <p>Convierte esta interpretación validada en criterios concretos para un agente ejecutor.</p>
            </div>
            <button className="secondary-button" type="button" onClick={handleExecutionContract} disabled={status !== "idle"}>
              {status === "execution" ? "Generando…" : "Generate Execution Contract"}
            </button>
          </div>
          {executionContract ? <ExecutionContractView contract={executionContract} /> : null}
        </section>
      ) : null}
    </main>
  );
}

function IntentResult({ result }: { result: CompileResponse }) {
  const { contract } = result;
  return (
    <article className="intent-result">
      <header className="result-header">
        <div>
          <p className="eyebrow">Esto es lo que la IA entendió</p>
          <h2>{contract.interpretedIntent}</h2>
          <p>{contract.interpretedMeaning}</p>
        </div>
        <div className="confidence" aria-label={`Confianza ${Math.round(contract.confidence * 100)} por ciento`}>
          <strong>{Math.round(contract.confidence * 100)}%</strong>
          <span>confianza</span>
        </div>
      </header>

      <dl className="signal-strip">
        <div><dt>Dominio</dt><dd>{contract.domain}</dd></div>
        <div><dt>Modo</dt><dd>{contract.recommendedInteractionMode}</dd></div>
        <div><dt>Libertad creativa</dt><dd>{contract.creativeFreedom}</dd></div>
        <div><dt>Próxima acción</dt><dd>{contract.nextAction}</dd></div>
      </dl>

      <div className="result-grid">
        <StringSection title="Datos explícitos" items={contract.explicitFacts} />
        <StringSection title="Expectativas implícitas" items={contract.implicitExpectations} />
        <StringSection title="Qué debemos preservar" items={contract.preservationConstraints} tone="preserve" />
        <StringSection title="Acciones prohibidas" items={contract.prohibitedActions} tone="warning" />
        <StringSection title="Qué NO debemos preguntar" items={contract.prohibitedQuestions} />
        <StringSection title="Qué necesita aclaración" items={contract.clarificationRequirements.map((item) => `${item.question} — ${item.reason}`)} />
        <StringSection title="Suposiciones seguras" items={contract.safeAssumptions.map((item) => `${item.assumption} — ${item.reason}`)} />
        <StringSection title="Decisiones provisionales" items={contract.provisionalDecisions.map((item) => `${item.decision} — ${item.rationale}`)} />
        <StringSection title="Ambigüedades" items={contract.ambiguities.map((item) => `${item.topic} (${item.impact}) — ${item.resolution}`)} />
      </div>

      <details className="debug-panel">
        <summary>Vista avanzada</summary>
        <dl className="debug-metadata">
          <div><dt>Provider</dt><dd>{result.metadata.provider}</dd></div>
          <div><dt>Modelo</dt><dd>{result.metadata.modelName}</dd></div>
          <div><dt>Latencia</dt><dd>{result.metadata.latencyMs} ms</dd></div>
          <div><dt>Compiler</dt><dd>{result.metadata.compilerVersion}</dd></div>
          <div><dt>Schema</dt><dd>{result.metadata.schemaVersion}</dd></div>
        </dl>
        <pre>{JSON.stringify(contract, null, 2)}</pre>
      </details>
    </article>
  );
}

function StringSection({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "preserve" | "warning" }) {
  return (
    <section className={`result-section result-section--${tone}`}>
      <h3>{title}</h3>
      {items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-value">Nada por ahora.</p>}
    </section>
  );
}

const feedbackTags = [
  "wrong_context",
  "literal_interpretation",
  "missed_slang",
  "missed_implicit_constraint",
  "unnecessary_question",
  "unsafe_assumption",
  "wrong_interaction_mode",
  "missed_frustration",
  "other",
];

function FeedbackPanel({ runId }: { runId: string }) {
  const [choice, setChoice] = useState<"correct" | "incorrect" | null>(null);
  const [correction, setCorrection] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(accepted: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentRunId: runId,
          accepted,
          correctedInterpretation: correction.trim() || null,
          feedbackTags: tags,
          notes: notes.trim() || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el feedback.");
      setMessage("Feedback guardado.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No se pudo guardar el feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="feedback-panel" aria-labelledby="feedback-title">
      <div>
        <p className="eyebrow">Feedback humano</p>
        <h2 id="feedback-title">¿La interpretación es correcta?</h2>
      </div>
      <div className="feedback-actions">
        <button className="secondary-button" type="button" disabled={saving} onClick={() => { setChoice("correct"); void save(true); }}>
          Correcta
        </button>
        <button className="secondary-button" type="button" disabled={saving} onClick={() => setChoice("incorrect")}>
          Incorrecta
        </button>
      </div>
      {choice === "incorrect" ? (
        <div className="feedback-details">
          <label htmlFor="correction">Interpretación corregida</label>
          <textarea id="correction" rows={3} value={correction} onChange={(event) => setCorrection(event.target.value)} />
          <fieldset>
            <legend>Tags de error</legend>
            <div className="tag-list">
              {feedbackTags.map((tag) => (
                <label key={tag}>
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={(event) => setTags((current) => event.target.checked ? [...current, tag] : current.filter((item) => item !== tag))}
                  />
                  {tag.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="feedback-notes">Notas</label>
          <textarea id="feedback-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          <button className="primary-button" type="button" disabled={saving || (!correction.trim() && !notes.trim())} onClick={() => void save(false)}>
            {saving ? "Guardando…" : "Guardar corrección"}
          </button>
        </div>
      ) : null}
      {message ? <p className="feedback-message" role="status">{message}</p> : null}
    </section>
  );
}

function ExecutionContractView({ contract }: { contract: ExecutionContract }) {
  const sections: Array<[string, string | string[]]> = [
    ["OBJECTIVE", contract.objective],
    ["USER EXPECTATION", contract.userExpectation],
    ["RELEVANT CONTEXT", contract.relevantContext],
    ["REQUIREMENTS", contract.requirements],
    ["PRESERVE", contract.preserve],
    ["DO NOT", contract.doNot],
    ["AUTHORIZED ASSUMPTIONS", contract.authorizedAssumptions],
    ["HIGH-IMPACT AMBIGUITIES", contract.highImpactAmbiguities],
    ["ACCEPTANCE TESTS", contract.acceptanceTests],
    ["DEFINITION OF DONE", contract.definitionOfDone],
  ];
  return (
    <article className="execution-contract">
      <p className="eyebrow">Codex Execution Contract · {contract.schemaVersion}</p>
      {sections.map(([title, value]) => (
        <section key={title}>
          <h3>{title}</h3>
          {Array.isArray(value) ? (value.length ? <ul>{value.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Ninguna.</p>) : <p>{value}</p>}
        </section>
      ))}
    </article>
  );
}
