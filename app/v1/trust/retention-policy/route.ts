import { retentionPolicy } from "@/lib/trust/security-foundation";

export const dynamic = "force-static";
export function GET() {
  return Response.json(retentionPolicy, { headers: { "Cache-Control": "public, max-age=300" } });
}
