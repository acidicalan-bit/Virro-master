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
  Network,
  PackageCheck,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

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
