import { ZodError } from "zod";

import { createBlindEvaluationServices } from "@/src/server/services";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { blindEvaluations } = createBlindEvaluationServices();
    return Response.json({ session: await blindEvaluations.submitJudgment(body) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Completa la preferencia y todas las calificaciones de A y B.", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Blind evaluation judgment failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la evaluación." },
      { status: 500 },
    );
  }
}
