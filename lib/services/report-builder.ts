import type { UnderstandingEvent } from "@/lib/types/understanding";

export interface ExecutiveReport {
  generatedAt: string;
  eventCount: number;
  estimatedVirroScore: number;
  primaryRisks: string[];
}

export const reportBuilder = {
  buildExecutiveReport(events: UnderstandingEvent[]): ExecutiveReport {
    const estimatedVirroScore = events.length
      ? Math.round(events.reduce((total, event) => total + event.scores.virroScore, 0) / events.length)
      : 0;
    return {
      generatedAt: new Date().toISOString(),
      eventCount: events.length,
      estimatedVirroScore,
      primaryRisks: [...new Set(events.flatMap((event) => event.missingContext))].slice(0, 5),
    };
  },
};
