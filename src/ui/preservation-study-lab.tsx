"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { PreservationStudyCaseView } from "@/src/application/outcome/media/preservation-study-service";
import type { StudyFailureTag, StudyRatings, StudyTaskType, StudyTopology } from "@/src/domain/outcome/media/preservation-study";
import type { PreservationStudyPlanCase } from "@/src/fixtures/preservation-study-plan";

type Dashboard = {
  study: { id: string; name: string; protocolVersion: string; targetCaseCount: number };
  progress: { enrolled: number; completed: number; target: number };
  cases: Array<{ caseId: string; transactionId: string; planCaseId: string | null; topology: StudyTopology; taskType: StudyTaskType; step: string }>;
  plan: PreservationStudyPlanCase[];
  planDistribution: Record<StudyTopology, number>;
  report: {
    readyForGateDecision: boolean;
    suggestedDecision: string | null;
    overall: Aggregate;
    byTopology: Record<string, Aggregate>;
    byTaskType: Record<string, Aggregate>;
    byCoupledBand: Record<string, Aggregate>;
  };
};

type Aggregate = {
  caseCount: number;
  preservedPreferenceRate: number | null;
  rawPreferenceRate: number | null;
  tieRate: number | null;
  bothBadRate: number | null;
  rawAcceptanceRate: number | null;
  preservedAcceptanceRate: number | null;
  acceptanceLift: number | null;
  averageRatings: { RAW: Record<keyof StudyRatings, number | null>; PRESERVED: Record<keyof StudyRatings, number | null> };
  failureTagCounts: Record<string, number>;
  divergenceTagCounts: Record<string, number>;
};

const topologies: StudyTopology[] = ["LOCAL_INDEPENDENT", "LOCAL_COUPLED", "STRUCTURAL", "GLOBAL"];
const taskTypes: StudyTaskType[] = ["COLOR_CHANGE", "OBJECT_REMOVAL", "TEXT_EDIT", "IDENTITY_EDIT", "PRODUCT_EDIT", "GEOMETRY_EDIT", "OTHER"];
const ratingDimensions: Array<{ key: keyof StudyRatings; label: string }> = [
  { key: "requestedEditSuccess", label: "Éxito del cambio solicitado" },
  { key: "preservationSuccess", label: "Éxito de preservación" },
  { key: "naturalness", label: "Naturalidad" },
  { key: "artifactFreedom", label: "Ausencia de artefactos" },
  { key: "overallUsefulness", label: "Utilidad general" },
];
const failureTags: StudyFailureTag[] = ["boundary_artifact", "shadow_cutoff", "geometry_cutoff", "texture_discontinuity", "identity_drift", "background_drift", "text_drift", "requested_edit_failed", "over_preservation", "under_preservation", "other"];
const zeroRatings: StudyRatings = { requestedEditSuccess: 0, preservationSuccess: 0, naturalness: 0, artifactFreedom: 0, overallUsefulness: 0 };

