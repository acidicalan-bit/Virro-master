import { ZodError } from "zod";

import { SubmitFeedbackSchema } from "@/src/application/feedback-schema";
import { logEvent } from "@/src/infrastructure/observability/logger";
import { createApplicationServices } from "@/src/server/services";
import { isLegacyInternalRouteEnabled, legacyRouteDisabledResponse } from "@/src/server/legacy-route-guard";

export async function POST(request: Request) {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const feedback = SubmitFeedbackSchema.parse(await request.json());
    const { repositories } = createApplicationServices();
    const record = await repositories.feedback.create(feedback);
    logEvent("human_feedback", {
      intentRunId: record.intentRunId,
      accepted: record.accepted,
      tagCount: record.feedbackTags.length,
    });
    return Response.json({ id: record.id, saved: true, storageMode: repositories.storageMode }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "El feedback no es válido.", issues: error.issues }, { status: 400 });
    }
    return Response.json({ error: "No pudimos guardar el feedback." }, { status: 500 });
  }
}
