"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import type {
  BlindComparisonView,
  BlindEvaluationSetSummary,
  BlindSessionView,
} from "@/src/application/blind-evaluation-service";
import type {
  BlindEvaluationErrorTag,
  BlindPreference,
  BlindRatings,
  BlindResponse,
} from "@/src/domain/blind-evaluation";

type RatingKey = keyof BlindRatings;
type RatingsDraft = Record<RatingKey, number | null>;

const ratingDimensions: Array<[RatingKey, string]> = [
  ["intendedMeaning", "Significado intencional"],
  ["contextualUnderstanding", "Comprensión contextual"],
  ["implicitExpectations", "Expectativas implícitas"],
  ["assumptionSafety", "Seguridad de supuestos"],
  ["clarificationQuality", "Calidad de aclaraciones"],
  ["interactionMode", "Modo de interacción"],
  ["preservationIntent", "Intención de preservar"],
  ["overallUsefulness", "Utilidad general"],
];

const preferences: Array<[BlindPreference, string]> = [
  ["A_CLEARLY_BETTER", "A claramente mejor"],
  ["A_SLIGHTLY_BETTER", "A ligeramente mejor"],
  ["TIE", "Empate"],
  ["B_SLIGHTLY_BETTER", "B ligeramente mejor"],
  ["B_CLEARLY_BETTER", "B claramente mejor"],
  ["BOTH_BAD", "Ambas son malas"],
];

const errorTags: BlindEvaluationErrorTag[] = [
  "literalism",
  "context_miss",
  "slang_miss",
  "sarcasm_miss",
  "implicit_constraint_miss",
  "over_assumption",
  "under_assumption",
  "unnecessary_question",
  "missing_question",
  "wrong_interaction_mode",
  "preservation_failure",
  "overcomplication",
  "other",
];

export function BlindEvaluationLab() {
  const [sets, setSets] = useState<BlindEvaluationSetSummary[]>([]);
  const [session, setSession] = useState<BlindSessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadSets()
      .then((items) => {
        if (active) setSets(items);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError(null);
    setImportMessage(null);
    try {
      if (file.size > 2_000_000) throw new Error("El archivo excede el límite de 2 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      const response = await fetch("/api/blind-eval/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const body = (await response.json()) as { set?: BlindEvaluationSetSummary; error?: string };
      if (!response.ok || !body.set) throw new Error(body.error || "No se pudo importar el set.");
      setSets(await loadSets());
      setImportMessage(`Set “${body.set.name}” importado y congelado.`);
      event.target.value = "";
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setWorking(false);
    }
  }

  async function startSession(evaluationSetId: string) {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/blind-eval/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationSetId }),
      });
      const body = (await response.json()) as { session?: BlindSessionView; error?: string };
      if (!response.ok || !body.session) {
        throw new Error(body.error || "No se pudo iniciar la evaluación.");
      }
      setSession(body.session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="blind-shell">
      <header className="blind-header">
        <div>
          <p className="eyebrow">Build 001.1 · evaluación humana</p>
          <h1>Blind Eval</h1>
          <p>
            Compara dos interpretaciones sin conocer su origen. Las identidades se revelan únicamente al terminar todos los casos.
          </p>
        </div>
        <label className="secondary-button file-button">
          Importar set JSON
          <input type="file" accept="application/json,.json" onChange={handleImport} disabled={working} />
        </label>
      </header>

      <p className="environment-note blind-note">
        Los sets importados son inmutables. No revises notas privadas ni ajustes el compilador después de importar el set real.
      </p>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {importMessage ? <p className="feedback-message" role="status">{importMessage}</p> : null}

      {!session ? (
        <section className="evaluation-set-list" aria-labelledby="sets-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sets congelados</p>
              <h2 id="sets-title">Selecciona una evaluación</h2>
            </div>
            {loading ? <span>Cargando…</span> : null}
          </div>
          {sets.length ? (
            <div className="set-grid">
              {sets.map((set) => (
                <article className="set-card" key={set.id}>
                  <div>
                    <span className={set.isDemo ? "demo-badge" : "frozen-badge"}>
                      {set.isDemo ? "DEMO" : "FROZEN"}
                    </span>
                    <h3>{set.name}</h3>
                    <p>{set.description ?? "Sin descripción."}</p>
                  </div>
                  <dl>
                    <div><dt>Casos</dt><dd>{set.caseCount}</dd></div>
                    <div><dt>Fuente</dt><dd>{set.sourceLabel}</dd></div>
                  </dl>
                  <button className="primary-button" type="button" disabled={working} onClick={() => void startSession(set.id)}>
                    {working ? "Preparando comparación…" : "Iniciar sesión ciega"}
                  </button>
                </article>
              ))}
            </div>
          ) : loading ? null : (
            <p className="empty-value">No hay sets. Importa el DEMO incluido o un set externo.</p>
          )}
        </section>
      ) : null}

      {session?.comparison ? (
        <BlindComparison
          key={session.comparison.id}
          sessionId={session.sessionId}
          comparison={session.comparison}
          progress={session.progress}
          onSessionChange={setSession}
        />
      ) : null}

      {session?.status === "COMPLETED" && session.reveal ? (
        <EvaluationReveal session={session} onClose={() => setSession(null)} />
      ) : null}
    </main>
  );
}

