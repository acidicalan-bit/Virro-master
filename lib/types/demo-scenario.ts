import type {
  InputType,
  PackType,
  RecommendedOutputType,
  UnderstandingScores,
} from "@/lib/types/understanding";

export interface DemoScenario {
  id: string;
  title: string;
  rawInput: string;
  context: string;
  sourceRole: string;
  targetRole: string;
  targetTeam: string;
  targetReceiver: string;
  inputType: InputType;
  packType: PackType;
  assistantMode?: "new-event" | "critical-flow-discovery";
  expectedAnalysis: {
    probableIntent: string;
    missingInformation: string[];
    risks: string[];
  };
  mockScores: UnderstandingScores;
  generatedOutput: {
    type: RecommendedOutputType;
    title: string;
    preview: string;
  };
}
