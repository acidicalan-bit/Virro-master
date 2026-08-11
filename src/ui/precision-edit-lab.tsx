"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Project = { id: string; name: string };
type Asset = { id: string; projectId: string; name: string; currentVersionId: string | null };
type Version = { id: string; versionNumber: number; state: Record<string, unknown>; parentVersionId: string | null };

export function PrecisionEditLab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedTx] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [assetName, setAssetName] = useState("");
  const [instruction, setInstruction] = useState("Quita el vaso.");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [roi, setRoi] = useState({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 });
  const [isDrawing, setIsDrawing] = useState(false);

  async function api(action: string, data: Record<string, unknown> = {}) {
    setError(null);
    try {
      const res = await fetch("/api/precision-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Error");
      return body;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      return null;
    }
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = image;
    if (!canvas || !img) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(roi.x * img.width, roi.y * img.height, roi.width * img.width, roi.height * img.height);
  }, [image, roi]);

  useEffect(() => {
    fetch("/api/precision-edit")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setAssets(data.assets || []);
        setVersions(data.versions || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => { setImage(img); };
    img.src = URL.createObjectURL(file);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!image) return;
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRoi({ x, y, width: 0, height: 0 });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !image) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRoi((prev) => ({ ...prev, width: Math.max(0, x - prev.x), height: Math.max(0, y - prev.y) }));
  }

  function handleMouseUp() { setIsDrawing(false); }

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Precision Edit Lab</h1>
      {error && <div style={{ color: "red", padding: "10px", background: "#fee", borderRadius: "4px", marginBottom: "10px" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <h2>1. Project & Asset</h2>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" style={{ width: "100%", padding: "8px", marginBottom: "8px" }} />
          <button onClick={async () => { const d = await api("createProject", { name: projectName }); if (d) { setSelectedProject(d.project.id); setProjectName(""); } }} style={{ padding: "8px 16px" }}>Create Project</button>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "8px" }}>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <h2>2. Upload Image</h2>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          <input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Asset name" style={{ width: "100%", padding: "8px", marginTop: "8px" }} />
          <button onClick={async () => { if (!image) return; const d = await api("createAsset", { projectId: selectedProject, name: assetName }); if (d) { setSelectedAsset(d.asset.id); setAssetName(""); } }} style={{ padding: "8px 16px", marginTop: "8px" }}>Upload</button>
        </div>

        <div>
          <h2>3. ROI Selection</h2>
          <canvas ref={canvasRef} style={{ border: "1px solid #ccc", maxWidth: "100%", cursor: "crosshair" }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} />
          <p>ROI: x={roi.x.toFixed(2)}, y={roi.y.toFixed(2)}, w={roi.width.toFixed(2)}, h={roi.height.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2>4. Edit Instruction</h2>
        <input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Edit instruction" style={{ width: "100%", padding: "8px" }} />
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button onClick={async () => { const asset = assets.find((a) => a.id === selectedAsset); if (!asset?.currentVersionId) return; await api("createTransaction", { projectId: selectedProject, assetId: selectedAsset, baseVersionId: asset.currentVersionId, rawRequest: instruction }); }}>Create Tx</button>
          <button onClick={async () => { if (!selectedTx) return; await api("executeTransaction", { transactionId: selectedTx, instruction, roi }); }}>Execute</button>
          <button onClick={async () => { if (!selectedTx) return; await api("verifyTransaction", { transactionId: selectedTx }); }}>Verify</button>
          <button onClick={async () => { if (!selectedTx) return; await api("commitTransaction", { transactionId: selectedTx }); }}>Commit</button>
          <button onClick={async () => { if (!selectedTx) return; await api("rejectTransaction", { transactionId: selectedTx }); }}>Reject</button>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2>5. Version History</h2>
        <div style={{ maxHeight: "200px", overflow: "auto", background: "#f5f5f5", padding: "10px" }}>
          {versions.map((v) => (
            <div key={v.id} style={{ marginBottom: "8px", padding: "4px", background: "white" }}>
              <strong>v{v.versionNumber}</strong> ({v.id.slice(0, 8)})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
