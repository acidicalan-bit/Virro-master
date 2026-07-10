import {
  Bot,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  FileChartColumn,
  FileCode2,
  Handshake,
  Inbox,
  LockKeyhole,
  LibraryBig,
  Network,
  PackageCheck,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";

export interface VirroModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  capabilities: string[];
  showInNavigation?: boolean;
}

export const modules: VirroModule[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: ChartNoAxesCombined, eyebrow: "Executive overview", description: "Operational understanding across the workspace.", capabilities: ["Risk posture", "Readiness signals", "Team trends"] },
  { id: "inbox", label: "Understanding Inbox", href: "/inbox", icon: Inbox, eyebrow: "Capture", description: "Turn scattered inputs into traceable Understanding Events.", capabilities: ["Manual input", "Source capture", "Initial classification"] },
  { id: "demo-scenarios", label: "Demo Scenarios", href: "/demo-scenarios", icon: LibraryBig, eyebrow: "Sales enablement", description: "Run preloaded understanding scenarios without client data.", capabilities: ["Seven scenarios", "Live mock analysis", "Generated outputs"] },
  { id: "events", label: "Events", href: "/events", icon: ClipboardList, eyebrow: "Event registry", description: "Review every point where information must become action.", capabilities: ["Event timeline", "Ownership", "Readiness tracking"], showInNavigation: false },
  { id: "product-delivery", label: "Product Delivery", href: "/product-delivery", icon: PackageCheck, eyebrow: "Analysis pack", description: "Convert product intent into delivery-ready operational artifacts.", capabilities: ["Story structuring", "Acceptance criteria", "QA matrices", "Defect reproduction"] },
  { id: "ai-understanding", label: "AI Understanding", href: "/ai-understanding", icon: Bot, eyebrow: "Analysis pack", description: "Measure whether context is sufficient for reliable AI-assisted execution.", capabilities: ["Context integrity", "Instruction boundaries", "AI understanding debt"] },
  { id: "handoff-intelligence", label: "Handoff Intelligence", href: "/handoff-intelligence", icon: Handshake, eyebrow: "Analysis pack", description: "Reduce meaning loss between people, teams and tools.", capabilities: ["Receiver fit", "Dependency map", "Handoff readiness"] },
  { id: "process-understanding", label: "Process Understanding", href: "/process-understanding", icon: Network, eyebrow: "Analysis pack", description: "Expose decision points, gaps and operational dependencies.", capabilities: ["Process maps", "Decision logic", "Control gaps"] },
  { id: "onboarding", label: "Onboarding", href: "/onboarding", icon: UsersRound, eyebrow: "Knowledge transfer", description: "Make role and process knowledge usable by new team members.", capabilities: ["Context packs", "Learning paths", "Onboarding readiness"] },
  { id: "consulting-delivery", label: "Consulting Delivery", href: "/consulting-delivery", icon: Boxes, eyebrow: "Analysis pack", description: "Turn discovery into aligned, auditable client delivery.", capabilities: ["Discovery synthesis", "Decision records", "Executive reporting"] },
  { id: "technical-documentation", label: "Technical Documentation", href: "/technical-documentation", icon: FileCode2, eyebrow: "Technical understanding", description: "Assess whether architecture and documentation enable safe action.", capabilities: ["Technical understanding maps", "Architecture gaps", "Technical readiness"] },
  { id: "reports", label: "Reports", href: "/reports", icon: FileChartColumn, eyebrow: "Executive reporting", description: "Package probabilistic signals for decisions and governance.", capabilities: ["Executive reports", "Trend exports", "Risk summaries"] },
  { id: "privacy-trust", label: "Privacy & Trust", href: "/privacy-trust", icon: LockKeyhole, eyebrow: "Governance", description: "Make data boundaries, retention and analysis behavior visible and governable.", capabilities: ["Data boundaries", "Retention controls", "Analysis transparency"] },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings, eyebrow: "Workspace model", description: "Define teams, roles, flows and connected tools.", capabilities: ["Workspace", "Teams and roles", "Scoring policy"] },
];

