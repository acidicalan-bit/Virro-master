import type {
  AnalysisResult,
  CompanyWorkspace,
  Report,
  RoleCard,
  Team,
  UnderstandingEvent,
  VirroSeedData,
  Workflow,
} from "@/lib/types/understanding";

const workspaceId = "ws_aperture";

const teams: Team[] = [
  {
    id: "team_growth",
    workspaceId,
    name: "Product Growth",
    description: "Owns conversion, lifecycle and expansion outcomes.",
    responsibilities: ["Growth discovery", "Experiment definition", "Lifecycle coordination"],
  },
  {
    id: "team_platform",
    workspaceId,
    name: "Platform",
    description: "Owns shared services, reliability and technical enablement.",
    responsibilities: ["Service architecture", "API governance", "Reliability controls"],
  },
  {
    id: "team_identity",
    workspaceId,
    name: "Identity",
    description: "Owns authentication, authorization and enterprise access.",
    responsibilities: ["SSO", "Access policies", "Identity integrations"],
  },
  {
    id: "team_customer_ops",
    workspaceId,
    name: "Customer Operations",
    description: "Owns support operations and customer escalation readiness.",
    responsibilities: ["Support workflows", "Escalation management", "Knowledge operations"],
  },
];

const workspace: CompanyWorkspace = {
  id: workspaceId,
  name: "Aperture Systems",
  industry: "B2B SaaS",
  description: "Enterprise software company coordinating product, platform and customer operations.",
  tools: ["Slack", "Jira", "Confluence", "Notion", "GitHub"],
  teams,
  createdAt: "2026-01-15T15:00:00.000Z",
};

const roleCards: RoleCard[] = [
  {
    id: "role_growth_pm",
    workspaceId,
    teamId: "team_growth",
    roleName: "Growth Product Manager",
    needsToUnderstand: ["Customer intent", "Consent boundaries", "Commercial outcome"],
    commonMisunderstandings: ["Channel availability implies consent", "Experiment success equals implementation completion"],
    requiredInputs: ["Problem evidence", "Target segment", "Success metric", "Policy constraints"],
    expectedOutputs: ["Delivery brief", "Acceptance criteria", "Measurement plan"],
    blockingQuestions: ["Which consent state permits the action?", "Who owns the final channel decision?"],
  },
  {
    id: "role_platform_architect",
    workspaceId,
    teamId: "team_platform",
    roleName: "Platform Architect",
    needsToUnderstand: ["System boundaries", "Consumer contracts", "Failure and rollback conditions"],
    commonMisunderstandings: ["Documented sequence means operational ownership is clear"],
    requiredInputs: ["Consumer inventory", "Compatibility constraints", "SLO impact"],
    expectedOutputs: ["Technical understanding map", "Migration decision record"],
    blockingQuestions: ["What triggers rollback?", "Which consumers cannot accept the new contract?"],
  },
  {
    id: "role_support_lead",
    workspaceId,
    teamId: "team_customer_ops",
    roleName: "Support Operations Lead",
    needsToUnderstand: ["Severity model", "Decision authority", "Escalation path"],
    commonMisunderstandings: ["A documented escalation stage identifies the accountable decision maker"],
    requiredInputs: ["Severity criteria", "Coverage calendar", "Service ownership"],
    expectedOutputs: ["Process map", "Onboarding card", "Escalation handoff"],
    blockingQuestions: ["Who may declare a severity-one incident?"],
  },
];

const workflows: Workflow[] = [
  {
    id: "workflow_growth_platform",
    workspaceId,
    name: "Growth initiative to platform delivery",
    sourceTeam: "Product Growth",
    targetTeam: "Platform",
    description: "Transfers validated growth intent into an implementation-ready platform scope.",
    commonRisks: ["Implicit ownership", "Missing policy constraints", "Success metrics detached from technical scope"],
  },
  {
    id: "workflow_platform_customer_ops",
    workspaceId,
    name: "Platform incident to customer escalation",
    sourceTeam: "Platform",
    targetTeam: "Customer Operations",
    description: "Turns a technical incident assessment into a customer-facing escalation response.",
    commonRisks: ["Severity meaning changes between teams", "No explicit communication authority"],
  },
];

