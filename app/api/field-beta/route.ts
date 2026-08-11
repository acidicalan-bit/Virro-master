import { NextResponse } from "next/server";
import { z } from "zod";

import { FieldBetaError } from "@/src/application/outcome/media/field-beta-service";
import { createFieldBetaService } from "@/src/server/field-beta-services";

export const runtime = "nodejs";

const RunSchema = z.object({
  action: z.literal("run"),
  projectName: z.string().trim().min(1).max(200),
  assetName: z.string().trim().min(1).max(200),
  instruction: z.string().trim().min(1).max(8_000),
  sourceBase64: z.string().min(1).max(14_000_000),
  sourceMimeType: z.literal("image/png"),
  roi: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }),
  topology: z.enum(["LOCAL_INDEPENDENT", "LOCAL_COUPLED", "STRUCTURAL", "GLOBAL"]),
  taskType: z.enum(["COLOR_CHANGE", "OBJECT_REMOVAL", "TEXT_EDIT", "IDENTITY_EDIT", "PRODUCT_EDIT", "GEOMETRY_EDIT", "OTHER"]),
  chosenStrategy: z.enum(["P0_RAW", "P1_SOFT", "P2_MODERATE", "P3_HARD"]).nullable().optional(),
  overrideReason: z.string().trim().max(2_000).nullable().optional(),
  tenantId: z.string().trim().min(1).max(120).optional(),
});
const FeedbackSchema = z.object({ action: z.literal("feedback"), fieldOutcomeId: z.uuid(), humanAccepted: z.boolean(), failureTags: z.array(z.string()).max(20).optional(), humanCorrection: z.string().trim().max(8_000).nullable().optional() });
const JudgmentSchema = z.object({ action: z.literal("judgment"), sampleId: z.uuid(), preference: z.enum(["A_BETTER", "B_BETTER", "TIE", "BOTH_BAD"]) });
const RegressionSchema = z.object({ action: z.literal("flagRegression"), fieldOutcomeId: z.uuid(), reason: z.string().trim().min(1).max(4_000) });
const GoldenSchema = z.object({ action: z.literal("promoteGolden"), fieldOutcomeId: z.uuid(), intentExpectation: z.string().trim().min(1).max(8_000), criticalPreservationExpectation: z.string().trim().min(1).max(8_000), promotionReason: z.string().trim().min(1).max(4_000), usageAuthorizationStatus: z.literal("AUTHORIZED_INTERNAL") });
const RequestSchema = z.discriminatedUnion("action", [RunSchema, FeedbackSchema, JudgmentSchema, RegressionSchema, GoldenSchema]);

export async function GET(request: Request) {
  try {
    const service = createFieldBetaService();
    const url = new URL(request.url);
    const transactionId = url.searchParams.get("transactionId");
    if (transactionId) return NextResponse.json({ result: await service.getByTransactionId(z.uuid().parse(transactionId)) });
    return NextResponse.json(await service.getDashboard());
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.parse(await request.json());
    const service = createFieldBetaService();
    if (parsed.action === "run") return NextResponse.json({ result: await service.run({ ...parsed, sourceBytes: new Uint8Array(Buffer.from(parsed.sourceBase64, "base64")) }) });
    if (parsed.action === "feedback") return NextResponse.json({ feedback: await service.recordFeedback(parsed) });
    if (parsed.action === "judgment") return NextResponse.json({ judgment: await service.recordEvaluationJudgment(parsed) });
    if (parsed.action === "flagRegression") return NextResponse.json({ regression: await service.flagRegression(parsed) });
    return NextResponse.json({ golden: await service.promoteGolden(parsed) });
  } catch (error) { return errorResponse(error); }
}

function errorResponse(error: unknown) {
  const status = error instanceof z.ZodError ? 400 : error instanceof FieldBetaError ? 409 : error instanceof Error && error.message.includes("disabled") ? 404 : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "BUILD 005 request failed.", code: error instanceof FieldBetaError ? error.code : "REQUEST_FAILED" }, { status });
}