function BlindComparison({
  sessionId,
  comparison,
  progress,
  onSessionChange,
}: {
  sessionId: string;
  comparison: BlindComparisonView;
  progress: BlindSessionView["progress"];
  onSessionChange: (session: BlindSessionView) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const title = titleRef.current;
    if (typeof title?.scrollIntoView === "function") {
      title.scrollIntoView({ block: "start" });
      title.focus({ preventScroll: true });
    }
  }, [comparison.id]);

  return (
    <section className="blind-comparison" aria-labelledby="comparison-title">
      <header className="comparison-context">
        <div>
          <p className="eyebrow">Caso {comparison.caseNumber} de {comparison.totalCases}</p>
          <h2 id="comparison-title" ref={titleRef} tabIndex={-1}>“{comparison.case.rawInput}”</h2>
          <p>{comparison.case.context ? `Contexto: ${comparison.case.context}` : "Sin contexto adicional."}</p>
        </div>
        <span>{progress.completed} evaluados</span>
      </header>
      <details className="comparison-integrity">
        <summary>Integridad técnica del caso</summary>
        <dl>
          <div><dt>Session ID</dt><dd>{sessionId}</dd></div>
          <div><dt>Evaluation case ID</dt><dd>{comparison.evaluationCaseId}</dd></div>
          <div><dt>Comparison ID</dt><dd>{comparison.id}</dd></div>
          <div><dt>Raw input</dt><dd>{comparison.case.rawInput}</dd></div>
          <div><dt>Context</dt><dd>{comparison.case.context ?? "null"}</dd></div>
          <div><dt>Domain</dt><dd>{comparison.case.domain ?? "null"}</dd></div>
        </dl>
      </details>
      <div className="response-grid">
        <BlindResponseCard label="Response A" response={comparison.responseA} />
        <BlindResponseCard label="Response B" response={comparison.responseB} />
      </div>
      <JudgmentForm comparisonId={comparison.id} onSessionChange={onSessionChange} />
    </section>
  );
}

function BlindResponseCard({ label, response }: { label: string; response: BlindResponse }) {
  if (response.status === "PROVIDER_FAILURE") {
    return (
      <article className="blind-response blind-response--failure">
        <p className="eyebrow">{label}</p>
        <h3>Sin contrato válido</h3>
        <p>{response.message}</p>
      </article>
    );
  }
  const contract = response.contract;
  return (
    <article className="blind-response">
      <p className="eyebrow">{label}</p>
      <p className="response-field-label">Intención interpretada</p>
      <h3>{contract.interpretedIntent}</h3>
      <p className="response-field-label">Significado interpretado</p>
      <p className="response-meaning">{contract.interpretedMeaning}</p>
      <dl className="response-signals">
        <div><dt>Modo</dt><dd>{contract.recommendedInteractionMode}</dd></div>
        <div><dt>Dominio</dt><dd>{contract.domain}</dd></div>
        <div><dt>Confianza</dt><dd>{Math.round(contract.confidence * 100)}%</dd></div>
      </dl>
      <CompactList title="Expectativas implícitas" items={contract.implicitExpectations} />
      <CompactList title="Preservar" items={contract.preservationConstraints} />
      <CompactList title="Supuestos" items={contract.safeAssumptions.map((item) => item.assumption)} />
      <CompactList title="Aclaraciones" items={contract.clarificationRequirements.map((item) => item.question)} />
      <CompactList title="No hacer" items={contract.prohibitedActions} />
    </article>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="compact-list">
      <h4>{title}</h4>
      {items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Nada.</p>}
    </section>
  );
}

