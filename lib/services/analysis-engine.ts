import { MockAnalysisService, type AnalysisService } from "@/lib/services/analysis";

/** Stable application-facing contract. Replace the implementation, not consumers. */
export const analysisEngine: AnalysisService = new MockAnalysisService();
