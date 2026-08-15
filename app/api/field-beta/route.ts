import { NextResponse } from "next/server";
import { z } from "zod";

import { FieldBetaError } from "@/src/application/outcome/media/field-beta-service";
import { createFieldBetaService } from "@/src/server/field-beta-services";
import { createCanonicalOutcomeCommitService } from "@/src/server/canonical-trust-services";
import { resolveRequestAuthority } from "@/src/server/tenant-authority";
import { AuthorityError, assertAuthorityRole } from "@/src/domain/auth/authority";
import { CanonicalCommitError } from "@/src/application/ports/outcome/canonical-commit-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
}).strict();
const FeedbackSchema = z.object({ action: z.literal("feedback"), fieldOutcomeId: z.uuid(), humanAccepted: z.boolean(), failureTags: z.array(z.string()).max(20).optional(), humanCorrection: z.string().trim().max(8_000).nullable().optional() }).strict();
const CommitSchema = z.object({ action: z.literal("commit"), fieldOutcomeId: z.uuid() }).strict();
const JudgmentSchema = z.object({ action: z.literal("judgment"), sampleId: z.uuid(), preference: z.enum(["A_BETTER", "B_BETTER", "TIE", "BOTH_BAD"]) });
const RegressionSchema = z.object({ action: z.literal("flagRegression"), fieldOutcomeId: z.uuid(), reason: z.string().trim().min(1).max(4_000) });
const GoldenSchema = z.object({ action: z.literal("promoteGolden"), fieldOutcomeId: z.uuid(), intentExpectation: z.string().trim().min(1).max(8_000), criticalPreservationExpectation: z.string().trim().min(1).max(8_000), promotionReason: z.string().trim().min(1).max(4_000), usageAuthorizationStatus: z.literal("AUTHORIZED_INTERNAL") });
const RequestSchema = z.discriminatedUnion("action", [RunSchema, FeedbackSchema, CommitSchema, JudgmentSchema, RegressionSchema, GoldenSchema]);

export async function GET(request: Request) {
  try {
    const resolved = await resolveRequestAuthority(request);
    if (resolved.kind !== "AUTHENTICATED" || !resolved.authority) return authorityResponse(resolved.kind);
    const service = createFieldBetaService(resolved.authority);
    const url = new URL(request.url);
    const transactionId = url.searchParams.get("transactionId");
    if (transactionId) return NextResponse.json({ result: await service.getByTransactionId(z.uuid().parse(transactionId)) });
    return NextResponse.json(await service.getDashboard());
  } catch (error) { return fieldBetaErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.parse(await request.json());
    const resolved = await resolveRequestAuthority(request);
    if (resolved.kind !== "AUTHENTICATED" || !resolved.authority) return authorityResponse(resolved.kind);
    const service = createFieldBetaService(resolved.authority);
    if (parsed.action === "run") {
      const { sourceBase64, ...runInput } = withoutAction(parsed);
      return NextResponse.json({ result: await service.run({ ...runInput, sourceBytes: new Uint8Array(Buffer.from(sourceBase64, "base64")) }) });
    }
    if (parsed.action === "feedback") {
      assertAuthorityRole(resolved.authority, "OWNER");
      return NextResponse.json({ feedback: await service.recordFeedback(withoutAction(parsed)) });
    }
    if (parsed.action === "commit") {
      const commitService = await createCanonicalOutcomeCommitService(request);
      return NextResponse.json({ commit: await commitService.commitAcceptedFieldOutcome(resolved.authority, parsed.fieldOutcomeId) });
    }
    if (parsed.action === "judgment") return NextResponse.json({ judgment: await service.recordEvaluationJudgment(withoutAction(parsed)) });
    if (parsed.action === "flagRegression") return NextResponse.json({ regression: await service.flagRegression(withoutAction(parsed)) });
    return NextResponse.json({ golden: await service.promoteGolden(withoutAction(parsed)) });
  } catch (error) { return fieldBetaErrorResponse(error); }
}

function authorityResponse(kind: string) {
  const status = kind === "UNAUTHENTICATED" ? 401 : kind === "AUTH_ENVIRONMENT_FAILURE" ? 503 : 401;
  return NextResponse.json({ error: "La autenticación o autoridad de tenant no es válida.", code: kind }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function fieldBetaErrorResponse(error: unknown) {
  const disabled = error instanceof Error && error.message.includes("disabled");
  const status = error instanceof z.ZodError ? 400 : error instanceof AuthorityError ? 403 : error instanceof CanonicalCommitError ? 409 : error instanceof FieldBetaError ? 409 : disabled ? 404 : 500;
  const code = error instanceof z.ZodError ? "INVALID_REQUEST" : error instanceof AuthorityError ? error.code : error instanceof CanonicalCommitError ? error.code : error instanceof FieldBetaError ? error.code : disabled ? "FIELD_BETA_DISABLED" : "FIELD_BETA_REQUEST_FAILED";
  const message = error instanceof z.ZodError ? "La solicitud de Field Beta no es válida." : error instanceof AuthorityError ? "La autoridad de tenant no permite esta operación." : error instanceof CanonicalCommitError ? "El commit canónico no pudo completarse." : disabled ? "Field Beta no está habilitado." : error instanceof FieldBetaError ? "La operación de Field Beta no pudo completarse." : "La solicitud de Field Beta no pudo completarse.";
  return NextResponse.json({ error: message, code }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function withoutAction<T extends { action: string }>(input: T): Omit<T, "action"> {
  const copy = { ...input } as Omit<T, "action"> & { action?: string };
  delete copy.action;
  return copy;
}
