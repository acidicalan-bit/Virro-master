import { ZodError } from "zod";

import { createBlindEvaluationCatalogServices } from "@/src/server/services";
import { isLegacyInternalRouteEnabled, legacyRouteDisabledResponse } from "@/src/server/legacy-route-guard";

export async function GET() {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const { catalog, repositories } = createBlindEvaluationCatalogServices();
    return Response.json({
      sets: await catalog.listSets(),
      storageMode: repositories.storageMode,
    });
  } catch (error) {
    console.error("Blind evaluation set listing failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "No se pudieron cargar los sets de evaluación." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isLegacyInternalRouteEnabled()) return legacyRouteDisabledResponse();
  try {
    const body: unknown = await request.json();
    const { catalog } = createBlindEvaluationCatalogServices();
    return Response.json({ set: await catalog.importSet(body) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "El archivo de evaluación no cumple el formato esperado.", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Blind evaluation set import failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo importar el set." },
      { status: 409 },
    );
  }
}
