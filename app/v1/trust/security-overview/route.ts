import { securityOverview } from "@/lib/trust/security-foundation";

export const dynamic = "force-static";
export function GET() {
  return Response.json(securityOverview, { headers: { "Cache-Control": "public, max-age=300" } });
}