export const moduleMap = new Map(modules.map((module) => [module.id, module]));

const spanishModuleCopy: Record<string, Pick<VirroModule, "label" | "eyebrow" | "description" | "capabilities">> = {
  dashboard: { label: "Tablero ejecutivo", eyebrow: "Vista ejecutiva", description: "Entendimiento operativo en todo el workspace.", capabilities: ["Postura de riesgo", "Señales de readiness", "Tendencias de equipos"] },
  inbox: { label: "Bandeja de entendimiento", eyebrow: "Captura", description: "Convierte inputs dispersos en Understanding Events trazables.", capabilities: ["Input manual", "Captura de fuente", "Clasificación inicial"] },
  "demo-scenarios": { label: "Escenarios demo", eyebrow: "Demostración comercial", description: "Ejecuta escenarios precargados sin datos del cliente.", capabilities: ["Siete escenarios", "Análisis mock", "Outputs operativos"] },
  events: { label: "Eventos", eyebrow: "Registro de eventos", description: "Revisa cada punto donde la información debe convertirse en acción.", capabilities: ["Línea de tiempo", "Responsabilidad", "Seguimiento de readiness"] },
  "product-delivery": { label: "Entrega de producto", eyebrow: "Pack de análisis", description: "Convierte intención de producto en artefactos listos para ejecución.", capabilities: ["Estructura de historias", "Criterios de aceptación", "Matrices QA", "Reproducción de bugs"] },
  "ai-understanding": { label: "Entendimiento para IA", eyebrow: "Pack de análisis", description: "Mide si el contexto es suficiente para una ejecución asistida por IA confiable.", capabilities: ["Integridad de contexto", "Límites de instrucción", "Deuda de entendimiento con IA"] },
  "handoff-intelligence": { label: "Inteligencia de handoffs", eyebrow: "Pack de análisis", description: "Reduce la pérdida de significado entre personas, equipos y herramientas.", capabilities: ["Ajuste al receptor", "Mapa de dependencias", "Readiness de handoff"] },
  "process-understanding": { label: "Entendimiento de procesos", eyebrow: "Pack de análisis", description: "Expone decisiones, brechas y dependencias operativas.", capabilities: ["Mapas de proceso", "Lógica de decisión", "Brechas de control"] },
  onboarding: { label: "Onboarding", eyebrow: "Transferencia de entendimiento", description: "Hace utilizable el conocimiento de roles y procesos para nuevos miembros.", capabilities: ["Context Packs", "Rutas de entendimiento", "Readiness de onboarding"] },
  "consulting-delivery": { label: "Entrega para consultoras", eyebrow: "Pack de análisis", description: "Convierte discovery en una entrega al cliente alineada y auditable.", capabilities: ["Síntesis de discovery", "Registros de decisión", "Reportes ejecutivos"] },
  "technical-documentation": { label: "Documentación técnica", eyebrow: "Entendimiento técnico", description: "Valida si la arquitectura y documentación permiten actuar con seguridad.", capabilities: ["Mapas de entendimiento técnico", "Brechas de arquitectura", "Readiness técnico"] },
  reports: { label: "Reportes", eyebrow: "Reportes ejecutivos", description: "Empaqueta señales probabilísticas para decisiones y gobernanza.", capabilities: ["Reportes ejecutivos", "Exportes de tendencias", "Resúmenes de riesgo"] },
  "privacy-trust": { label: "Privacidad y confianza", eyebrow: "Gobernanza", description: "Hace visibles y gobernables los límites de datos, retención y análisis.", capabilities: ["Límites de datos", "Controles de retención", "Transparencia de análisis"] },
  settings: { label: "Configuración", eyebrow: "Modelo de workspace", description: "Define equipos, roles, flujos y herramientas conectadas.", capabilities: ["Workspace", "Equipos y roles", "Política de scoring"] },
};

export function localizeModule(module: VirroModule, locale: Locale): VirroModule {
  return locale === "es" ? { ...module, ...spanishModuleCopy[module.id] } : module;
}
