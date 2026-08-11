import { NextResponse } from "next/server";
import { z } from "zod";

import { PreservationStudyError } from "@/src/application/outcome/media/preservation-study-service";
import {
  StudyCandidateLabelSchema,
  StudyFailureTagSchema,
  StudyPairwisePreferenceSchema,
  StudyRatingsSchema,
  StudyTaskTypeSchema,
  StudyTopologySchema,
} from "@/src/domain/outcome/media/preservation-study";
import { createPreservationStudyService } from "@/src/server/preservation-study-services";

export const runtime = "nodejs";

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addCase"),
    transactionId: z.uuid(),
    planCaseId: z.string().trim().min(1).max(120).nullable().optional(),
    topology: StudyTopologySchema,
    taskType: StudyTaskTypeSchema,
  }).strict(),
  z.object({
    action: z.literal("lockIntent"),
    caseId: z.uuid(),
    expectedChange: z.string().trim().min(1).max(8_000),
    expectedPreservation: z.string().trim().min(1).max(8_000),
    unacceptableNotes: z.string().trim().max(8_000).nullable().optional(),
  }).strict(),
  z.object({
    action: z.literal("rateCandidate"),
    caseId: z.uuid(),
    candidateLabel: StudyCandidateLabelSchema,
    ratings: StudyRatingsSchema,
    failureTags: z.array(StudyFailureTagSchema).max(11).optional(),
    notes: z.string().trim().max(8_000).nullable().optional(),
  }).strict(),
  z.object({
    action: z.literal("recordPairwise"),
    caseId: z.uuid(),
    preference: StudyPairwisePreferenceSchema,
    notes: z.string().trim().max(8_000).nullable().optional(),
  }).strict(),
  z.object({
    action: z.literal("recordAcceptance"),
    caseId: z.uuid(),
    rawAccepted: z.boolean(),
    preservedAccepted: z.boolean(),
  }).strict(),
]);

export async function GET(request: Request) {
  try {
    const caseId = new URL(request.url).searchParams.get("caseId");
    const service = createPreservationStudyService();
    if (caseId) return NextResponse.json({ studyCase: await service.getCaseView(z.uuid().parse(caseId)) });
    return NextResponse.json({ dashboard: await service.getDashboard() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    const service = createPreservationStudyService();
    if (input.action === "addCase") return NextResponse.json({ studyCase: await service.addCase({
      transactionId: input.transactionId,
      planCaseId: input.planCaseId ?? null,
      topology: input.topology,
      taskType: input.taskType,
    }) });
    if (input.action === "lockIntent") return NextResponse.json({ studyCase: await service.lockIntent(input.caseId, {
      expectedChange: input.expectedChange,
      expectedPreservation: input.expectedPreservation,
      unacceptableNotes: input.unacceptableNotes ?? null,
    }) });
    if (input.action === "rateCandidate") return NextResponse.json({ studyCase: await service.rateCandidate({
      caseId: input.caseId,
      candidateLabel: input.candidateLabel,
      ratings: input.ratings,
      failureTags: input.failureTags ?? [],
      notes: input.notes ?? null,
    }) });
    if (input.action === "recordPairwise") return NextResponse.json({ studyCase: await service.recordPairwise({
      caseId: input.caseId,
      preference: input.preference,
      notes: input.notes ?? null,
    }) });
    return NextResponse.json({ studyCase: await service.recordAcceptance({
      caseId: input.caseId,
      rawAccepted: input.rawAccepted,
      preservedAccepted: input.preservedAccepted,
    }) });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const status = error instanceof z.ZodError ? 400 : error instanceof PreservationStudyError ? 409 : 500;
  return NextResponse.json({
    error: error instanceof Error ? error.message : "Unexpected preservation study error.",
    code: error instanceof PreservationStudyError ? error.code : error instanceof z.ZodError ? "INVALID_REQUEST" : "REQUEST_FAILED",
  }, { status });
}
