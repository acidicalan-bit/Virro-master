import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import { FakeExecutor } from "@/src/infrastructure/executors/fake-executor";
import { OutcomeTransactionService } from "@/src/application/outcome/outcome-transaction-service";
import type { RepositoryBundle } from "@/src/application/ports/repositories";

const repos = getInMemoryOutcomeRepositories();
const executor = new FakeExecutor();
const service = new OutcomeTransactionService(repos as unknown as RepositoryBundle, executor);

async function runScenarioA() {
  console.log("\n=== SCENARIO A: HAPPY PATH ===");
  const project = await service.createProject({ name: "Test Project A" });
  const { asset, version: v1 } = await service.createAsset({
    projectId: project.id,
    name: "Test Asset A",
    initialState: { jacket: { color: "blue" } },
  });
  console.log("v1 created:", v1.id.substring(0, 8), "state:", JSON.stringify(v1.state));

  const tx = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Solo cambia la chamarra a negra.",
  });

  await service.prepareTransaction({
    transactionId: tx.id,
    partialIntent: { rawInput: "Solo cambia la chamarra a negra.", targetPath: "jacket.color", operation: "SET_ATTRIBUTE", desiredValue: "black" },
    mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
  });

  const execResults = await service.executeTransaction(tx.id);
  console.log("Executed. Evidence:", execResults[0].evidence.id.substring(0, 8));

  const verification = await service.verifyTransaction({ transactionId: tx.id });
  console.log("Verification:", verification.status);

  const commitResult = await service.commitTransaction({ transactionId: tx.id });
  console.log("Committed. New version:", commitResult.newVersion.versionNumber, "state:", JSON.stringify(commitResult.newVersion.state));

  const { version: current } = await service.getAssetState(asset.id);
  console.log("Current head:", current.versionNumber, "state:", JSON.stringify(current.state));

  const isPass = commitResult.newVersion.versionNumber === 2 && JSON.stringify(commitResult.newVersion.state) === JSON.stringify({ jacket: { color: "black" } });
  console.log(isPass ? "[PASS]" : "[FAIL]");
  return isPass;
}

async function runScenarioB() {
  console.log("\n=== SCENARIO B: HARD LOCK ===");
  const project = await service.createProject({ name: "Test Project B" });
  const { asset, version: v1 } = await service.createAsset({
    projectId: project.id,
    name: "Test Asset B",
    initialState: { face: { eyes: "blue" } },
  });

  const tx = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Cambia los ojos.",
  });

  try {
    await service.prepareTransaction({
      transactionId: tx.id,
      partialIntent: { rawInput: "Cambia los ojos.", targetPath: "face.eyes", operation: "SET_ATTRIBUTE", desiredValue: "green" },
      mutationLeases: [{ targetPath: "face", category: "HARD_LOCK" }],
    });
    console.log("[FAIL] Should have thrown");
    return false;
  } catch (e) {
    console.log("Blocked:", e instanceof Error ? e.message : "Error");
    const { version: current } = await service.getAssetState(asset.id);
    const isPass = current.versionNumber === 1;
    console.log(isPass ? "[PASS]" : "[FAIL]");
    return isPass;
  }
}

async function runScenarioC() {
  console.log("\n=== SCENARIO C: NO PROOF, NO COMMIT ===");
  const project = await service.createProject({ name: "Test Project C" });
  const { asset, version: v1 } = await service.createAsset({
    projectId: project.id,
    name: "Test Asset C",
    initialState: { jacket: { color: "blue" } },
  });

  const tx = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Solo cambia la chamarra a negra.",
  });
  await service.prepareTransaction({
    transactionId: tx.id,
    partialIntent: { rawInput: "Solo cambia la chamarra a negra.", targetPath: "jacket.color", operation: "SET_ATTRIBUTE", desiredValue: "black" },
    mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
  });

  try {
    await service.commitTransaction({ transactionId: tx.id });
    console.log("[FAIL] Should have thrown");
    return false;
  } catch (e) {
    console.log("Commit blocked:", e instanceof Error ? e.message : "Error");
    console.log("[PASS]");
    return true;
  }
}

async function runScenarioD() {
  console.log("\n=== SCENARIO D: FAILED VERIFICATION ===");
  const project = await service.createProject({ name: "Test Project D" });
  const { asset, version: v1 } = await service.createAsset({
    projectId: project.id,
    name: "Test Asset D",
    initialState: { jacket: { color: "blue" } },
  });

  const tx = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Solo cambia la chamarra a negra.",
  });

  await service.prepareTransaction({
    transactionId: tx.id,
    partialIntent: { rawInput: "Solo cambia la chamarra a negra.", targetPath: "jacket.color", operation: "SET_ATTRIBUTE", desiredValue: "black" },
    mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
  });

  await service.executeTransaction(tx.id);
  await repos.outcomeTransactions.updateStatus(tx.id, "FAILED");

  try {
    await service.commitTransaction({ transactionId: tx.id });
    console.log("[FAIL] Should have thrown");
    return false;
  } catch (e) {
    console.log("Commit blocked:", e instanceof Error ? e.message : "Error");
    const { version: current } = await service.getAssetState(asset.id);
    const isPass = current.versionNumber === 1;
    console.log(isPass ? "[PASS]" : "[FAIL]");
    return isPass;
  }
}

