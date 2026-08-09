import { ZodError } from "zod";

import { CompileIntentInputSchema } from "@/src/domain/intent-contract";
import { createApplicationServices } from "@/src/server/services";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = CompileIntentInputSchema.parse(body);
    const services = createApplicationServices();
    const result = await services.compiler.compile(input);
    return Response.json({ ...result, storageMode: services.repositories.storageMode });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "La solicitud no es válida.", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Intent compilation route failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json(
      { error: "No pudimos compilar la intención. Revisa la configuración o inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
