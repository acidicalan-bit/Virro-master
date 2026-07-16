export type CapabilityStatus = "available" | "assisted" | "pilot" | "planned" | "future";

export const capabilityStatusLabels: Record<CapabilityStatus, { en: string; es: string }> = {
  available: { en: "Available", es: "Disponible" },
  assisted: { en: "Available with guidance", es: "Disponible con acompañamiento" },
  pilot: { en: "Pilot", es: "Piloto" },
  planned: { en: "Planned", es: "Planeado" },
  future: { en: "Future vision", es: "Visión futura" },
};

export interface CapabilityDefinition {
  id: string;
  name: string;
  description: { en: string; es: string };
  status: CapabilityStatus;
}

export const capabilityRegistry: CapabilityDefinition[] = [
  { id: "signal-sufficiency", name: "Signal Sufficiency", description: { en: "Recognizes when the available evidence cannot support a reliable verdict.", es: "Reconoce cuándo la evidencia disponible no permite emitir un veredicto confiable." }, status: "assisted" },
  { id: "readiness", name: "Readiness", description: { en: "Evaluates whether the receiver has enough information to perform the expected action.", es: "Evalúa si el receptor tiene información suficiente para ejecutar la acción esperada." }, status: "assisted" },
  { id: "change-integrity", name: "Change Integrity", description: { en: "Identifies dependent information that may no longer represent the current decision or version.", es: "Identifica información dependiente que puede haber dejado de representar la decisión o versión vigente." }, status: "assisted" },
  { id: "handoff-integrity", name: "Handoff Integrity", description: { en: "Reviews responsibility, evidence and acceptance at the transfer point.", es: "Revisa responsabilidad, evidencia y aceptación en el punto de transferencia." }, status: "pilot" },
  { id: "knowledge-continuity", name: "Knowledge Continuity", description: { en: "Makes critical context reusable beyond one person, meeting or provider.", es: "Hace reutilizable el contexto crítico más allá de una persona, reunión o proveedor." }, status: "pilot" },
  { id: "evidence-confidence", name: "Evidence Confidence", description: { en: "Separates observed evidence from estimates, inferences and missing sources.", es: "Separa evidencia observada de estimaciones, inferencias y fuentes ausentes." }, status: "planned" },
  { id: "outcome-tracking", name: "Outcome Tracking", description: { en: "Connects a transfer with a later confirmed operational outcome.", es: "Conecta una transferencia con un outcome operativo confirmado posteriormente." }, status: "future" },
];

export interface EntryModeDefinition {
  id: string;
  name: string;
  description: { en: string; es: string };
  detail: { en: string; es: string };
  status: CapabilityStatus;
}

export const entryModeRegistry: EntryModeDefinition[] = [
  { id: "workflow-discovery", name: "Workflow Discovery Audit", description: { en: "For work that lives in meetings, email, messaging, documents or fragmented processes.", es: "Para trabajo que vive en reuniones, correo, mensajería, documentos o procesos fragmentados." }, detail: { en: "An assisted audit maps the real transfer before any integration is considered.", es: "Una auditoría asistida mapea la transferencia real antes de considerar una integración." }, status: "assisted" },
  { id: "secure-flow-import", name: "Secure Flow Import", description: { en: "For controlled samples, exports, briefs, deliverables or sanitized histories.", es: "Para muestras controladas, exportaciones, briefs, entregables o historiales sanitizados." }, detail: { en: "Handled with guidance; this site does not accept file uploads.", es: "Se realiza con acompañamiento; este sitio no acepta archivos." }, status: "assisted" },
  { id: "native-connectors", name: "Native Connectors", description: { en: "For tools where the workflow already produces structured events.", es: "Para herramientas donde el flujo ya produce eventos estructurados." }, detail: { en: "Jira is the first connector candidate; no self-service connector is claimed here.", es: "Jira es el primer conector candidato; aquí no se afirma un conector autoservicio." }, status: "planned" },
  { id: "api-events", name: "API & Events", description: { en: "For internal systems, enterprise portals and automations.", es: "Para sistemas internos, portales empresariales y automatizaciones." }, detail: { en: "Technical foundation under validation; production scope is defined per pilot.", es: "Base técnica en validación; el alcance productivo se define por piloto." }, status: "planned" },
];

export interface UseCaseDefinition {
  id: string;
  name: string;
  flow: string;
  detects: string[];
  outcomes: string[];
  status: CapabilityStatus;
}

export const useCaseRegistry: UseCaseDefinition[] = [
  { id: "design-delivery", name: "Design Delivery", flow: "Brief → diseño → revisión → aprobación → producción", detects: ["Brief contradictorio", "Feedback no consolidado", "Versión o aprobación incierta"], outcomes: ["Rondas adicionales", "Reapertura", "Aceptación en primera revisión"], status: "assisted" },
  { id: "product-delivery", name: "Product Delivery", flow: "Producto → desarrollo → QA", detects: ["Alcance incompleto", "Criterios faltantes", "Pruebas desactualizadas"], outcomes: ["Reapertura", "Retraso", "Aceptación"], status: "pilot" },
  { id: "operational-handoff", name: "Operational Handoff", flow: "Dirección → operación → sucursal o proveedor → ejecución", detects: ["Versión anterior", "Responsable incierto", "Evidencia no definida"], outcomes: ["Ejecución condicionada", "Escalamiento", "Confirmación"], status: "pilot" },
  { id: "sales-delivery", name: "Sales to Delivery", flow: "Ventas → implementación → operación", detects: ["Promesas no reflejadas", "Alcance ambiguo", "Dependencias no confirmadas"], outcomes: ["Replanificación", "Aceptación condicionada", "Entrega"], status: "planned" },
  { id: "documentation-knowledge", name: "Documentation & Knowledge", flow: "Cambio → actualización → reutilización", detects: ["Documento posiblemente obsoleto", "Fuentes contradictorias", "Dependencia de una persona"], outcomes: ["Reutilización", "Actualización", "Consulta adicional"], status: "pilot" },
  { id: "ai-understanding", name: "AI Understanding", flow: "Intención → IA → output → uso operacional", detects: ["Contexto insuficiente", "Restricciones faltantes", "Información desactualizada"], outcomes: ["Revisión humana", "Reformulación", "Uso aprobado"], status: "future" },
];

