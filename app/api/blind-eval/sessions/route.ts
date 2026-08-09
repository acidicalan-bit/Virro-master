import { z, ZodError } from "zod";

import { createBlindEvaluationServices } from "@/src/server/services";

const StartSessionSchema = z.object({ evaluationSetId: z.uuid() }).strict();

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { evaluationSetId } = StartSessionSchema.parse(body);
    const { blindEvaluations } = createBlindEvaluationServices();
    return Response.json(
      { session: await blindEvaluations.startSession(evaluationSetId) },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "El set seleccionado no es válido." }, { status: 400 });
    }
    console.error("Blind evaluation session start failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    const notConfigured =
      error instanceof Error &&
      (error.message.includes("OPENAI_API_KEY") || error.message.includes("candidato real"));
    return Response.json(
      {
        error: notConfigured
          ? "El proveedor OpenAI todavía no está configurado en el servidor."
          : "No se pudo iniciar la evaluación ciega.",
      },
      { status: notConfigured ? 503 : 500 },
    );
  }
}
