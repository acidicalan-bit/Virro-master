import { NextResponse } from "next/server";
import { z } from "zod";

import { PreservationRuntimeError } from "@/src/application/outcome/media/preservation-verification-service";
import {
  CandidatePreferenceSchema,
  HumanEvaluationTagSchema,
  PreservationPolicySchema,
} from "@/src/domain/outcome/media/preservation";
import { createPreservationVerificationService } from "@/src/server/preservation-services";
import { isLegacyInternalRouteEnabled, legacyRouteDisabledResponse } from "@/src/server/legacy-route-guard";

export const runtime = "nodejs";

const RunExperimentSchema = z.object({
  action: z.literal("runExperiment"),
  projectName: z.string().trim().min(1).max(200),
  assetName: z.string().trim().min(1).max(200),
  instruction: z.string().trim().min(1).max(8000),
  sourceMimeType: z.literal("image/png"),
  sourceBase64: z.string().min(1).max(14_000_000),
  policy: PreservationPolicySchema,
});

const PreferenceSchema = z.object({
  action: z.literal("recordPreference"),
  transactionId: z.uuid(),
  rawCandidateId: z.uuid(),
  preservedCandidateId: z.uuid(),
  preference: CandidatePreferenceSchema,
  evaluationTags: z.array(HumanEvaluationTagSchema).max(20).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const DecisionSchema = z.object({
  action: z.enum(["approvePreserved", "reject"]),
  transactionId: z.uuid(),
});

const RequestSchema = z.discriminatedUnion("action", [RunExperimentSchema, PreferenceSchema, DecisionSchema]);

export async function GET(request: Request) {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const transactionId = z.uuid().parse(new URL(request.url).searchParams.get("transactionId"));
    const experiment = await createPreservationVerificationService().getExperiment(transactionId);
    return NextResponse.json({ experiment });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof PreservationRuntimeError ? 404 : 500;
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not load preservation experiment.",
      code: error instanceof PreservationRuntimeError ? error.code : "REQUEST_FAILED",
    }, { status });
  }
}

export async function POST(request: Request) {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const parsed = RequestSchema.parse(await request.json());
    const service = createPreservationVerificationService();
    if (parsed.action === "runExperiment") {
      const experiment = await service.runExperiment({
        projectName: parsed.projectName,
        assetName: parsed.assetName,
        instruction: parsed.instruction,
        sourceMimeType: parsed.sourceMimeType,
        sourceBytes: new Uint8Array(Buffer.from(parsed.sourceBase64, "base64")),
        policy: parsed.policy,
      });
      return NextResponse.json({ experiment });
    }
    if (parsed.action === "recordPreference") {
      const preference = await service.recordPreference(parsed);
      return NextResponse.json({ preference });
    }
    if (parsed.action === "approvePreserved") {
      const commit = await service.approvePreserved(parsed.transactionId);
      return NextResponse.json({ commit });
    }
    const rejection = await service.reject(parsed.transactionId);
    return NextResponse.json({ rejection });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof PreservationRuntimeError ? 409 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected preservation runtime error.",
        code: error instanceof PreservationRuntimeError ? error.code : "REQUEST_FAILED",
      },
      { status },
    );
  }
}
