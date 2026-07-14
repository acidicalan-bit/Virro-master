import { dataHandlingSummary } from "@/lib/trust/security-foundation";

export const dynamic = "force-static";
export function GET() {
  return Response.json(dataHandlingSummary, { headers: { "Cache-Control": "public, max-age=300" } });
}
