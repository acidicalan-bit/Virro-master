import type { PackType, RecommendedOutputType } from "@/lib/types/understanding";
import type { AssistantPackType } from "@/lib/types/assistant";

export interface PackDefinition {
  id: PackType;
  name: string;
  spanishName: string;
  painSignals: string[];
  typicalReceivers: string[];
  outputs: RecommendedOutputType[];
  metrics: string[];
  recommendedAudit: string;
  valueStatement: string;
}

export const packRegistry: Record<PackType, PackDefinition> = {
  "product-delivery": { id: "product-delivery", name: "Product Delivery", spanishName: "Entrega de producto", painSignals: ["user story", "historia", "acceptance", "criterios", "bug", "qa", "sprint", "product"], typicalReceivers: ["Product", "Development", "QA"], outputs: ["user-story", "acceptance-criteria", "qa-matrix", "bug-report"], metrics: ["DoU Score", "Product Delivery Readiness"], recommendedAudit: "Product Delivery / Meaning Loss Audit", valueStatement: "Validate ambiguous product information before execution." },
  "ai-understanding": { id: "ai-understanding", name: "AI Understanding", spanishName: "Entendimiento para IA", painSignals: ["ai", "ia", "generic", "genérico", "hallucination", "alucin", "instruction", "instrucción"], typicalReceivers: ["AI systems", "Automation owners"], outputs: ["context-pack"], metrics: ["AI Understanding Debt", "Automation Readiness"], recommendedAudit: "AI Understanding Audit", valueStatement: "Provide operational context and boundaries that AI can understand." },
  "handoff-intelligence": { id: "handoff-intelligence", name: "Handoff Intelligence", spanishName: "Inteligencia de handoffs", painSignals: ["handoff", "rework", "retrabajo", "next team", "siguiente equipo", "transfer"], typicalReceivers: ["Downstream teams", "Consultants", "Automation"], outputs: ["handoff-brief"], metrics: ["Handoff Readiness", "Meaning Loss Risk"], recommendedAudit: "Handoff Intelligence Pilot", valueStatement: "Validate whether the next receiver can execute without reconstructing intent." },
  "process-understanding": { id: "process-understanding", name: "Process Understanding", spanishName: "Entendimiento de procesos", painSignals: ["process", "proceso", "workflow", "approval", "aprobación", "exception", "excepción", "automate", "automatizar"], typicalReceivers: ["Operations", "Other teams", "AI"], outputs: ["process-map"], metrics: ["Automation Readiness", "DoU Score"], recommendedAudit: "Process Understanding Pilot", valueStatement: "Transfer process meaning, decisions and exceptions into operational execution." },
  onboarding: { id: "onboarding", name: "Onboarding & Knowledge Transfer", spanishName: "Onboarding y transferencia de entendimiento", painSignals: ["onboarding", "new developer", "nuevo dev", "new member", "nuevo miembro", "tribal knowledge", "conocimiento disperso"], typicalReceivers: ["New members", "Consultants", "Providers"], outputs: ["onboarding-card", "context-pack"], metrics: ["Onboarding Readiness"], recommendedAudit: "Onboarding Understanding Pilot", valueStatement: "Turn dispersed knowledge into operational understanding for a new receiver." },
  "consulting-delivery": { id: "consulting-delivery", name: "Consulting Delivery", spanishName: "Entrega para consultoras", painSignals: ["client brief", "brief cliente", "agency", "agencia", "consulting project", "proyecto consult", "scope", "alcance"], typicalReceivers: ["Consulting delivery teams", "Client sponsors"], outputs: ["consulting-delivery-brief"], metrics: ["Consulting Delivery Readiness"], recommendedAudit: "Consulting Delivery Pilot", valueStatement: "Preserve client meaning from discovery through project execution." },
  "talent-staffing": { id: "talent-staffing", name: "Talent & Staffing Understanding", spanishName: "Entendimiento de talento y staffing", painSignals: ["candidate", "candidato", "recruiter", "reclut", "vacancy", "vacante", "role", "rol", "interview", "entrevista", "cv", "hiring", "staffing"], typicalReceivers: ["Recruiters", "Staffing consultants", "Hiring managers", "Candidates"], outputs: ["role-understanding-pack", "candidate-handoff-pack"], metrics: ["Role Understanding Score", "Screening Readiness", "Candidate Handoff Readiness"], recommendedAudit: "Talent & Staffing Understanding Audit", valueStatement: "Reduce meaning loss between company need, consultant interpretation, candidate communication and receiver expectation." },
  "technical-documentation": { id: "technical-documentation", name: "Technical Documentation Understanding", spanishName: "Entendimiento de documentación técnica", painSignals: ["confluence", "adr", "api", "runbook", "architecture", "arquitectura", "documentation", "documentación", "microservice"], typicalReceivers: ["Engineering", "QA", "DevOps", "Consultants", "AI"], outputs: ["technical-understanding-map", "context-pack"], metrics: ["Technical Understanding Readiness"], recommendedAudit: "Technical Documentation Audit", valueStatement: "Validate whether documented technical knowledge enables another team to act." },
};

export const criticalFlowDiscovery = {
  id: "critical-flow-discovery" as const,
  name: "Critical Flow Discovery",
  spanishName: "Diagnóstico de flujo crítico",
  recommendedAudit: "Meaning Loss Audit — Critical Flow Discovery",
};

export function getPackDefinition(pack: AssistantPackType) {
  return pack === "critical-flow-discovery" ? criticalFlowDiscovery : packRegistry[pack];
}
