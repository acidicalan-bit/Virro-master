"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import type {
  BlindCaseView,
  BlindEvaluationSetSummary,
  BlindSessionView,
  HumanIntentSummary,
  StepRatingSummary,
} from "@/src/application/blind-evaluation-service";
import type {
  BlindEvaluationErrorTag,
  BlindPreference,
  BlindRatings,
  BlindResponse,
  HumanIntentSubmission,
  StepRatingSubmission,
} from "@/src/domain/blind-evaluation";
import type { InteractionMode } from "@/src/domain/intent-contract";

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

const interactionModeOptions: Array<{
  value: InteractionMode;
  label: string;
  description: string;
}> = [
  {
    value: "EXECUTE",
    label: "Ejecutar",
    description: "La instrucción ya es clara: realizarla tal como está.",
  },
  {
    value: "ASSUME",
    label: "Asumir y proceder",
    description: "Falta un detalle menor: elegir una opción segura y reversible y continuar.",
  },
  {
    value: "SHOW_OPTIONS",
    label: "Mostrar opciones",
    description: "La persona elegiría mejor viendo alternativas concretas.",
  },
  {
    value: "ASK",
    label: "Preguntar",
    description: "Falta una decisión de alto impacto que no debe suponerse.",
  },
  {
    value: "EXPLORE",
    label: "Explorar",
    description: "Hay una meta abierta o insatisfacción, pero todavía no una acción precisa.",
  },
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

  if (session?.status === "COMPLETED" && session.reveal) {
    return (
      <main className="blind-shell">
        <header className="blind-header">
          <div>
            <p className="eyebrow">Build 001.1.2 · evaluación ciega</p>
            <h1>Blind Eval</h1>
          </div>
        </header>
        <EvaluationReveal session={session} onClose={() => setSession(null)} />
      </main>
    );
  }

  return (
    <main className="blind-shell">
      <header className="blind-header">
        <div>
          <p className="eyebrow">Build 001.1.2 · evaluación ciega</p>
          <h1>Blind Eval</h1>
          <p>
            Compara dos interpretaciones sin conocer su origen. La interpretación humana se
            registra antes de revelar cualquier salida de modelo; los modelos se muestran uno a la vez.
          </p>
        </div>
        <label className="secondary-button file-button">
          Importar set JSON
          <input type="file" accept="application/json,.json" onChange={handleImport} disabled={working} />
        </label>
      </header>

      <p className="environment-note blind-note">
        Los sets importados son inmutables. No revises notas privadas ni ajustes el compilador
        después de importar el set real.
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
                    {working ? "Preparando sesión…" : "Iniciar sesión ciega"}
                  </button>
                </article>
              ))}
            </div>
          ) : loading ? null : (
            <p className="empty-value">No hay sets. Importa el DEMO incluido o un set externo.</p>
          )}
        </section>
      ) : null}

      {session?.step === "HUMAN_INTENT" && session.case && session.evaluationCaseId ? (
        <HumanIntentStep
          sessionId={session.sessionId}
          evaluationCaseId={session.evaluationCaseId}
          caseView={session.case}
          caseNumber={session.progress.completed + 1}
          totalCases={session.progress.total}
          onSessionChange={setSession}
        />
      ) : null}

      {(session?.step === "RATING_OUTPUT_1" || session?.step === "RATING_OUTPUT_2") &&
      session.comparison &&
      session.humanIntent ? (
        <OutputRatingStep
          key={`${session.comparison.id}:${session.step}`}
          session={session}
          onSessionChange={setSession}
        />
      ) : null}

      {session?.step === "PREFERENCE" && session.comparison && session.humanIntent ? (
        <PreferenceStep session={session} onSessionChange={setSession} />
      ) : null}
    </main>
  );
}