export function PreservationStudyLab({ initialCaseId = null, initialTransactionId = "" }: { initialCaseId?: string | null; initialTransactionId?: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [studyCase, setStudyCase] = useState<PreservationStudyCaseView | null>(null);
  const [transactionId, setTransactionId] = useState(initialTransactionId);
  const [planCaseId, setPlanCaseId] = useState("");
  const [topology, setTopology] = useState<StudyTopology>("LOCAL_INDEPENDENT");
  const [taskType, setTaskType] = useState<StudyTaskType>("OTHER");
  const [expectedChange, setExpectedChange] = useState("");
  const [expectedPreservation, setExpectedPreservation] = useState("");
  const [unacceptableNotes, setUnacceptableNotes] = useState("");
  const [ratings, setRatings] = useState<StudyRatings>(zeroRatings);
  const [selectedTags, setSelectedTags] = useState<StudyFailureTag[]>([]);
  const [notes, setNotes] = useState("");
  const [rawAccepted, setRawAccepted] = useState<boolean | null>(null);
  const [preservedAccepted, setPreservedAccepted] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load(initialCaseId);
  }, [initialCaseId]);

  const selectedPlan = useMemo(() => dashboard?.plan.find((item) => item.id === planCaseId) ?? null, [dashboard, planCaseId]);

  async function load(caseId?: string | null) {
    setWorking(true);
    setError(null);
    try {
      const [dashboardResponse, caseResponse] = await Promise.all([
        fetch("/api/preservation-study"),
        caseId ? fetch(`/api/preservation-study?caseId=${encodeURIComponent(caseId)}`) : Promise.resolve(null),
      ]);
      const dashboardBody = await dashboardResponse.json() as { dashboard?: Dashboard; error?: string };
      if (!dashboardResponse.ok || !dashboardBody.dashboard) throw new Error(dashboardBody.error ?? "No se pudo cargar el estudio.");
      setDashboard(dashboardBody.dashboard);
      if (caseResponse) {
        const caseBody = await caseResponse.json() as { studyCase?: PreservationStudyCaseView; error?: string };
        if (!caseResponse.ok || !caseBody.studyCase) throw new Error(caseBody.error ?? "No se pudo reanudar el caso.");
        setStudyCase(caseBody.studyCase);
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setWorking(false);
    }
  }

  function choosePlan(id: string) {
    setPlanCaseId(id);
    const item = dashboard?.plan.find((candidate) => candidate.id === id);
    if (item) {
      setTopology(item.topology);
      setTaskType(item.taskType);
    }
  }

  async function mutate(payload: Record<string, unknown>) {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/preservation-study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { studyCase?: PreservationStudyCaseView; error?: string };
      if (!response.ok || !body.studyCase) throw new Error(body.error ?? "No se pudo guardar el paso.");
      setStudyCase(body.studyCase);
      setRatings(zeroRatings);
      setSelectedTags([]);
      setNotes("");
      await refreshDashboard();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setWorking(false);
    }
  }

  async function refreshDashboard() {
    const response = await fetch("/api/preservation-study");
    const body = await response.json() as { dashboard?: Dashboard };
    if (response.ok && body.dashboard) setDashboard(body.dashboard);
  }

  return (
    <main className="study-shell">
      <header className="precision-header">
        <p className="eyebrow">PRODUCT GATE 004 · HUMAN VALUE STUDY</p>
        <h1>Preservation Value Study</h1>
        <p>Una evaluación ciega y append-only de los mismos candidatos RAW y PRESERVED. Este flujo nunca regenera ni hace commit canónico.</p>
      </header>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {!dashboard ? <p role="status">{working ? "Cargando estudio…" : "Sin datos del estudio."}</p> : (
        <>
          <section className="study-status" aria-label="Progreso del estudio">
            <div><span>Inscritos</span><strong>{dashboard.progress.enrolled}/{dashboard.progress.target}</strong></div>
            <div><span>Completados</span><strong>{dashboard.progress.completed}/{dashboard.progress.target}</strong></div>
            <div><span>Gate</span><strong>{dashboard.report.readyForGateDecision ? dashboard.report.suggestedDecision : "PENDIENTE"}</strong></div>
          </section>

          {!studyCase ? (
            <section className="study-grid">
              <form className="study-panel" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "addCase", transactionId, planCaseId: planCaseId || null, topology, taskType }); }}>
                <p className="eyebrow">Inscribir evidencia existente</p>
                <h2>Nuevo caso</h2>
                <label>Transaction ID<input required value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="UUID de BUILD 004" /></label>
                <label>Caso del plan<select value={planCaseId} onChange={(event) => choosePlan(event.target.value)}><option value="">Caso adicional no planificado</option>{dashboard.plan.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></label>
                {selectedPlan ? <p className="study-brief"><strong>{selectedPlan.instruction}</strong><br />{selectedPlan.sourceBrief}</p> : null}
                <label>Topología<select value={topology} onChange={(event) => setTopology(event.target.value as StudyTopology)}>{topologies.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Tipo de tarea<select value={taskType} onChange={(event) => setTaskType(event.target.value as StudyTaskType)}>{taskTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <button className="primary-button" disabled={working}>Inscribir sin regenerar</button>
              </form>
              <section className="study-panel">
                <p className="eyebrow">Casos reanudables</p>
                <h2>Evaluaciones</h2>
                {dashboard.cases.length === 0 ? <p>Aún no hay transacciones inscritas.</p> : <ul className="study-case-list">{dashboard.cases.map((item) => <li key={item.caseId}><button type="button" onClick={() => void load(item.caseId)}><span>{item.planCaseId ?? item.transactionId.slice(0, 8)}</span><strong>{item.step}</strong></button></li>)}</ul>}
              </section>
            </section>
          ) : <CaseFlow studyCase={studyCase} working={working} expectedChange={expectedChange} setExpectedChange={setExpectedChange} expectedPreservation={expectedPreservation} setExpectedPreservation={setExpectedPreservation} unacceptableNotes={unacceptableNotes} setUnacceptableNotes={setUnacceptableNotes} ratings={ratings} setRatings={setRatings} selectedTags={selectedTags} setSelectedTags={setSelectedTags} notes={notes} setNotes={setNotes} rawAccepted={rawAccepted} setRawAccepted={setRawAccepted} preservedAccepted={preservedAccepted} setPreservedAccepted={setPreservedAccepted} mutate={mutate} close={() => { setStudyCase(null); setRawAccepted(null); setPreservedAccepted(null); }} />}

          <Report report={dashboard.report} />
        </>
      )}
    </main>
  );
}

