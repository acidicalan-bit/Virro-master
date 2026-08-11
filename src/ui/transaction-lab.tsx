"use client";

import { useState, useEffect, type FormEvent } from "react";

type Project = { id: string; name: string; description: string | null };
type Asset = { id: string; projectId: string; name: string; currentVersionId: string | null };
type Transaction = { id: string; status: string; rawRequest: string; assetId: string; baseVersionId: string };
type Version = { id: string; versionNumber: number; state: Record<string, unknown>; parentVersionId: string | null };

type TxDetails = {
  transaction: Transaction;
  partialIntents: Array<{ id: string; rawInput: string; targetPath: string; operation: string; desiredValue: unknown }>;
  patches: Array<{ id: string; operation: string; targetPath: string; parameters: Record<string, unknown> }>;
  leases: Array<{ id: string; targetPath: string; category: string; reason: string | null }>;
  executions: Array<{ id: string; status: string; executor: string; costUsd: number }>;
  evidence: Array<{ id: string; operation: string; target: string; success: boolean; observedEffect: unknown }>;
  verifications: Array<{ id: string; status: string; checks: Record<string, boolean> }>;
  commits: Array<{ id: string; newVersionId: string; previousVersionId: string }>;
  costs: Array<{ id: string; amountUsd: number; description: string }>;
};