function HumanIntentStep({
  sessionId,
  evaluationCaseId,
  caseView,
  caseNumber,
  totalCases,
  onSessionChange,
}: {
  sessionId: string;
  evaluationCaseId: string;
  caseView: BlindCaseView;
  caseNumber: number;
  totalCases: number;
  onSessionChange: (session: BlindSessionView) => void;
}) {
  const [intendedMeaning, setIntendedMeaning] = useState("");
  const [expectedNextAction, setExpectedNextAction] = useState<InteractionMode | null>(null);
  const [preservationNotes, setPreservationNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const title = titleRef.current;
    if (typeof title?.scrollIntoView === "function") {
      title.scrollIntoView({ block: "start" });
      title.focus({ preventScroll: true });
    }
  }, []);

  const complete = intendedMeaning.trim().length > 0 && expectedNextAction !== null;

  async function submit() {
    if (!complete || !expectedNextAction) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/blind-eval/human-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          evaluationCaseId,
          intendedMeaning,
          expectedNextAction,
          preservationNotes: preservationNotes.trim() || null,
        } satisfies HumanIntentSubmission),
      });
      const body = (await response.json()) as { session?: BlindSessionView; error?: string };
      if (!response.ok || !body.session) {
        throw new Error(body.error || "No se pudo registrar el intent humano.");
      }
      onSessionChange(body.session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="human-intent-step" aria-labelledby="intent-title">
      <header className="comparison-context">
        <div>
          <p className="eyebrow">Paso 1 · Caso {caseNumber} de {totalCases}</p>
          <h2 id="intent-title" ref={titleRef} tabIndex={-1}>“{caseView.rawInput}”</h2>
          <p>{caseView.context ? `Contexto: ${caseView.context}` : "Sin contexto adicional."}</p>
          {caseView.domain ? <p>Dominio: {caseView.domain}</p> : null}
        </div>
      </header>

      <div className="intention-panel">
        <h3>¿Qué cree que quiere esta persona?</h3>
        <p className="hint">
          Registre su interpretación <strong>antes</strong> de ver las salidas del modelo. Una vez
          enviado, no podrá editarlo. Los modelos se revelarán una a la vez después.
        </p>

        <label>
          Significado intencional
          <textarea
            rows={3}
            value={intendedMeaning}
            onChange={(event) => setIntendedMeaning(event.target.value)}
            maxLength={8_000}
            placeholder="¿Qué acción o cambio está pidiendo esta persona?"
            required
          />
        </label>

        <fieldset className="interaction-mode-fieldset">
          <legend>Próxima acción esperada</legend>
          <p className="interaction-mode-hint">
            Elige qué debería hacer el sistema ahora, no qué información podría inferir.
          </p>
          <div className="interaction-mode-options">
            {interactionModeOptions.map(({ value, label, description }) => (
              <label key={value} className="mode-option">
                <input
                  type="radio"
                  name="expectedNextAction"
                  value={value}
                  checked={expectedNextAction === value}
                  onChange={() => setExpectedNextAction(value)}
                  required
                />
                <span className="mode-copy">
                  <span className="mode-value">{value}</span>
                  <span className="mode-label">{label}</span>
                  <span className="mode-description">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Notas de preservación <span className="optional">opcional</span>
          <textarea
            rows={2}
            value={preservationNotes}
            onChange={(event) => setPreservationNotes(event.target.value)}
            maxLength={8_000}
            placeholder="¿Qué se debe conservar a toda costa?"
          />
        </label>

        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="primary-button" type="button" disabled={!complete || saving} onClick={() => void submit()}>
          {saving ? "Compilando modelos…" : "Bloquear interpretación e iniciar evaluación"}
        </button>
      </div>
    </section>
  );
}

function OutputRatingStep({
  session,
  onSessionChange,
}: {
  session: BlindSessionView;
  onSessionChange: (session: BlindSessionView) => void;
}) {
  const step = session.step as "RATING_OUTPUT_1" | "RATING_OUTPUT_2";
  const comparison = session.comparison!;
  const humanIntent = session.humanIntent!;
  const isFirst = step === "RATING_OUTPUT_1";
  const response = isFirst ? comparison.responseA : comparison.responseB;
  const outputPosition = isFirst ? 1 : 2;
  const label = `Output ${outputPosition}`;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const title = titleRef.current;
    if (typeof title?.scrollIntoView === "function") {
      title.scrollIntoView({ block: "start" });
      title.focus({ preventScroll: true });
    }
  }, [step]);

  const [ratings, setRatings] = useState<RatingsDraft>(emptyRatings);
  const [tags, setTags] = useState<BlindEvaluationErrorTag[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = ratingDimensions.every(([key]) => ratings[key] !== null);

  async function submit() {
    if (!complete) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/blind-eval/step-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparisonId: comparison.id,
          outputPosition,
          ratings: toRatings(ratings),
          errorTags: tags,
          evaluatorNotes: notes.trim() || null,
        } satisfies StepRatingSubmission),
      });
      const body = (await response.json()) as { session?: BlindSessionView; error?: string };
      if (!response.ok || !body.session) {
        throw new Error(body.error || "No se pudo guardar la calificación.");
      }
      onSessionChange(body.session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="output-rating-step" aria-labelledby="rating-title">
      <header className="comparison-context">
        <div>
          <p className="eyebrow">
            Paso {isFirst ? "2" : "3"} · Caso {session.progress.completed + 1} de {session.progress.total}
          </p>
          <h2 id="rating-title" ref={titleRef} tabIndex={-1}>“{comparison.case.rawInput}”</h2>
        </div>
        <span>{session.progress.completed} evaluados</span>
      </header>

      <HumanIntentReference intent={humanIntent} />

      <div className="single-response-layout">
        <BlindResponseCard label={label} response={response} />
        <StepRatingForm
          ratings={ratings}
          tags={tags}
          notes={notes}
          onChangeRatings={setRatings}
          onChangeTags={setTags}
          onChangeNotes={setNotes}
          saving={saving}
          error={error}
          complete={complete}
          onSubmit={() => void submit()}
        />
      </div>
    </section>
  );
}