const events: UnderstandingEvent[] = [
  {
    id: "UE-2481",
    workspaceId,
    title: "Checkout recovery handoff",
    rawInput: "We should recover abandoned enterprise checkouts through the best available channel. Growth can define the sequence after engineering enables it.",
    inputType: "handoff",
    sourceRole: "Growth Product Manager",
    targetRole: "Lifecycle Engineering Lead",
    targetTeam: "Product Growth",
    expectedReceiver: "The lifecycle engineering owner who can sequence channels and validate consent constraints",
    packType: "handoff-intelligence",
    probableIntent: "Launch a compliant abandoned-checkout recovery flow.",
    missingContext: ["Consent policy", "Channel priority", "Success threshold"],
    risks: ["Outreach without valid consent", "Different channel-sequencing interpretations"],
    criticalQuestions: ["Which consent state permits outreach?", "Who owns channel sequencing?"],
    recommendedOutput: "handoff-brief",
    status: "Needs context",
    scores: { degreeOfUnderstanding: 62, meaningLossRisk: 38, handoffReadiness: 54, automationReadiness: 43, aiUnderstandingDebt: 31, technicalReadiness: 58, onboardingReadiness: 67, virroScore: 61 },
    createdAt: "2026-07-10T05:48:00.000Z",
  },
  {
    id: "UE-2479",
    workspaceId,
    title: "Billing API migration brief",
    rawInput: "Move billing consumers to v3 in the documented sequence. Roll back if the migration creates unacceptable impact.",
    inputType: "technical-documentation",
    sourceRole: "Platform Architect",
    targetRole: "Migration Lead",
    targetTeam: "Platform",
    expectedReceiver: "The migration lead accountable for compatibility and rollback decisions",
    packType: "technical-documentation",
    probableIntent: "Migrate billing consumers without breaking contractual or reliability boundaries.",
    missingContext: ["Rollback owner", "Consumer inventory", "SLO impact"],
    risks: ["Incompatible consumers", "Rollback decision delayed by unclear ownership"],
    criticalQuestions: ["Which consumers cannot accept the new contract?", "What triggers rollback?"],
    recommendedOutput: "technical-understanding-map",
    status: "At risk",
    scores: { degreeOfUnderstanding: 49, meaningLossRisk: 61, handoffReadiness: 46, automationReadiness: 39, aiUnderstandingDebt: 42, technicalReadiness: 41, onboardingReadiness: 52, virroScore: 48 },
    createdAt: "2026-07-10T05:12:00.000Z",
  },
  {
    id: "UE-2474",
    workspaceId,
    title: "Enterprise SSO acceptance scope",
    rawInput: "Enterprise administrators can configure SAML SSO, validate metadata and recover from configuration errors without losing existing access.",
    inputType: "user-story",
    sourceRole: "Identity Product Manager",
    targetRole: "Identity Engineering Lead",
    targetTeam: "Identity",
    expectedReceiver: "The identity delivery team implementing and testing enterprise SSO",
    packType: "product-delivery",
    probableIntent: "Deliver safe, testable enterprise SSO configuration.",
    missingContext: [],
    risks: ["Session renewal scope may expand delivery"],
    criticalQuestions: ["Should session renewal be included in this release?"],
    recommendedOutput: "acceptance-criteria",
    status: "Ready",
    scores: { degreeOfUnderstanding: 88, meaningLossRisk: 12, handoffReadiness: 91, automationReadiness: 82, aiUnderstandingDebt: 11, technicalReadiness: 86, onboardingReadiness: 78, virroScore: 87 },
    createdAt: "2026-07-10T03:00:00.000Z",
  },
  {
    id: "UE-2468",
    workspaceId,
    title: "Support escalation playbook",
    rawInput: "Severe incidents move from frontline support to the incident channel and then to the responsible service team.",
    inputType: "process",
    sourceRole: "Support Operations Lead",
    targetRole: "Incident Commander",
    targetTeam: "Customer Operations",
    expectedReceiver: "The incident commander coordinating customer and service-team escalation",
    packType: "process-understanding",
    probableIntent: "Make severe support escalations consistent and accountable.",
    missingContext: ["Severity authority", "After-hours route"],
    risks: ["Severity declared inconsistently", "Escalations stall outside business hours"],
    criticalQuestions: ["Who may declare a severity-one incident?"],
    recommendedOutput: "process-map",
    status: "In review",
    scores: { degreeOfUnderstanding: 74, meaningLossRisk: 26, handoffReadiness: 73, automationReadiness: 68, aiUnderstandingDebt: 24, technicalReadiness: 69, onboardingReadiness: 76, virroScore: 73 },
    createdAt: "2026-07-09T18:30:00.000Z",
  },
];

const analysisResults: AnalysisResult[] = [
  {
    id: "analysis_2479",
    eventId: "UE-2479",
    summary: "The migration sequence exists, but safe execution is blocked by implicit rollback authority and incomplete consumer context.",
    meaningLossRisk: 61,
    missingInformation: ["Named rollback owner", "Validated consumer inventory", "Maximum acceptable SLO impact"],
    assumptions: ["All consumers are visible in the current documentation", "The migration can be reversed without data repair"],
    criticalQuestions: ["What measurable signal triggers rollback?", "Who has authority to stop the migration?"],
    recommendedActions: ["Create a consumer compatibility matrix", "Record rollback decision rights"],
    generatedArtifacts: [
      { id: "artifact_tum_2479", type: "technical-understanding-map", title: "Billing v3 Technical Understanding Map", status: "draft" },
    ],
    scores: events[1].scores,
  },
];

const reports: Report[] = [
  {
    id: "report_workspace_july",
    workspaceId,
    reportType: "workspace-health",
    title: "Operational Understanding — July",
    summary: "Cross-team readiness is improving, while technical decision rationale remains the primary understanding gap.",
    findings: ["One of four active events is ready for action", "Rollback ownership is the highest technical risk"],
    recommendations: ["Require decision authority in technical handoffs", "Add consent constraints to growth intake"],
    createdAt: "2026-07-10T06:00:00.000Z",
  },
];

export const virroSeed: VirroSeedData = {
  workspace,
  roleCards,
  workflows,
  events,
  analysisResults,
  reports,
};

export { workspace, teams, roleCards, workflows, events, analysisResults, reports };
