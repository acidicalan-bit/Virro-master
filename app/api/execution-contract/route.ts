import { ZodError, z } from "zod";

import { generateExecutionContract } from "@/src/domain/execution-contract";
import { IntentContractSchema } from "@/src/domain/intent-contract";

const RequestSchema = z.object({ contract: IntentContractSchema }).strict();

export async function POST(request: Request) {
  try {
    const { contract } = RequestSchema.parse(await request.json());
    return Response.json({ executionContract: generateExecutionContract(contract) });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "El Intent Contract no es válido.", issues: error.issues }, { status: 400 });
    }
    return Response.json({ error: "No pudimos generar el Execution Contract." }, { status: 500 });
  }
}