export function TransactionLab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [selectedTx, setSelectedTx] = useState<string>("");
  const [txDetails, setTxDetails] = useState<TxDetails | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");

  // Form state
  const [projectName, setProjectName] = useState("");
  const [assetName, setAssetName] = useState("");
  const [initialState, setInitialState] = useState('{\n  "jacket": {\n    "color": "blue"\n  }\n}');
  const [rawRequest, setRawRequest] = useState("Solo cambia la chamarra a negra.");
  const [targetPath, setTargetPath] = useState("jacket.color");
  const [operation, setOperation] = useState("SET_ATTRIBUTE");
  const [desiredValue, setDesiredValue] = useState('"black"');
  const [leaseTarget, setLeaseTarget] = useState("jacket");
  const [leaseCategory, setLeaseCategory] = useState("MUTABLE");
  const [rollbackVersionId, setRollbackVersionId] = useState("");

  async function api(action: string, data: Record<string, unknown> = {}) {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/transaction-lab", {
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
    } finally {
      setStatus("idle");
    }
  }

  async function refresh() {
    const res = await fetch("/api/transaction-lab");
    const data = await res.json();
    setProjects(data.projects || []);
    setAssets(data.assets || []);
    setTransactions(data.transactions || []);
  }

  useEffect(() => {
    fetch("/api/transaction-lab")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setAssets(data.assets || []);
        setTransactions(data.transactions || []);
      })
      .catch(() => {});
  }, []);

  async function loadTxDetails(txId: string) {
    const data = await api("getTransactionDetails", { transactionId: txId });
    if (data) setTxDetails(data);
  }

  async function loadVersions(assetId: string) {
    const data = await api("getVersionHistory", { assetId });
    if (data) setVersions(data.versions);
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    const data = await api("createProject", { name: projectName });
    if (data) {
      setSelectedProject(data.project.id);
      setProjectName("");
      await refresh();
    }
  }

  async function handleCreateAsset(e: FormEvent) {
    e.preventDefault();
    const data = await api("createAsset", {
      projectId: selectedProject,
      name: assetName,
      initialState,
    });
    if (data) {
      setSelectedAsset(data.asset.id);
      setAssetName("");
      await refresh();
      await loadVersions(data.asset.id);
    }
  }

  async function handleCreateTx(e: FormEvent) {
    e.preventDefault();
    const asset = assets.find((a) => a.id === selectedAsset);
    if (!asset?.currentVersionId) {
      setError("El activo no tiene versión actual");
      return;
    }
    const data = await api("createTransaction", {
      projectId: selectedProject,
      assetId: selectedAsset,
      baseVersionId: asset.currentVersionId,
      rawRequest,
    });
    if (data) {
      setSelectedTx(data.transaction.id);
      await refresh();
      await loadTxDetails(data.transaction.id);
    }
  }

  async function handlePrepare() {
    const data = await api("prepareTransaction", {
      transactionId: selectedTx,
      rawInput: rawRequest,
      targetPath,
      operation,
      desiredValue: JSON.parse(desiredValue),
      mutationLeases: [{ targetPath: leaseTarget, category: leaseCategory }],
    });
    if (data) {
      await refresh();
      await loadTxDetails(selectedTx);
    }
  }

  async function handleExecute() {
    const data = await api("executeTransaction", { transactionId: selectedTx });
    if (data) {
      await refresh();
      await loadTxDetails(selectedTx);
    }
  }

  async function handleVerify() {
    const data = await api("verifyTransaction", { transactionId: selectedTx });
    if (data) {
      await refresh();
      await loadTxDetails(selectedTx);
    }
  }

  async function handleCommit() {
    const data = await api("commitTransaction", { transactionId: selectedTx });
    if (data) {
      await refresh();
      await loadTxDetails(selectedTx);
      if (selectedAsset) await loadVersions(selectedAsset);
    }
  }

  async function handleAbort() {
    const data = await api("abortTransaction", { transactionId: selectedTx });
    if (data) {
      await refresh();
      await loadTxDetails(selectedTx);
    }
  }

  async function handleRollback() {
    const data = await api("rollbackTransaction", {
      transactionId: selectedTx,
      targetVersionId: rollbackVersionId,
    });
    if (data) {
      await refresh();
      if (selectedAsset) await loadVersions(selectedAsset);
    }
  }

  const statusColors: Record<string, string> = {
    DRAFT: "gray",
    PREPARED: "blue",
    READY: "cyan",
    EXECUTING: "yellow",
    VERIFYING: "orange",
    REPAIRING: "orange",
    VERIFIED: "green",
    COMMITTED: "green",
    FAILED: "red",
    ABORTED: "red",
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Transaction Lab</h1>
      {error && <div style={{ color: "red", padding: "10px", background: "#fee", borderRadius: "4px", marginBottom: "10px" }}>{error}</div>}
      {status === "loading" && <div style={{ color: "blue" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <h2>1. Project</h2>
          <form onSubmit={handleCreateProject}>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" style={{ width: "100%", padding: "8px", marginBottom: "8px" }} />
            <button type="submit" style={{ padding: "8px 16px" }}>Create Project</button>
          </form>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "8px" }}>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <h2>2. Asset</h2>
          <form onSubmit={handleCreateAsset}>
            <input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Asset name" style={{ width: "100%", padding: "8px", marginBottom: "8px" }} />
            <textarea value={initialState} onChange={(e) => setInitialState(e.target.value)} rows={6} style={{ width: "100%", padding: "8px", marginBottom: "8px", fontFamily: "monospace" }} />
            <button type="submit" disabled={!selectedProject} style={{ padding: "8px 16px" }}>Create Asset</button>
          </form>
          <select value={selectedAsset} onChange={(e) => { setSelectedAsset(e.target.value); loadVersions(e.target.value); }} style={{ width: "100%", padding: "8px", marginTop: "8px" }}>
            <option value="">Select asset</option>
            {assets.filter((a) => a.projectId === selectedProject).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <h2>3. Version History</h2>
          <div style={{ maxHeight: "200px", overflow: "auto", background: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
            {versions.map((v) => (
              <div key={v.id} style={{ marginBottom: "8px", padding: "4px", background: "white", borderRadius: "2px" }}>
                <strong>v{v.versionNumber}</strong> ({v.id.slice(0, 8)})<br />
                <pre style={{ margin: 0, fontSize: "11px" }}>{JSON.stringify(v.state, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2>4. Transaction</h2>
          <form onSubmit={handleCreateTx}>
            <textarea value={rawRequest} onChange={(e) => setRawRequest(e.target.value)} rows={2} style={{ width: "100%", padding: "8px", marginBottom: "8px" }} placeholder="Raw human request" />
            <button type="submit" disabled={!selectedAsset} style={{ padding: "8px 16px" }}>Create Transaction</button>
          </form>

          <select value={selectedTx} onChange={(e) => { setSelectedTx(e.target.value); loadTxDetails(e.target.value); }} style={{ width: "100%", padding: "8px", marginTop: "8px" }}>
            <option value="">Select transaction</option>
            {transactions.filter((t) => t.assetId === selectedAsset).map((t) => (
              <option key={t.id} value={t.id}>{t.id.slice(0, 8)} [{t.status}] {t.rawRequest.slice(0, 30)}</option>
            ))}
          </select>

          {txDetails && (
            <div style={{ marginTop: "16px" }}>
              <h3>Status: <span style={{ color: statusColors[txDetails.transaction.status] || "black" }}>{txDetails.transaction.status}</span></h3>
              <p><strong>Base:</strong> {txDetails.transaction.baseVersionId.slice(0, 8)}</p>

              <h4>Partial Intent</h4>
              {txDetails.partialIntents.map((pi) => (
                <div key={pi.id} style={{ background: "#eef", padding: "8px", borderRadius: "4px", marginBottom: "4px" }}>
                  <code>{pi.operation}</code> {pi.targetPath} = {JSON.stringify(pi.desiredValue)}
                </div>
              ))}

              <h4>Semantic Patch</h4>
              {txDetails.patches.map((p) => (
                <div key={p.id} style={{ background: "#efe", padding: "8px", borderRadius: "4px", marginBottom: "4px" }}>
                  <code>{p.operation}</code> {p.targetPath}
                </div>
              ))}

              <h4>Mutation Leases</h4>
              {txDetails.leases.map((l) => (
                <div key={l.id} style={{ background: "#ffe", padding: "8px", borderRadius: "4px", marginBottom: "4px" }}>
                  <code>{l.category}</code> {l.targetPath}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "20px", padding: "16px", background: "#f5f5f5", borderRadius: "4px" }}>
        <h2>5. Actions</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          <input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} placeholder="target.path" style={{ padding: "8px", width: "150px" }} />
          <select value={operation} onChange={(e) => setOperation(e.target.value)} style={{ padding: "8px" }}>
            <option>SET_ATTRIBUTE</option>
            <option>DELETE_ENTITY</option>
            <option>TRANSFORM_ENTITY</option>
            <option>ADJUST_ATTRIBUTE</option>
          </select>
          <input value={desiredValue} onChange={(e) => setDesiredValue(e.target.value)} placeholder="value" style={{ padding: "8px", width: "100px" }} />
          <input value={leaseTarget} onChange={(e) => setLeaseTarget(e.target.value)} placeholder="lease target" style={{ padding: "8px", width: "120px" }} />
          <select value={leaseCategory} onChange={(e) => setLeaseCategory(e.target.value)} style={{ padding: "8px" }}>
            <option>MUTABLE</option>
            <option>COUPLED</option>
            <option>PRESERVE</option>
            <option>HARD_LOCK</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handlePrepare} disabled={!selectedTx} style={{ padding: "8px 16px", background: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>Prepare</button>
          <button onClick={handleExecute} disabled={!selectedTx} style={{ padding: "8px 16px", background: "#ffc107", border: "none", borderRadius: "4px" }}>Execute</button>
          <button onClick={handleVerify} disabled={!selectedTx} style={{ padding: "8px 16px", background: "#fd7e14", color: "white", border: "none", borderRadius: "4px" }}>Verify</button>
          <button onClick={handleCommit} disabled={!selectedTx} style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>Commit</button>
          <button onClick={handleAbort} disabled={!selectedTx} style={{ padding: "8px 16px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px" }}>Abort</button>
        </div>

        <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={rollbackVersionId} onChange={(e) => setRollbackVersionId(e.target.value)} style={{ padding: "8px", flex: 1 }}>
            <option value="">Select version to rollback to</option>
            {versions.map((v) => <option key={v.id} value={v.id}>v{v.versionNumber} ({v.id.slice(0, 8)})</option>)}
          </select>
          <button onClick={handleRollback} disabled={!selectedTx || !rollbackVersionId} style={{ padding: "8px 16px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}>Rollback</button>
        </div>
      </div>

      {txDetails && (
        <div style={{ marginTop: "20px" }}>
          <h2>6. Evidence & Verification</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <h3>Evidence</h3>
              {txDetails.evidence.map((e) => (
                <div key={e.id} style={{ background: e.success ? "#dfd" : "#fdd", padding: "8px", borderRadius: "4px", marginBottom: "4px" }}>
                  <code>{e.operation}</code> {e.target} → {JSON.stringify(e.observedEffect)}
                </div>
              ))}
            </div>
            <div>
              <h3>Verification</h3>
              {txDetails.verifications.map((v) => (
                <div key={v.id} style={{ background: v.status === "PASSED" ? "#dfd" : "#fdd", padding: "8px", borderRadius: "4px", marginBottom: "4px" }}>
                  <strong>{v.status}</strong>
                  <pre style={{ fontSize: "11px" }}>{JSON.stringify(v.checks, null, 2)}</pre>
                </div>
              ))}
            </div>
            <div>
              <h3>Costs</h3>
              {txDetails.costs.map((c) => (
                <div key={c.id} style={{ background: "#eef", padding: "8px", borderRadius: "4px", marginBottom: "4px" }}>
                  ${c.amountUsd.toFixed(6)} — {c.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
