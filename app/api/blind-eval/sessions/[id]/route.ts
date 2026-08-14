import { z, ZodError } from "zod";

import { createBlindEvaluationServices } from "@/src/server/services";
import { isLegacyInternalRouteEnabled, legacyRouteDisabledResponse } from "@/src/server/legacy-route-guard";

const SessionIdSchema = z.uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const { id } = await context.params;
    const sessionId = SessionIdSchema.parse(id);
    const { blindEvaluations } = createBlindEvaluationServices();
    return Response.json(
      { session: await blindEvaluations.getSessionView(sessionId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "La sesión no es válida." }, { status: 400 });
    }
    console.error("Blind evaluation session read failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo continuar la sesión." },
      { status: 500 },
    );
  }
}