type CaseFlowProps = {
  studyCase: PreservationStudyCaseView; working: boolean;
  expectedChange: string; setExpectedChange(value: string): void;
  expectedPreservation: string; setExpectedPreservation(value: string): void;
  unacceptableNotes: string; setUnacceptableNotes(value: string): void;
  ratings: StudyRatings; setRatings(value: StudyRatings): void;
  selectedTags: StudyFailureTag[]; setSelectedTags(value: StudyFailureTag[]): void;
  notes: string; setNotes(value: string): void;
  rawAccepted: boolean | null; setRawAccepted(value: boolean): void;
  preservedAccepted: boolean | null; setPreservedAccepted(value: boolean): void;
  mutate(payload: Record<string, unknown>): Promise<void>; close(): void;
};

function CaseFlow(props: CaseFlowProps) {
  const item = props.studyCase;
  return <section className="study-flow">
    <button className="text-button" type="button" onClick={props.close}>← Volver a casos</button>
    <div className="study-context">
      <StudyImage title="SOURCE" url={item.source.url} width={item.source.width} height={item.source.height} eager />
      <div><p className="eyebrow">Contexto congelado</p><h2>{item.instruction}</h2><dl><div><dt>Topología</dt><dd>{item.topology}</dd></div><div><dt>Tipo</dt><dd>{item.taskType}</dd></div><div><dt>Banda</dt><dd>{Math.round(item.coupledBand.size * 100)}%</dd></div></dl></div>
    </div>

    {item.step === "HUMAN_INTENT" ? <form className="study-panel" onSubmit={(event) => { event.preventDefault(); void props.mutate({ action: "lockIntent", caseId: item.caseId, expectedChange: props.expectedChange, expectedPreservation: props.expectedPreservation, unacceptableNotes: props.unacceptableNotes || null }); }}>
      <p className="eyebrow">Antes de revelar A/B</p><h2>Expectativa humana</h2>
      <label>EXPECTED CHANGE<textarea required rows={3} value={props.expectedChange} onChange={(event) => props.setExpectedChange(event.target.value)} /></label>
      <label>EXPECTED PRESERVATION<textarea required rows={3} value={props.expectedPreservation} onChange={(event) => props.setExpectedPreservation(event.target.value)} /></label>
      <label>OPTIONAL NOTES<textarea rows={2} value={props.unacceptableNotes} onChange={(event) => props.setUnacceptableNotes(event.target.value)} /></label>
      <p className="study-warning">Al continuar, estas respuestas y el orden aleatorio quedarán bloqueados.</p>
      <button className="primary-button" disabled={props.working}>Bloquear expectativa y revelar A</button>
    </form> : null}

    {(item.step === "RATING_A" || item.step === "RATING_B") && item.candidate ? <form className="study-panel" onSubmit={(event) => { event.preventDefault(); void props.mutate({ action: "rateCandidate", caseId: item.caseId, candidateLabel: item.candidate!.label, ratings: props.ratings, failureTags: props.selectedTags, notes: props.notes || null }); }}>
      <p className="eyebrow">Evaluación independiente · identidad oculta</p><h2>Candidato {item.candidate.label}</h2>
      <StudyImage title={`Candidato ${item.candidate.label}`} url={item.candidate.url} width={item.candidate.width} height={item.candidate.height} eager />
      <RatingFields ratings={props.ratings} setRatings={props.setRatings} />
      <FailureTags selected={props.selectedTags} setSelected={props.setSelectedTags} />
      <label>Notas<textarea rows={2} value={props.notes} onChange={(event) => props.setNotes(event.target.value)} /></label>
      <button className="primary-button" disabled={props.working}>Bloquear calificación de {item.candidate.label}</button>
    </form> : null}

    {item.step === "PAIRWISE" && item.pair ? <section className="study-panel"><p className="eyebrow">Ambas calificaciones están bloqueadas</p><h2>Decisión pairwise</h2><div className="study-pair">{item.pair.map((candidate) => <StudyImage key={candidate.label} title={`Candidato ${candidate.label}`} url={candidate.url} width={candidate.width} height={candidate.height} />)}</div><div className="preference-actions">{(["A_BETTER", "B_BETTER", "TIE", "BOTH_BAD"] as const).map((preference) => <button key={preference} className="secondary-button" type="button" disabled={props.working} onClick={() => void props.mutate({ action: "recordPairwise", caseId: item.caseId, preference, notes: props.notes || null })}>{preference}</button>)}</div></section> : null}

    {item.step === "ACCEPTANCE" && item.reveal ? <form className="study-panel" onSubmit={(event) => { event.preventDefault(); if (props.rawAccepted !== null && props.preservedAccepted !== null) void props.mutate({ action: "recordAcceptance", caseId: item.caseId, rawAccepted: props.rawAccepted, preservedAccepted: props.preservedAccepted }); }}><p className="eyebrow">Identidad revelada</p><h2>A = {item.reveal.candidateA} · B = {item.reveal.candidateB}</h2><p>Preferencia derivada: <strong>{item.reveal.derivedPreference}</strong></p><AcceptanceQuestion label="¿Aceptarías RAW como resultado final?" value={props.rawAccepted} setValue={props.setRawAccepted} /><AcceptanceQuestion label="¿Aceptarías PRESERVED como resultado final?" value={props.preservedAccepted} setValue={props.setPreservedAccepted} /><p className="study-warning">Aceptación experimental: no crea commits canónicos.</p><button className="primary-button" disabled={props.working || props.rawAccepted === null || props.preservedAccepted === null}>Bloquear aceptación</button></form> : null}

    {item.step === "COMPLETE" && item.reveal && item.completedEvaluation ? <section className="study-panel"><p className="eyebrow">Caso inmutable completado</p><h2>{item.reveal.derivedPreference}</h2><p>RAW aceptado: <strong>{item.completedEvaluation.rawAccepted ? "Sí" : "No"}</strong> · PRESERVED aceptado: <strong>{item.completedEvaluation.preservedAccepted ? "Sí" : "No"}</strong></p><p>Divergencias: {item.reveal.divergenceTags.join(", ") || "Ninguna regla descriptiva activada."}</p></section> : null}
  </section>;
}

