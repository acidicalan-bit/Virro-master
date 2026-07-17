import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseAuditRequest } from "@/lib/conversion/audit-request";
import { checkPublicRateLimit } from "@/lib/security/public-rate-limit";

function responseHeaders(rate: Awaited<ReturnType<typeof checkPublicRateLimit>>) {
  return { "Cache-Control": "no-store", "X-RateLimit-Limit": String(rate.limit), "X-RateLimit-Remaining": String(rate.remaining), "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)) };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const identifier = createHash("sha256").update(`${process.env.VIRRO_FINGERPRINT_KEY || "virro-public-form"}:${ip}`).digest("hex").slice(0, 24);
  const rate = await checkPublicRateLimit(identifier);
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta de nuevo más tarde.", code: "RATE_LIMITED" }, { status: 429, headers: { ...responseHeaders(rate), "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Solicitud inválida.", code: "INVALID_JSON" }, { status: 400, headers: responseHeaders(rate) }); }
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true }, { status: 202, headers: responseHeaders(rate) });

  const parsed = parseAuditRequest(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR", fields: parsed.fields }, { status: 400, headers: responseHeaders(rate) });

  const requestId = randomUUID();
  const lead = { requestId, ...parsed.data };
  const webhook = process.env.VIRRO_LEADS_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const recipient = process.env.VIRRO_LEADS_EMAIL;
  let delivered = false;

  try {
    if (webhook) {
      const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.VIRRO_LEADS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.VIRRO_LEADS_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify(lead), cache: "no-store", signal: AbortSignal.timeout(8_000) });
      delivered = response.ok;
    } else if (resendKey && recipient) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.VIRRO_LEADS_FROM || "Virro Web <leads@virro.app>", to: [recipient], subject: `Solicitud de auditoría · ${lead.company} · ${requestId.slice(0, 8)}`, text: Object.entries(lead).map(([key, value]) => `${key}: ${value}`).join("\n") }), cache: "no-store", signal: AbortSignal.timeout(8_000) });
      delivered = response.ok;
    }
  } catch { delivered = false; }

  if (!delivered) return NextResponse.json({ error: "El canal seguro de recepción no está disponible temporalmente. Conserva tu información y vuelve a intentarlo.", code: "DELIVERY_UNAVAILABLE" }, { status: 503, headers: responseHeaders(rate) });
  return NextResponse.json({ ok: true, requestId }, { status: 201, headers: responseHeaders(rate) });
}
