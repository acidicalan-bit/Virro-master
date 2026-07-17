export const AUDIT_CONSENT_VERSION = "workflow-audit-v1.0-2026-07-16";
export const AUDIT_LEAD_RETENTION_DAYS = 90;

export const auditFlowOptions = ["Design Delivery", "Product Delivery", "Operational Handoff", "Sales to Delivery", "Vendor Handoff", "Documentation and Knowledge", "AI Understanding", "Otro"] as const;
export const auditToolOptions = ["Jira", "Figma", "GitHub", "Slack/Teams", "Correo/documentos", "Sistema interno", "No existe una fuente clara", "Otro"] as const;

export type AuditRequest = {
  name: string; email: string; company: string; companySize: string; area: string;
  flowType: string; informationLocation: string; sender: string; receiver: string;
  nextAction: string; commonChange: string; tool: string; volume: string; problem: string;
  privacyConsent: true; consentVersion: typeof AUDIT_CONSENT_VERSION;
  submittedAt: string; retentionUntil: string; source: "virro.app/workflow-audit";
};

export type AuditRequestParseResult = { success: true; data: AuditRequest } | { success: false; error: string; fields: string[] };

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[<>\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }

export function parseAuditRequest(input: Record<string, unknown>, now = new Date()): AuditRequestParseResult {
  const values = {
    name: clean(input.name, 80), email: clean(input.email, 254).toLowerCase(), company: clean(input.company, 120),
    companySize: clean(input.companySize, 20), area: clean(input.area, 120), flowType: clean(input.flowType, 80),
    informationLocation: clean(input.informationLocation, 160), sender: clean(input.sender, 160), receiver: clean(input.receiver, 160),
    nextAction: clean(input.nextAction, 240), commonChange: clean(input.commonChange, 200), tool: clean(input.tool, 80),
    volume: clean(input.volume, 120), problem: clean(input.problem, 1000),
  };
  const fields = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  if (!validEmail(values.email)) fields.push("email");
  if (!auditFlowOptions.includes(values.flowType as (typeof auditFlowOptions)[number])) fields.push("flowType");
  if (!auditToolOptions.includes(values.tool as (typeof auditToolOptions)[number])) fields.push("tool");
  if (values.problem.length < 20) fields.push("problem");
  if (input.privacyConsent !== "accepted") fields.push("privacyConsent");
  if (input.consentVersion !== AUDIT_CONSENT_VERSION) fields.push("consentVersion");
  const uniqueFields = [...new Set(fields)];
  if (uniqueFields.length) return { success: false, error: "Revisa los campos obligatorios y el consentimiento de privacidad.", fields: uniqueFields };
  return {
    success: true,
    data: {
      ...values, privacyConsent: true, consentVersion: AUDIT_CONSENT_VERSION,
      submittedAt: now.toISOString(), retentionUntil: new Date(now.getTime() + AUDIT_LEAD_RETENTION_DAYS * 86_400_000).toISOString(),
      source: "virro.app/workflow-audit",
    },
  };
}