function RatingFields({ ratings, setRatings }: { ratings: StudyRatings; setRatings(value: StudyRatings): void }) {
  return <fieldset className="rating-grid"><legend>0 = falla · 1 = parcial · 2 = fuerte</legend>{ratingDimensions.map((dimension) => <label key={dimension.key}>{dimension.label}<select aria-label={dimension.label} value={ratings[dimension.key]} onChange={(event) => setRatings({ ...ratings, [dimension.key]: Number(event.target.value) })}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label>)}</fieldset>;
}

function FailureTags({ selected, setSelected }: { selected: StudyFailureTag[]; setSelected(value: StudyFailureTag[]): void }) {
  return <fieldset className="tag-grid"><legend>Failure tags</legend>{failureTags.map((tag) => <label key={tag}><input type="checkbox" checked={selected.includes(tag)} onChange={(event) => setSelected(event.target.checked ? [...selected, tag] : selected.filter((item) => item !== tag))} />{tag}</label>)}</fieldset>;
}

function AcceptanceQuestion({ label, value, setValue }: { label: string; value: boolean | null; setValue(value: boolean): void }) {
  return <fieldset className="acceptance-question"><legend>{label}</legend><label><input type="radio" checked={value === true} onChange={() => setValue(true)} />Sí</label><label><input type="radio" checked={value === false} onChange={() => setValue(false)} />No</label></fieldset>;
}