async function runScenarioE() {
  console.log("\n=== SCENARIO E: STALE WRITE ===");
  const project = await service.createProject({ name: "Test Project E" });
  const { asset, version: v1 } = await service.createAsset({
    projectId: project.id,
    name: "Test Asset E",
    initialState: { jacket: { color: "blue" } },
  });

  const t1 = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Solo cambia la chamarra a negra.",
  });
  await service.prepareTransaction({
    transactionId: t1.id,
    partialIntent: { rawInput: "Solo cambia la chamarra a negra.", targetPath: "jacket.color", operation: "SET_ATTRIBUTE", desiredValue: "black" },
    mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
  });

  const t2 = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Cambia la chamarra a roja.",
  });
  await service.prepareTransaction({
    transactionId: t2.id,
    partialIntent: { rawInput: "Cambia la chamarra a roja.", targetPath: "jacket.color", operation: "SET_ATTRIBUTE", desiredValue: "red" },
    mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
  });
  await service.executeTransaction(t2.id);
  await service.verifyTransaction({ transactionId: t2.id });
  await service.commitTransaction({ transactionId: t2.id });

  console.log("T2 committed. Head should be v2.");

  await service.executeTransaction(t1.id);
  try {
    await service.verifyTransaction({ transactionId: t1.id });
    await service.commitTransaction({ transactionId: t1.id });
    console.log("[FAIL] Should have thrown stale conflict");
    return false;
  } catch (e) {
    console.log("T1 commit blocked (stale):", e instanceof Error ? e.message : "Error");
    const { version: current } = await service.getAssetState(asset.id);
    const isPass = current.versionNumber === 2 && JSON.stringify(current.state) === JSON.stringify({ jacket: { color: "red" } });
    console.log(isPass ? "[PASS]" : "[FAIL]");
    return isPass;
  }
}

async function runScenarioF() {
  console.log("\n=== SCENARIO F: ROLLBACK ===");
  const project = await service.createProject({ name: "Test Project F" });
  const { asset, version: v1 } = await service.createAsset({
    projectId: project.id,
    name: "Test Asset F",
    initialState: { jacket: { color: "blue" } },
  });

  const tx = await service.createTransaction({
    projectId: project.id,
    assetId: asset.id,
    baseVersionId: v1.id,
    rawRequest: "Solo cambia la chamarra a negra.",
  });
  await service.prepareTransaction({
    transactionId: tx.id,
    partialIntent: { rawInput: "Solo cambia la chamarra a negra.", targetPath: "jacket.color", operation: "SET_ATTRIBUTE", desiredValue: "black" },
    mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
  });
  await service.executeTransaction(tx.id);
  await service.verifyTransaction({ transactionId: tx.id });
  await service.commitTransaction({ transactionId: tx.id });

  console.log("v2 committed. Now rollback to v1 state.");

  const rollbackVersion = await service.rollbackTransaction({
    transactionId: tx.id,
    targetVersionId: v1.id,
  });

  const allVersions = await repos.assetVersions.findByAssetId(asset.id);
  console.log("History:", allVersions.map((v) => "v" + v.versionNumber + "(" + v.id.substring(0, 8) + ")").join(" -> "));

  const isPass = rollbackVersion.versionNumber === 3 && JSON.stringify(rollbackVersion.state) === JSON.stringify({ jacket: { color: "blue" } }) && allVersions.length === 3;
  console.log(isPass ? "[PASS]" : "[FAIL]");
  return isPass;
}

async function main() {
  const results: Record<string, boolean> = {};
  results.A = await runScenarioA();
  results.B = await runScenarioB();
  results.C = await runScenarioC();
  results.D = await runScenarioD();
  results.E = await runScenarioE();
  results.F = await runScenarioF();

  console.log("\n=== FINAL RESULTS ===");
  for (const [k, v] of Object.entries(results)) {
    console.log("Scenario " + k + ": " + (v ? "[PASS]" : "[FAIL]"));
  }
  const allPass = Object.values(results).every(Boolean);
  console.log(allPass ? "\nALL SCENARIOS PASS" : "\nSOME SCENARIOS FAILED");
}

main().catch(console.error);
