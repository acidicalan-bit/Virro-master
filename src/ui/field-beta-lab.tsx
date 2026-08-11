"use client";

import { useState } from "react";
import NextImage from "next/image";

type Result = {
  fieldOutcome: { id: string; outcomeSku: string; blueprintVersion: number; blueprintHash: string; taskSpecVersion: number; taskSpecHash: string; provider: string; model: string; policyVersion: string; providerCostUsd: number | null; machineVerificationStatus: string; sameSpecStatus: string };
  delivered: { url: string; width: number; height: number };
  source: { url: string };
  humanFeedback: { humanAccepted: boolean; failureTags: string[]; humanCorrection: string | null } | null;
};

const failureTags = ["REQUESTED_EDIT_FAILED", "OVER_PRESERVATION", "UNDER_PRESERVATION", "SEMANTIC_MISMATCH", "VISUAL_QUALITY", "ARTIFACT", "INSTRUCTION_MISUNDERSTANDING", "OTHER"];

export function FieldBetaLab() {
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("Cambia únicamente la chamarra a negra.");
  const [result, setResult] = useState<Result | null>(null);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setWorking(true); setError(null); setResult(null); setAccepted(null); setSaved(false); setTags([]); setNote("");
    try {
      const response = await request({ action: "run", projectName: "BUILD 005-B Field Lab", assetName: file.name, instruction, sourceMimeType: "image/png", sourceBase64: await toBase64(file), roi: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, topology: "LOCAL_INDEPENDENT", taskType: "OTHER" });
      setResult(response.result as Result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo ejecutar el beta."); } finally { setWorking(false); }
  }

  async function saveAcceptance(value: boolean) {
    if (!result || working) return;
    setWorking(true); setError(null);
    try {
      await request({ action: "feedback", fieldOutcomeId: result.fieldOutcome.id, humanAccepted: value, failureTags: value ? [] : tags, humanCorrection: value ? null : note || null });
      setAccepted(value); setSaved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar la aceptación."); } finally { setWorking(false); }
  }

  return <main style={{ maxWidth: 1040, margin: "0 auto", padding: "3rem 1.5rem" }}>
    <p>BUILD 005-B · INTERNAL FIELD LAB</p><h1>Precision Edit Field Beta</h1>
    <p>Flujo interno: fuente → instrucción → región autorizada → ejecución → revisión humana.</p>
    <section style={{ display: "grid", gap: "1rem", maxWidth: 640 }}>
      <label>Fuente PNG<input type="file" accept="image/png,.png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={working} /></label>
      <label>Instrucción<textarea rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={working} /></label>
      <button type="button" onClick={() => void run()} disabled={!file || !instruction.trim() || working}>{working ? "Ejecutando…" : "Ejecutar Field Beta"}</button>
    </section>
    {error ? <p role="alert">{error}</p> : null}
    {result ? <section style={{ marginTop: "2rem" }}>
      <h2>Resultado</h2><NextImage src={result.delivered.url} alt="Resultado entregado" width={result.delivered.width} height={result.delivered.height} unoptimized style={{ maxWidth: "100%", height: "auto" }} />
      <dl><dt>SKU</dt><dd>{result.fieldOutcome.outcomeSku}</dd><dt>Blueprint</dt><dd>v{result.fieldOutcome.blueprintVersion} · {result.fieldOutcome.blueprintHash}</dd><dt>Task Spec</dt><dd>v{result.fieldOutcome.taskSpecVersion} · {result.fieldOutcome.taskSpecHash}</dd><dt>Provider/model</dt><dd>{result.fieldOutcome.provider}/{result.fieldOutcome.model}</dd><dt>Preservation</dt><dd>{result.fieldOutcome.policyVersion}</dd><dt>Machine verification</dt><dd>{result.fieldOutcome.machineVerificationStatus}</dd><dt>Same Spec</dt><dd>{result.fieldOutcome.sameSpecStatus}</dd><dt>Cost</dt><dd>{result.fieldOutcome.providerCostUsd === null ? "UNKNOWN" : `$${result.fieldOutcome.providerCostUsd}`}</dd></dl>
      <h3>¿Aceptarías este resultado?</h3><button type="button" disabled={accepted !== null || working} onClick={() => void saveAcceptance(true)}>YES</button> <button type="button" disabled={accepted !== null || working} onClick={() => setAccepted(false)}>NO</button>
      {accepted === false && !saved ? <fieldset><legend>Motivo</legend>{failureTags.map((tag) => <label key={tag} style={{ display: "block" }}><input type="checkbox" checked={tags.includes(tag)} onChange={(event) => setTags((current) => event.target.checked ? [...current, tag] : current.filter((value) => value !== tag))} /> {tag}</label>)}<textarea placeholder="Nota opcional" value={note} onChange={(event) => setNote(event.target.value)} /><button type="button" disabled={working} onClick={() => void saveAcceptance(false)}>Guardar NO</button></fieldset> : null}
      {saved ? <p role="status">{accepted ? "INTERNAL_HUMAN_SMOKE: YES" : "INTERNAL_HUMAN_SMOKE: NO"}</p> : null}
    </section> : null}
  </main>;
}

async function request(payload: Record<string, unknown>): Promise<Record<string, unknown>> { const response = await fetch("/api/field-beta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json() as Record<string, unknown> & { error?: string }; if (!response.ok) throw new Error(body.error ?? "Field Beta request failed."); return body; }
async function toBase64(file: File): Promise<string> { const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); }