function StudyImage({ title, url, width, height, eager = false }: { title: string; url: string; width: number; height: number; eager?: boolean }) {
  return <figure className="study-image"><figcaption>{title}</figcaption><div style={{ aspectRatio: `${width} / ${height}` }}><Image src={url} alt={title} fill sizes="(max-width: 800px) 100vw, 50vw" loading={eager ? "eager" : "lazy"} unoptimized /></div></figure>;
}

function Report({ report }: { report: Dashboard["report"] }) {
  const aggregate = report.overall;
  return <section className="study-report"><p className="eyebrow">Reporte descriptivo</p><h2>Métricas humanas</h2><div className="study-status"><Metric label="PRESERVED preference" value={aggregate.preservedPreferenceRate} /><Metric label="RAW preference" value={aggregate.rawPreferenceRate} /><Metric label="Tie" value={aggregate.tieRate} /><Metric label="Both bad" value={aggregate.bothBadRate} /><Metric label="RAW acceptance" value={aggregate.rawAcceptanceRate} /><Metric label="PRESERVED acceptance" value={aggregate.preservedAcceptanceRate} /><Metric label="Acceptance lift" value={aggregate.acceptanceLift} signed /></div>
    <details><summary>Promedios RAW vs PRESERVED</summary><AggregateTable entries={[["TOTAL", aggregate]]} /></details>
    <details><summary>Estratificación por topología</summary><AggregateTable entries={Object.entries(report.byTopology)} /></details>
    <details><summary>Estratificación por tipo de tarea</summary><AggregateTable entries={Object.entries(report.byTaskType)} /></details>
    <details><summary>Análisis observacional de banda acoplada</summary><AggregateTable entries={Object.entries(report.byCoupledBand)} /></details>
    <p className="metric-disclaimer">{aggregate.caseCount} casos completos. Las métricas de píxel no implican corrección semántica.</p></section>;
}

function AggregateTable({ entries }: { entries: Array<[string, Aggregate]> }) {
  return <div className="study-table-wrap"><table><thead><tr><th>Estrato</th><th>N</th><th>Pref. PRES</th><th>Pref. RAW</th><th>Accept RAW</th><th>Accept PRES</th><th>Lift</th>{ratingDimensions.flatMap((item) => [<th key={`${item.key}-raw`}>{item.label} RAW</th>, <th key={`${item.key}-pres`}>{item.label} PRES</th>])}</tr></thead><tbody>{entries.map(([name, item]) => <tr key={name}><th>{name}</th><td>{item.caseCount}</td><td>{percent(item.preservedPreferenceRate)}</td><td>{percent(item.rawPreferenceRate)}</td><td>{percent(item.rawAcceptanceRate)}</td><td>{percent(item.preservedAcceptanceRate)}</td><td>{percent(item.acceptanceLift)}</td>{ratingDimensions.flatMap((dimension) => [<td key={`${dimension.key}-raw`}>{decimal(item.averageRatings.RAW[dimension.key])}</td>, <td key={`${dimension.key}-pres`}>{decimal(item.averageRatings.PRESERVED[dimension.key])}</td>])}</tr>)}</tbody></table></div>;
}

function Metric({ label, value, signed = false }: { label: string; value: number | null; signed?: boolean }) {
  return <div><span>{label}</span><strong>{value === null ? "—" : `${signed && value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`}</strong></div>;
}

function percent(value: number | null) { return value === null ? "—" : `${(value * 100).toFixed(1)}%`; }
function decimal(value: number | null | undefined) { return value == null ? "—" : value.toFixed(2); }

function message(error: unknown) { return error instanceof Error ? error.message : "Error inesperado."; }
