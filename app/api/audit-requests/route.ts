import { NextRequest, NextResponse } from "next/server";

const attempts = new Map<string, { count: number; resetAt: number }>();
const allowedFlows = new Set(["Jira Product Delivery", "Change Integrity", "Design Handoff", "Dev to QA", "Workflow Discovery", "Otro"]);

function clean(value: unknown, max: number) { return typeof value === "string" ? value.replace(/[<>\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now(); const entry = attempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= 5) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta de nuevo más tarde." }, { status: 429 });
  attempts.set(ip, !entry || entry.resetAt <= now ? { count: 1, resetAt: now + 60 * 60 * 1000 } : { ...entry, count: entry.count + 1 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (clean(body.website, 100)) return NextResponse.json({ ok: true }, { status: 202 });
  const lead = { name: clean(body.name, 80), email: clean(body.email, 254).toLowerCase(), company: clean(body.company, 120), role: clean(body.role, 120), teamSize: clean(body.teamSize, 20), primaryTool: clean(body.primaryTool, 120), flow: clean(body.flow, 80), projectSize: clean(body.projectSize, 120), problem: clean(body.problem, 800), privacyConsent: body.privacyConsent === "accepted", submittedAt: new Date().toISOString(), source: "virro.app/shadow-scan" };
  if (!lead.name || !validEmail(lead.email) || !lead.company || !lead.role || !lead.teamSize || !lead.primaryTool || !allowedFlows.has(lead.flow) || !lead.projectSize || lead.problem.length < 20 || !lead.privacyConsent) return NextResponse.json({ error: "Revisa los campos obligatorios y el consentimiento de privacidad." }, { status: 400 });

  const webhook = process.env.VIRRO_LEADS_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const recipient = process.env.VIRRO_LEADS_EMAIL;
  let delivered = false;
  if (webhook) {
    const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.VIRRO_LEADS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.VIRRO_LEADS_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify(lead), cache: "no-store" });
    delivered = response.ok;
  } else if (resendKey && recipient) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.VIRRO_LEADS_FROM || "Virro Web <leads@virro.app>", to: [recipient], subject: `Solicitud de auditoría · ${lead.company}`, text: Object.entries(lead).map(([key, value]) => `${key}: ${value}`).join("\n") }), cache: "no-store" });
    delivered = response.ok;
  }
  if (!delivered) return NextResponse.json({ error: "El canal de recepción no está disponible. Escríbenos a contacto@virro.app." }, { status: 503 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
