import { ZodError } from "zod";

import { createBlindEvaluationServices } from "@/src/server/services";
import { isLegacyInternalRouteEnabled, legacyRouteDisabledResponse } from "@/src/server/legacy-route-guard";

export async function POST(request: Request) {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const body: unknown = await request.json();
    const { blindEvaluations } = createBlindEvaluationServices();
    const session = await blindEvaluations.submitJudgment(body);
    return Response.json(
      { session },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Completa la preferencia y las calificaciones escalonadas.", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Blind evaluation judgment failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el juicio." },
      { status: 500 },
    );
  }
}
