"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import type { PreservationExperimentView } from "@/src/application/outcome/media/preservation-verification-service";
import {
  PRESERVATION_POLICY_VERSION,
  type CandidatePreference,
} from "@/src/domain/outcome/media/preservation";

type Point = { x: number; y: number };

export function PrecisionEditLab() {
  const [projectName, setProjectName] = useState("Preservation experiment");
  const [assetName, setAssetName] = useState("Source image");
  const [instruction, setInstruction] = useState("Quita el vaso sin cambiar nada más.");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState({ width: 0, height: 0 });
  const [roi, setRoi] = useState({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 });
  const [bandSize, setBandSize] = useState(0.04);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [experiment, setExperiment] = useState<PreservationExperimentView | null>(null);
  const [preference, setPreference] = useState<CandidatePreference | null>(null);
  const [preferenceSaved, setPreferenceSaved] = useState(false);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [committedVersionId, setCommittedVersionId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
  }, [sourcePreview]);

  useEffect(() => {
    const transactionId = new URLSearchParams(window.location.search).get("transactionId");
    if (!transactionId) return;
    let active = true;
    fetch(`/api/precision-edit?transactionId=${encodeURIComponent(transactionId)}`)
      .then(async (response) => {
        const body = await response.json() as { experiment?: PreservationExperimentView; error?: string };
        if (!response.ok || !body.experiment) throw new Error(body.error ?? "No se pudo recuperar el experimento.");
        if (active) setExperiment(body.experiment);
      })
      .catch((caught: unknown) => {
        if (active) setError(message(caught));
      })
    return () => { active = false; };
  }, []);

  const previewZones = useMemo(() => {
    const band = bandSize;
    return {
      core: roi,
      expanded: {
        x: Math.max(0, roi.x - band),
        y: Math.max(0, roi.y - band),
        width: Math.min(1, roi.x + roi.width + band) - Math.max(0, roi.x - band),
        height: Math.min(1, roi.y + roi.height + band) - Math.max(0, roi.y - band),
      },
    };
  }, [bandSize, roi]);

  async function selectFile(file: File | null) {
    setError(null);
    setExperiment(null);
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (!file) {
      setSourceFile(null);
      setSourcePreview(null);
      return;
    }
    if (file.type !== "image/png") {
      setError("BUILD 004 v0.1 acepta únicamente imágenes PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen supera el límite de 10 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => setSourceDimensions({ width: probe.naturalWidth, height: probe.naturalHeight });
    probe.src = url;
    setSourceFile(file);
    setSourcePreview(url);
  }

  function pointerPosition(event: PointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  function startRoi(event: PointerEvent<HTMLDivElement>) {
    if (!sourcePreview || working) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    setDragStart(point);
    setRoi({ x: point.x, y: point.y, width: 0.01, height: 0.01 });
  }

  function moveRoi(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const point = pointerPosition(event);
    setRoi(normalizedRectangle(dragStart, point));
  }

  function finishRoi(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    setRoi(normalizedRectangle(dragStart, pointerPosition(event)));
    setDragStart(null);
  }

  async function runExperiment() {
    if (!sourceFile) return;
    setWorking(true);
    setError(null);
    setExperiment(null);
    setPreference(null);
    setPreferenceSaved(false);
    setDecision(null);
    setCommittedVersionId(null);
    try {
      const response = await api({
        action: "runExperiment",
        projectName,
        assetName,
        instruction,
        sourceMimeType: "image/png",
        sourceBase64: await fileToBase64(sourceFile),
        policy: {
          policyVersion: PRESERVATION_POLICY_VERSION,
          coreRoi: roi,
          coupledBand: { unit: "NORMALIZED_MIN_DIMENSION", size: bandSize },
          outsideMode: "HARD_PRESERVE",
          blendMode: "FEATHERED",
          editRegionChangeThreshold: 0.001,
        },
      });
      setExperiment(response.experiment as PreservationExperimentView);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setWorking(false);
    }
  }

  async function savePreference(value: CandidatePreference) {
    if (!experiment) return;
    setWorking(true);
    setError(null);
    try {
      await api({
        action: "recordPreference",
        transactionId: experiment.transactionId,
        rawCandidateId: experiment.rawCandidateId,
        preservedCandidateId: experiment.preservedCandidateId,
        preference: value,
      });
      setPreference(value);
      setPreferenceSaved(true);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setWorking(false);
    }
  }

  async function decide(action: "approvePreserved" | "reject") {
    if (!experiment || !preferenceSaved) return;
    setWorking(true);
    setError(null);
    try {
      const response = await api({ action, transactionId: experiment.transactionId });
      if (action === "approvePreserved") {
        const commit = response.commit as { newVersion: { id: string } };
        setCommittedVersionId(commit.newVersion.id);
        setDecision("APPROVED");
      } else {
        setDecision("REJECTED");
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="precision-shell">
      <header className="precision-header">
        <p className="eyebrow">BUILD 004 · PRESERVATION &amp; VERIFICATION</p>
        <h1>Precision Edit Lab</h1>
        <p>
          Una generación del proveedor, dos candidatos independientes. Fuera del área autorizada,
          el original se conserva físicamente pixel por pixel.
        </p>
      </header>

      <section className="precision-workbench" aria-labelledby="experiment-title">
        <div className="precision-controls">
          <div>
            <p className="eyebrow">Experimento</p>
            <h2 id="experiment-title">Configura una edición</h2>
          </div>
          <label>
            Imagen fuente PNG
            <input type="file" accept="image/png,.png" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} disabled={working} />
          </label>
          <div className="precision-name-grid">
            <label>Proyecto<input type="text" value={projectName} maxLength={200} onChange={(event) => setProjectName(event.target.value)} /></label>
            <label>Activo<input type="text" value={assetName} maxLength={200} onChange={(event) => setAssetName(event.target.value)} /></label>
          </div>
          <label>
            Instrucción
            <textarea rows={3} value={instruction} maxLength={8000} onChange={(event) => setInstruction(event.target.value)} />
          </label>
          <label>
            Banda acoplada: <strong>{Math.round(bandSize * 100)}%</strong> de la dimensión menor
            <input type="range" min="0" max="0.25" step="0.01" value={bandSize} onChange={(event) => setBandSize(Number(event.target.value))} />
          </label>
          <dl className="roi-readout">
            <div><dt>X</dt><dd>{roi.x.toFixed(3)}</dd></div>
            <div><dt>Y</dt><dd>{roi.y.toFixed(3)}</dd></div>
            <div><dt>Ancho</dt><dd>{roi.width.toFixed(3)}</dd></div>
            <div><dt>Alto</dt><dd>{roi.height.toFixed(3)}</dd></div>
          </dl>
          <button className="primary-button" type="button" disabled={!sourceFile || !instruction.trim() || working} onClick={() => void runExperiment()}>
            {working ? "Ejecutando una generación y verificando…" : "Generar comparación preservada"}
          </button>
        </div>

        <div className="roi-editor">
          <div className="roi-legend" aria-label="Leyenda de zonas">
            <span><i className="legend-core" /> CORE</span>
            <span><i className="legend-coupled" /> COUPLED</span>
            <span><i className="legend-locked" /> LOCKED OUTSIDE</span>
          </div>
          <div
            className="image-stage image-stage--editor"
            ref={imageStageRef}
            onPointerDown={startRoi}
            onPointerMove={moveRoi}
            onPointerUp={finishRoi}
            aria-label="Dibuja el área CORE sobre la imagen"
            style={sourceDimensions.width ? { aspectRatio: `${sourceDimensions.width} / ${sourceDimensions.height}` } : undefined}
          >
            {sourcePreview ? (
              <>
                <NextImage src={sourcePreview} alt="Imagen fuente seleccionada" fill sizes="(max-width: 900px) 100vw, 50vw" loading="eager" unoptimized />
                <ZoneOverlay core={previewZones.core} expanded={previewZones.expanded} />
              </>
            ) : <p>Selecciona un PNG y dibuja el área autorizada.</p>}
          </div>
          {sourceDimensions.width ? <p className="image-dimensions">{sourceDimensions.width} × {sourceDimensions.height} px</p> : null}
        </div>
      </section>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {experiment ? (
        <section className="preservation-results" aria-labelledby="results-title">
          <header>
            <p className="eyebrow">Control experimental</p>
            <h2 id="results-title">Una ejecución, tres vistas</h2>
            <p>RAW permanece intacto. PRESERVED se deriva de RAW mediante composición determinística.</p>
          </header>
          <div className="candidate-triptych">
            <ImageResultCard title="SOURCE" image={experiment.source} zones={experiment.zones} loading="eager" />
            <ImageResultCard title="RAW PROVIDER OUTPUT" image={experiment.raw} zones={experiment.zones} />
            <ImageResultCard title="PRESERVED OUTPUT" image={experiment.preserved} zones={experiment.zones} />
          </div>

          <div className="evidence-grid">
            <EvidencePanel title="RAW" metrics={experiment.rawEvidence} />
            <EvidencePanel title="PRESERVED" metrics={experiment.preservedEvidence} />
          </div>

          <dl className="reduction-strip">
            <div><dt>Reducción fuera bloqueado</dt><dd>{percentage(experiment.outsideChangeReduction)}</dd></div>
            <div><dt>Reducción total</dt><dd>{percentage(experiment.totalChangeReduction)}</dd></div>
            <div><dt>Proveedor</dt><dd>{experiment.provider}/{experiment.model}</dd></div>
            <div><dt>Latencia</dt><dd>{Math.round(experiment.providerLatencyMs)} ms</dd></div>
          </dl>
          <p className="metric-disclaimer">La supresión de cambio de píxeles no demuestra calidad ni corrección semántica.</p>

          <section className="assertion-panel" aria-labelledby="assertions-title">
            <div>
              <p className="eyebrow">Machine verification</p>
              <h3 id="assertions-title">Creative Assertions</h3>
            </div>
            <strong className={experiment.machineVerification.status === "PASSED" ? "status-pass" : "status-fail"}>
              {experiment.machineVerification.status}
            </strong>
            <ul>
              {experiment.machineVerification.assertions.map((assertion) => (
                <li key={assertion.type}><span>{assertion.type}</span><strong>{assertion.passed ? "PASS" : "FAIL"}</strong></li>
              ))}
            </ul>
          </section>

          <section className="human-decision" aria-labelledby="preference-title">
            <div>
              <p className="eyebrow">Evaluación humana</p>
              <h3 id="preference-title">¿Cuál resultado se ve mejor?</h3>
              <p>Esta preferencia no aprueba ni hace commit automáticamente.</p>
            </div>
            <div className="preference-actions">
              {(["RAW", "PRESERVED", "TIE", "BOTH_BAD"] as CandidatePreference[]).map((value) => (
                <button key={value} type="button" className="secondary-button" disabled={working || preferenceSaved} aria-pressed={preference === value} onClick={() => void savePreference(value)}>{preferenceLabel(value)}</button>
              ))}
            </div>
            {preferenceSaved ? (
              <div className="commit-actions">
                <button className="primary-button" type="button" disabled={working || decision !== null || experiment.machineVerification.status !== "PASSED"} onClick={() => void decide("approvePreserved")}>Aprobar PRESERVED y hacer commit</button>
                <button className="secondary-button" type="button" disabled={working || decision !== null} onClick={() => void decide("reject")}>Rechazar</button>
              </div>
            ) : null}
            {decision ? <p className="decision-result" role="status">{decision === "APPROVED" ? `PRESERVED comprometido como versión ${committedVersionId?.slice(0, 8)}.` : "Rechazado. El estado canónico permanece en v1."}</p> : null}
          </section>
        </section>
      ) : null}
    </main>
  );
}

function ImageResultCard({ title, image, zones, loading }: { title: string; image: { url: string; sha256: string; width: number; height: number }; zones: PreservationExperimentView["zones"]; loading?: "eager" | "lazy" }) {
  const normalized = zones ? {
    core: boundsToNormalized(zones.core, zones.imageWidth, zones.imageHeight),
    expanded: boundsToNormalized(zones.expanded, zones.imageWidth, zones.imageHeight),
  } : null;
  return (
    <article className="candidate-card">
      <h3>{title}</h3>
      <div className="image-stage" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
        <NextImage src={image.url} alt={title} fill sizes="(max-width: 780px) 100vw, 33vw" loading={loading} unoptimized />
        {normalized ? <ZoneOverlay core={normalized.core} expanded={normalized.expanded} /> : null}
      </div>
      <p>{image.width} × {image.height}</p>
      <code title={image.sha256}>{image.sha256.slice(0, 16)}…</code>
    </article>
  );
}

function ZoneOverlay({ core, expanded }: { core: { x: number; y: number; width: number; height: number }; expanded: { x: number; y: number; width: number; height: number } }) {
  return (
    <div className="zone-overlay" aria-hidden="true">
      <span className="zone-expanded" style={rectangleStyle(expanded)} />
      <span className="zone-core" style={rectangleStyle(core)} />
    </div>
  );
}

function EvidencePanel({ title, metrics }: { title: string; metrics: PreservationExperimentView["rawEvidence"] }) {
  const rows = [
    ["CORE", metrics.meanCorePixelDiff, metrics.changedPixelRatioCore],
    ["COUPLED", metrics.meanCoupledPixelDiff, metrics.changedPixelRatioCoupled],
    ["LOCKED OUTSIDE", metrics.meanLockedOutsidePixelDiff, metrics.changedPixelRatioLockedOutside],
    ["TOTAL", metrics.meanTotalPixelDiff, metrics.changedPixelRatioTotal],
  ] as const;
  return (
    <article className="evidence-panel">
      <h3>{title}</h3>
      <table>
        <thead><tr><th>Zona</th><th>Diff medio</th><th>Píxeles cambiados</th></tr></thead>
        <tbody>{rows.map(([label, mean, ratio]) => <tr key={label}><th>{label}</th><td>{mean.toFixed(4)}</td><td>{percentage(ratio)}</td></tr>)}</tbody>
      </table>
    </article>
  );
}

async function api(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch("/api/precision-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "No se pudo completar el experimento.");
  return body;
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function normalizedRectangle(start: Point, end: Point) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.max(0.01, Math.min(1 - x, Math.abs(end.x - start.x))),
    height: Math.max(0.01, Math.min(1 - y, Math.abs(end.y - start.y))),
  };
}

function rectangleStyle(rectangle: { x: number; y: number; width: number; height: number }) {
  return { left: `${rectangle.x * 100}%`, top: `${rectangle.y * 100}%`, width: `${rectangle.width * 100}%`, height: `${rectangle.height * 100}%` };
}

function boundsToNormalized(bounds: { x0: number; y0: number; x1: number; y1: number }, width: number, height: number) {
  return { x: bounds.x0 / width, y: bounds.y0 / height, width: (bounds.x1 - bounds.x0) / width, height: (bounds.y1 - bounds.y0) / height };
}

function percentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function preferenceLabel(value: CandidatePreference): string {
  return value === "RAW" ? "RAW mejor" : value === "PRESERVED" ? "PRESERVED mejor" : value === "TIE" ? "Empate" : "Ambos malos";
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado.";
}