function PreferenceStep({
  session,
  onSessionChange,
}: {
  session: BlindSessionView;
  onSessionChange: (session: BlindSessionView) => void;
}) {
  const comparison = session.comparison!;
  const [preference, setPreference] = useState<BlindPreference | null>(null);
  const [tags, setTags] = useState<BlindEvaluationErrorTag[]>([]);
  const [notes, setNotes] = useState("");
  const [correction, setCorrection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const title = titleRef.current;
    if (typeof title?.scrollIntoView === "function") {
      title.scrollIntoView({ block: "start" });
      title.focus({ preventScroll: true });
    }
  }, []);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/blind-eval/judgments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparisonId: comparison.id,
          preference: preference ?? undefined,
          evaluatorNotes: notes.trim() || null,
          errorTags: tags,
          correctedIntent: correction.trim() || null,
        }),
      });
      const body = (await response.json()) as { session?: BlindSessionView; error?: string };
      if (!response.ok || !body.session) {
        throw new Error(body.error || "No se pudo guardar el juicio.");
      }
      onSessionChange(body.session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="preference-step" aria-labelledby="preference-title">
      <header className="comparison-context">
        <div>
          <p className="eyebrow">Paso 4 · Caso {session.progress.completed + 1} de {session.progress.total}</p>
          <h2 id="preference-title" ref={titleRef} tabIndex={-1}>“{comparison.case.rawInput}”</h2>
        </div>
      </header>

      <HumanIntentReference intent={session.humanIntent!} />

      <div className="blind-grid" aria-label="Comparación final de respuestas">
        <BlindResponseCard label="Response A" response={comparison.responseA} />
        <BlindResponseCard label="Response B" response={comparison.responseB} />
      </div>

      <div className="step-rating-references">
        <StepRatingReference label="Output 1 (A)" summary={session.stepRating1!} />
        <StepRatingReference label="Output 2 (B)" summary={session.stepRating2!} />
      </div>

      <section className="judgment-panel" aria-labelledby="judgment-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Juicio final</p>
            <h3 id="judgment-title">¿Preferencia general? (opcional)</h3>
          </div>
          <span>Las calificaciones ya están registradas. La preferencia es opcional.</span>
        </div>

        <fieldset className="preference-fieldset">
          <legend>Preferencia general</legend>
          <div className="preference-options">
            {preferences.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="preference"
                  value={value}
                  checked={preference === value}
                  onChange={() => setPreference(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="error-tag-fieldset">
          <legend>Tags de error <span className="optional">opcionales</span></legend>
          <div className="tag-list">
            {errorTags.map((tag) => (
              <label key={tag}>
                <input
                  type="checkbox"
                  checked={tags.includes(tag)}
                  onChange={(event) =>
                    setTags((current) =>
                      event.target.checked
                        ? [...current, tag]
                        : current.filter((item) => item !== tag),
                    )
                  }
                />
                {tag.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="judgment-text-fields">
          <label>
            ¿Qué habrías querido decir? <span className="optional">opcional</span>
            <textarea rows={3} value={correction} onChange={(event) => setCorrection(event.target.value)} maxLength={8_000} />
          </label>
          <label>
            Notas del evaluador <span className="optional">opcional</span>
            <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={8_000} />
          </label>
        </div>

        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="primary-button" type="button" disabled={saving} onClick={() => void submit()}>
          {saving ? "Guardando y preparando siguiente…" : "Guardar evaluación"}
        </button>
      </section>
    </section>
  );
}

function HumanIntentReference({ intent }: { intent: HumanIntentSummary }) {
  return (
    <aside className="human-intent-reference">
      <h3>Interpretación humana registrada</h3>
      <dl>
        <div><dt>Significado intencional</dt><dd>{intent.intendedMeaning}</dd></div>
        <div><dt>Acción esperada</dt><dd>{intent.expectedNextAction}</dd></div>
        <div><dt>Notas de preservación</dt><dd>{intent.preservationNotes ?? "No declarado."}</dd></div>
      </dl>
    </aside>
  );
}

function StepRatingReference({ label, summary }: { label: string; summary: StepRatingSummary }) {
  const avg = Math.round((averageRating(summary.ratings) / 2) * 10) / 10;
  return (
    <aside className="step-rating-reference">
      <h4>{label} <span>(promedio {avg}/2)</span></h4>
      <ul>
        {summary.errorTags.length ? (
          <li>{summary.errorTags.map((t) => t.replaceAll("_", " ")).join(", ")}</li>
        ) : null}
        {summary.evaluatorNotes ? <li>{summary.evaluatorNotes}</li> : null}
      </ul>
    </aside>
  );
}

function StepRatingForm({
  ratings,
  tags,
  notes,
  onChangeRatings,
  onChangeTags,
  onChangeNotes,
  saving,
  error,
  complete,
  onSubmit,
}: {
  ratings: RatingsDraft;
  tags: BlindEvaluationErrorTag[];
  notes: string;
  onChangeRatings: (value: RatingsDraft) => void;
  onChangeTags: (value: BlindEvaluationErrorTag[]) => void;
  onChangeNotes: (value: string) => void;
  saving: boolean;
  error: string | null;
  complete: boolean;
  onSubmit: () => void;
}) {
  return (
    <section className="step-rating-form" aria-labelledby="rating-form-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Calificación independiente</p>
          <h4 id="rating-form-title">Califique esta interpretación 0–2</h4>
        </div>
        <span>0 falló · 1 parcial · 2 correcto</span>
      </div>

      <table className="rating-table">
        <thead><tr><th>Criterio</th><th>Puntuación</th></tr></thead>
        <tbody>
          {ratingDimensions.map(([key, label]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td>
                <RatingSelect
                  label={`${label}, rating`}
                  value={ratings[key]}
                  onChange={(value) => onChangeRatings({ ...ratings, [key]: value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <fieldset className="error-tag-fieldset">
        <legend>Tags de error <span className="optional">opcionales</span></legend>
        <div className="tag-list">
          {errorTags.map((tag) => (
            <label key={tag}>
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={(event) =>
                  onChangeTags(
                    event.target.checked ? [...tags, tag] : tags.filter((item) => item !== tag),
                  )
                }
              />
              {tag.replaceAll("_", " ")}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Notas del evaluador <span className="optional">opcional</span>
        <textarea rows={3} value={notes} onChange={(event) => onChangeNotes(event.target.value)} maxLength={8_000} />
      </label>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="primary-button" type="button" disabled={!complete || saving} onClick={onSubmit}>
        {saving ? "Guardando…" : "Guardar calificación"}
      </button>
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

      <MetricsPanel metrics={reveal.metrics} />

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

            {item.humanIntent ? (
              <dl className="human-intent-reveal">
                <div><dt>Intención humana</dt><dd>{item.humanIntent.intendedMeaning}</dd></div>
                <div><dt>Acción esperada</dt><dd>{item.humanIntent.expectedNextAction}</dd></div>
                <div><dt>Notas de preservación</dt><dd>{item.humanIntent.preservationNotes ?? "Ninguna."}</dd></div>
              </dl>
            ) : null}

            {item.stepRating1 ? (
              <p><strong>Output 1 (A):</strong> promedio {Math.round((averageRating(item.stepRating1.ratings) / 2) * 10) / 10}/2 · tags: {item.stepRating1.errorTags.length}</p>
            ) : null}
            {item.stepRating2 ? (
              <p><strong>Output 2 (B):</strong> promedio {Math.round((averageRating(item.stepRating2.ratings) / 2) * 10) / 10}/2 · tags: {item.stepRating2.errorTags.length}</p>
            ) : null}

            <Telemetry label="A" metadata={item.responseAMetadata} />
            <Telemetry label="B" metadata={item.responseBMetadata} />
          </article>
        ))}
      </div>
      <button className="secondary-button" type="button" onClick={onClose}>Volver a los sets</button>
    </section>
  );
}

function MetricsPanel({ metrics }: { metrics: NonNullable<BlindSessionView["reveal"]>["metrics"] }) {
  return (
    <dl className="metrics-panel">
      <div><dt>Coincidencia con intención humana</dt><dd>baseline: {formatScore(metrics.humanIntentMatchScore.baseline)} · candidate: {formatScore(metrics.humanIntentMatchScore.candidate)}</dd></div>
      <div><dt>Exactitud del modo de interacción</dt><dd>baseline: {formatPercent(metrics.interactionModeAccuracy.baseline)} · candidate: {formatPercent(metrics.interactionModeAccuracy.candidate)}</dd></div>
      <div><dt>Preservación según evaluación humana</dt><dd>baseline: {formatScore(metrics.humanPreservationScore.baseline)} · candidate: {formatScore(metrics.humanPreservationScore.candidate)}</dd></div>
      <div><dt>Puntuación independiente promedio</dt><dd>baseline: {Math.round(metrics.averageIndependentScore.baseline * 10) / 10} / 2 · candidate: {Math.round(metrics.averageIndependentScore.candidate * 10) / 10} / 2</dd></div>
      <div><dt>Ambas buenas</dt><dd>{Math.round(metrics.bothGoodRate * 100)}%</dd></div>
      <div><dt>Ambas malas</dt><dd>{Math.round(metrics.bothBadRate * 100)}%</dd></div>
      <div><dt>Tasa de fallo del proveedor</dt><dd>{Math.round(metrics.providerFailureRate * 100)}%</dd></div>
    </dl>
  );
}

function formatScore(value: number | null): string {
  return value === null ? "sin datos" : `${Math.round(value * 10) / 10} / 2`;
}

function formatPercent(value: number | null): string {
  return value === null ? "sin datos" : `${Math.round(value * 100)}%`;
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

function toRatings(value: RatingsDraft): BlindRatings {
  return Object.fromEntries(ratingDimensions.map(([key]) => [key, value[key]])) as BlindRatings;
}

function averageRating(value: BlindRatings): number {
  return (
    (typeof value.intendedMeaning === "number" ? value.intendedMeaning : 0) +
    (typeof value.contextualUnderstanding === "number" ? value.contextualUnderstanding : 0) +
    (typeof value.implicitExpectations === "number" ? value.implicitExpectations : 0) +
    (typeof value.assumptionSafety === "number" ? value.assumptionSafety : 0) +
    (typeof value.clarificationQuality === "number" ? value.clarificationQuality : 0) +
    (typeof value.interactionMode === "number" ? value.interactionMode : 0) +
    (typeof value.preservationIntent === "number" ? value.preservationIntent : 0) +
    (typeof value.overallUsefulness === "number" ? value.overallUsefulness : 0)
  ) / 8;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
