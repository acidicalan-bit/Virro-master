import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { calculateDiffMetrics, DIFF_METHODOLOGY_VERSION, CHANGED_PIXEL_THRESHOLD } from "@/src/infrastructure/evidence/image-diff-calculator";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== BUILD 003.2 Supabase Smoke Test ===\n");

  // 1. Read and decode PNGs
  const sourcePath = resolve("smoke-source.png");
  const candidatePath = resolve("smoke-candidate.png");
  const sourceBuffer = readFileSync(sourcePath);
  const candidateBuffer = readFileSync(candidatePath);

  console.log("Source:", sourceBuffer.length, "bytes");
  console.log("Candidate:", candidateBuffer.length, "bytes");

  const sourcePixels = decodePngToPixels(sourceBuffer);
  const candidatePixels = decodePngToPixels(candidateBuffer);

  console.log("Source pixels:", sourcePixels.width, "x", sourcePixels.height);
  console.log("Candidate pixels:", candidatePixels.width, "x", candidatePixels.height);

  // 2. Compute hashes
  const sourceHash = createHash("sha256").update(sourceBuffer).digest("hex");
  const candidateHash = createHash("sha256").update(candidateBuffer).digest("hex");
  console.log("Source SHA-256:", sourceHash.substring(0, 16) + "...");
  console.log("Candidate SHA-256:", candidateHash.substring(0, 16) + "...");

  // 3. Calculate diff metrics
  const roi = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 };
  const metrics = calculateDiffMetrics(sourcePixels, candidatePixels, roi, sourceHash, candidateHash);

  console.log("\n=== Diff Metrics ===");
  console.log("Methodology:", metrics.methodology);
  console.log("Threshold:", CHANGED_PIXEL_THRESHOLD);
  console.log("normalizedTotalDiff:", metrics.normalizedTotalDiff.toFixed(9));
  console.log("normalizedRoiDiff:", metrics.normalizedRoiDiff.toFixed(9));
  console.log("normalizedOutsideRoiDiff:", metrics.normalizedOutsideRoiDiff.toFixed(9));
  console.log("changedPixelRatioTotal:", metrics.changedPixelRatioTotal.toFixed(9));
  console.log("changedPixelRatioInside:", metrics.changedPixelRatioInside.toFixed(9));
  console.log("changedPixelRatioOutside:", metrics.changedPixelRatioOutside.toFixed(9));

  // 4. Upload source to Supabase Storage
  const storageKey = `sources/smoke-test/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storageKey, sourceBuffer, { contentType: "image/png", upsert: false });

  if (uploadError) {
    console.log("\n[WARN] Storage upload failed:", uploadError.message);
    console.log("(Bucket 'media' may not exist yet — skipping storage test)");
  } else {
    console.log("\nUploaded source to storage:", storageKey);
  }

  // 5. Create evidence receipt in Supabase
  const receiptId = crypto.randomUUID();
  const { error: receiptError } = await supabase
    .from("evidence_receipts")
    .insert({
      id: receiptId,
      transaction_id: "00000000-0000-0000-0000-000000000000",
      execution_run_id: "00000000-0000-0000-0000-000000000000",
      type: "image_edit",
      schema_version: "precision-edit-v0.1",
    })
    .select()
    .single();

  if (receiptError) {
    console.log("\n[ERROR] Evidence receipt insert failed:", receiptError.message);
    console.log("Code:", receiptError.code);
    process.exit(1);
  }
  console.log("\nCreated evidence receipt:", receiptId.substring(0, 8));

  // 6. Create image evidence in Supabase
  const evidenceId = crypto.randomUUID();
  const { error: evidenceError } = await supabase
    .from("image_evidence")
    .insert({
      id: evidenceId,
      evidence_receipt_id: receiptId,
      source_hash: sourceHash,
      candidate_hash: candidateHash,
      source_width: metrics.sourceWidth,
      source_height: metrics.sourceHeight,
      candidate_width: metrics.candidateWidth,
      candidate_height: metrics.candidateHeight,
      normalized_total_diff: metrics.normalizedTotalDiff,
      normalized_roi_diff: metrics.normalizedRoiDiff,
      normalized_outside_roi_diff: metrics.normalizedOutsideRoiDiff,
      changed_pixel_ratio_total: metrics.changedPixelRatioTotal,
      changed_pixel_ratio_inside: metrics.changedPixelRatioInside,
      changed_pixel_ratio_outside: metrics.changedPixelRatioOutside,
      methodology: metrics.methodology,
    })
    .select()
    .single();

  if (evidenceError) {
    console.log("\n[ERROR] Image evidence insert failed:", evidenceError.message);
    console.log("Code:", evidenceError.code);
    process.exit(1);
  }
  console.log("Created image evidence:", evidenceId.substring(0, 8));

  // 7. Read back from Supabase
  const { data: readBack, error: readError } = await supabase
    .from("image_evidence")
    .select("*")
    .eq("id", evidenceId)
    .single();

  if (readError || !readBack) {
    console.log("\n[ERROR] Read back failed:", readError?.message);
    process.exit(1);
  }

  console.log("\n=== Round-Trip Verification ===");
  const checks = [
    ["source_hash", readBack.source_hash === sourceHash],
    ["candidate_hash", readBack.candidate_hash === candidateHash],
    ["methodology", readBack.methodology === DIFF_METHODOLOGY_VERSION],
    ["changed_pixel_ratio_total", Number(readBack.changed_pixel_ratio_total) === metrics.changedPixelRatioTotal],
    ["changed_pixel_ratio_inside", Number(readBack.changed_pixel_ratio_inside) === metrics.changedPixelRatioInside],
    ["changed_pixel_ratio_outside", Number(readBack.changed_pixel_ratio_outside) === metrics.changedPixelRatioOutside],
    ["normalized_total_diff", Number(readBack.normalized_total_diff) === metrics.normalizedTotalDiff],
  ];

  let allPass = true;
  for (const [name, pass] of checks) {
    console.log(pass ? "[PASS]" : "[FAIL]", name);
    if (!pass) allPass = false;
  }

  console.log(allPass ? "\nALL CHECKS PASS" : "\nSOME CHECKS FAILED");
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