function JudgmentForm({
  comparisonId,
  onSessionChange,
}: {
  comparisonId: string;
  onSessionChange: (session: BlindSessionView) => void;
}) {
  const [preference, setPreference] = useState<BlindPreference | null>(null);
  const [ratingsA, setRatingsA] = useState<RatingsDraft>(emptyRatings);
  const [ratingsB, setRatingsB] = useState<RatingsDraft>(emptyRatings);
  const [tags, setTags] = useState<BlindEvaluationErrorTag[]>([]);
  const [notes, setNotes] = useState("");
  const [correction, setCorrection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = preference !== null && ratingsComplete(ratingsA) && ratingsComplete(ratingsB);

  async function submit() {
    if (!complete || !preference) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/blind-eval/judgments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparisonId,
          preference,
          ratingsA: toRatings(ratingsA),
          ratingsB: toRatings(ratingsB),
          evaluatorNotes: notes.trim() || null,
          errorTags: tags,
          correctedIntent: correction.trim() || null,
        }),
      });
      const body = (await response.json()) as { session?: BlindSessionView; error?: string };
      if (!response.ok || !body.session) throw new Error(body.error || "No se pudo guardar el juicio.");
      onSessionChange(body.session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="judgment-panel" aria-labelledby="judgment-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Juicio humano</p>
          <h2 id="judgment-title">¿Cuál entendió mejor?</h2>
        </div>
        <span>0 falló · 1 parcial · 2 correcto</span>
      </div>

      <fieldset className="preference-fieldset">
        <legend>Preferencia general</legend>
        <div className="preference-options">
          {preferences.map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="preference" value={value} checked={preference === value} onChange={() => setPreference(value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rating-table-wrap">
        <table className="rating-table">
          <thead><tr><th>Criterio</th><th>Response A</th><th>Response B</th></tr></thead>
          <tbody>
            {ratingDimensions.map(([key, label]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                <td><RatingSelect label={`${label}, Response A`} value={ratingsA[key]} onChange={(value) => setRatingsA((current) => ({ ...current, [key]: value }))} /></td>
                <td><RatingSelect label={`${label}, Response B`} value={ratingsB[key]} onChange={(value) => setRatingsB((current) => ({ ...current, [key]: value }))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <fieldset className="error-tag-fieldset">
        <legend>Tags de error <span>opcionales</span></legend>
        <div className="tag-list">
          {errorTags.map((tag) => (
            <label key={tag}>
              <input type="checkbox" checked={tags.includes(tag)} onChange={(event) => setTags((current) => event.target.checked ? [...current, tag] : current.filter((item) => item !== tag))} />
              {tag.replaceAll("_", " ")}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="judgment-text-fields">
        <label>
          ¿Qué habrías querido decir? <span>opcional</span>
          <textarea rows={3} value={correction} onChange={(event) => setCorrection(event.target.value)} maxLength={8_000} />
        </label>
        <label>
          Notas del evaluador <span>opcionales</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={8_000} />
        </label>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="primary-button" type="button" disabled={!complete || saving} onClick={() => void submit()}>
        {saving ? "Guardando y preparando siguiente…" : "Guardar evaluación"}
      </button>
    </section>
  );
}

function RatingSelect({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number) => void }) {
  return (
    <select aria-label={label} value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))}>
      <option value="" disabled>—</option>
      <option value="0">0</option>
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
  );
}

function EvaluationReveal({ session, onClose }: { session: BlindSessionView; onClose: () => void }) {
  const reveal = session.reveal;
  useEffect(() => {
    const title = document.getElementById("reveal-title");
    if (typeof title?.scrollIntoView === "function") {
      title.scrollIntoView({ block: "start" });
    }
  }, []);
  if (!reveal) return null;
  return (
    <section className="evaluation-reveal" aria-labelledby="reveal-title">
      <p className="eyebrow">Sesión completada</p>
      <h2 id="reveal-title">Identidades reveladas</h2>
      <div className="reveal-identities">
        <article><span>Baseline</span><h3>{reveal.baseline.model}</h3><p>{reveal.baseline.provider} · revisión {reveal.baseline.revision}</p></article>
        <article><span>Candidato real</span><h3>{reveal.candidate.model}</h3><p>{reveal.candidate.provider} · {reveal.candidate.systemInstructionVersion}</p></article>
      </div>
      <div className="reveal-cases">
        {reveal.cases.map((item) => (
          <article key={item.comparisonId}>
            <h3>{item.externalId}</h3>
            <p><strong>A:</strong> {item.responseASource} · <strong>B:</strong> {item.responseBSource}</p>
            <p><strong>Comportamiento esperado:</strong> {item.expectedHighLevelBehavior ?? "No declarado."}</p>
            <p><strong>Notas privadas:</strong> {item.privateEvaluatorNotes ?? "Ninguna."}</p>
            <Telemetry label="A" metadata={item.responseAMetadata} />
            <Telemetry label="B" metadata={item.responseBMetadata} />
          </article>
        ))}
      </div>
      <button className="secondary-button" type="button" onClick={onClose}>Volver a los sets</button>
    </section>
  );
}

function Telemetry({ label, metadata }: { label: string; metadata: NonNullable<BlindSessionView["reveal"]>["cases"][number]["responseAMetadata"] }) {
  if (!metadata) return <p>{label}: provider failure registrado.</p>;
  return (
    <p>
      {label}: {metadata.provider}/{metadata.model} · {metadata.providerLatencyMs ?? metadata.latencyMs} ms · {metadata.usage?.totalTokens ?? "tokens no reportados"} · {metadata.estimatedCostUsd === null ? "costo no disponible" : `costo estimado $${metadata.estimatedCostUsd.toFixed(6)} USD`}
    </p>
  );
}

async function loadSets(): Promise<BlindEvaluationSetSummary[]> {
  const response = await fetch("/api/blind-eval/sets");
  const body = (await response.json()) as { sets?: BlindEvaluationSetSummary[]; error?: string };
  if (!response.ok || !body.sets) throw new Error(body.error || "No se pudieron cargar los sets.");
  return body.sets;
}

function emptyRatings(): RatingsDraft {
  return Object.fromEntries(ratingDimensions.map(([key]) => [key, null])) as RatingsDraft;
}

function ratingsComplete(value: RatingsDraft): boolean {
  return ratingDimensions.every(([key]) => value[key] !== null);
}

function toRatings(value: RatingsDraft): BlindRatings {
  return Object.fromEntries(ratingDimensions.map(([key]) => [key, value[key]])) as BlindRatings;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
