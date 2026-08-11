import { z } from "zod";

import { PreservationStudyError } from "@/src/application/outcome/media/preservation-study-service";
import { StudyCandidateLabelSchema } from "@/src/domain/outcome/media/preservation-study";
import { createPreservationStudyService } from "@/src/server/preservation-study-services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const caseId = z.uuid().parse(params.get("caseId"));
    const label = StudyCandidateLabelSchema.parse(params.get("label"));
    const source = await createPreservationStudyService().getBlindCandidateSource(caseId, label);
    const upstream = await fetch(source, { cache: "no-store" });
    if (!upstream.ok) throw new Error(`Candidate media read failed with ${upstream.status}.`);
    return new Response(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof PreservationStudyError ? 409 : 502;
    return Response.json({ error: error instanceof Error ? error.message : "Could not load candidate media." }, { status });
  }
}
