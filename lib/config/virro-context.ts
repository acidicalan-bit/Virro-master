import { packRegistry } from "./pack-registry";

export const virroContextLayers = {
  foundation: {
    category: "Enterprise Understanding Platform",
    mission: "Convert communication, processes and documentation into operational understanding for people, teams, consultants and AI.",
    isNot: ["Chatbot", "Text corrector", "Writing tool", "Prompt generator", "Employee surveillance"],
    languageRules: { use: ["operational understanding", "meaning loss", "missing context", "critical questions", "readiness", "estimated scores"], avoid: ["guaranteed understanding", "employee performance score", "prompt generator"] },
    trustPrinciple: "Virro must be more trustworthy than intelligent.",
  },
  operatingModel: {
    centralEntity: "Understanding Event",
    concepts: ["Meaning Loss", "Understanding Debt", "DoU Score", "Handoff Readiness", "AI Understanding Debt", "Virro Score"],
    scorePolicy: "Probabilistic estimates that support human judgment; never guarantees or personal evaluations.",
  },
  packLibrary: packRegistry,
  workspaceContext: { mode: "mock", source: "Aperture Systems demo workspace" },
  projectContext: { mode: "mock", fields: ["status", "decisions", "risks", "constraints", "next actions"] },
  patternMemory: { enabledByDefault: false, storesRawPrivateText: false, allowedData: ["Permissioned anonymized patterns", "Aggregated risk categories", "Pack effectiveness trends"] },
  privacyRules: ["No raw private text retention by default", "No employee surveillance", "No personal performance scoring", "Human validation for material decisions"],
  outputContracts: ["Operational artifact", "Estimated scores", "Critical questions to validate", "Analysis trace", "Human confirmation state"],
};
