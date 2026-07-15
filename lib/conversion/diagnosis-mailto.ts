export const DIAGNOSIS_EMAIL = "contacto@virro.app";

export type DiagnosisRequest = {
  name: string;
  company: string;
  role: string;
  email: string;
  area: string;
  tools: string;
  flow: string;
  context: string;
  message?: string;
  engagement?: "audit" | "pilot";
};

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildDiagnosisMailto(request: DiagnosisRequest) {
  const company = singleLine(request.company);
  const engagement = request.engagement === "pilot" ? "Piloto enterprise" : "Auditoría de entendimiento operativo";
  const subject = `Solicitud ${engagement} · ${company}`;
  const body = [
    "Hola equipo Virro,",
    "",
    `Quiero solicitar: ${engagement}.`,
    "",
    `Nombre: ${singleLine(request.name)}`,
    `Empresa: ${company}`,
    `Rol: ${singleLine(request.role)}`,
    `Email de contacto: ${singleLine(request.email)}`,
    `Área con mayor riesgo de interpretación: ${singleLine(request.area)}`,
    `Herramientas principales: ${singleLine(request.tools)}`,
    `Flujo a diagnosticar: ${singleLine(request.flow)}`,
    "",
    "Descripción breve:",
    request.context.trim(),
    ...(request.message?.trim() ? ["", "Mensaje adicional:", request.message.trim()] : []),
    "",
    "Entiendo que antes de analizar eventos reales definiremos privacidad, alcance y confidencialidad.",
  ].join("\n");

  return `mailto:${DIAGNOSIS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
