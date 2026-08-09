import { ZodError, z } from "zod";

import { createApplicationServices } from "@/src/server/services";

const RunRequestSchema = z
  .object({ slugs: z.array(z.string().min(1)).max(40).optional() })
  .strict();

export async function GET() {
  try {
    const { repositories } = createApplicationServices();
    const cases = await repositories.benchmarks.listActive();
    return Response.json({ cases, storageMode: repositories.storageMode });
  } catch {
    return Response.json({ error: "No pudimos cargar los benchmarks." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { slugs } = RunRequestSchema.parse(await request.json());
    const { benchmarks, repositories } = createApplicationServices();
    const result = await benchmarks.run(slugs);
    return Response.json({ ...result, storageMode: repositories.storageMode });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "La selección de benchmarks no es válida." }, { status: 400 });
    }
    return Response.json({ error: "La ejecución de benchmarks falló." }, { status: 500 });
  }
}
