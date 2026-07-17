import type { PackType, UnderstandingEvent, UnderstandingScores } from "@/lib/types/understanding";

const average = (values: number[]) => values.length
  ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
  : 0;

const packLabels: Record<PackType, string> = {
  "product-delivery": "Product Delivery",
  "ai-understanding": "AI Understanding",
  "handoff-intelligence": "Handoff Intelligence",
  "process-understanding": "Process Understanding",
  onboarding: "Onboarding",
  "consulting-delivery": "Consulting Delivery",
  "talent-staffing": "Talent & Staffing",
  "technical-documentation": "Technical Documentation",
};

export function buildDashboardInsights(events: UnderstandingEvent[]) {
  const riskCounts = new Map<string, number>();
  const missingCounts = new Map<string, { count: number; exposure: number; events: string[] }>();

  for (const event of events) {
    for (const risk of event.risks) riskCounts.set(risk, (riskCounts.get(risk) ?? 0) + 1);
    for (const gap of event.missingContext) {
      const current = missingCounts.get(gap) ?? { count: 0, exposure: 0, events: [] };
      current.count += 1;
      current.exposure += event.scores.meaningLossRisk;
      current.events.push(event.id);
      missingCounts.set(gap, current);
    }
  }

  const areaRisk = Object.entries(packLabels)
    .map(([pack, label]) => {
      const packEvents = events.filter((event) => event.packType === pack);
      return {
        pack: pack as PackType,
        label,
        eventCount: packEvents.length,
        risk: average(packEvents.map((event) => event.scores.meaningLossRisk)),
      };
    })
    .filter((area) => area.eventCount > 0)
    .sort((a, b) => b.risk - a.risk);

  const backlog = [...missingCounts.entries()]
    .map(([gap, data]) => ({
      gap,
      eventCount: data.count,
      exposure: Math.round(data.exposure / data.count),
      events: data.events,
      priority: data.exposure / data.count >= 55 ? "Critical" : data.exposure / data.count >= 35 ? "High" : "Medium",
    }))
    .sort((a, b) => b.exposure - a.exposure);

  const handoffsAtRisk = events
    .filter((event) => event.packType === "handoff-intelligence" || event.inputType === "handoff")
    .filter((event) => event.scores.handoffReadiness < 70)
    .sort((a, b) => a.scores.handoffReadiness - b.scores.handoffReadiness);

  const topRisks = [...riskCounts.entries()]
    .map(([risk, count]) => ({ risk, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const scoreAverage = (key: keyof UnderstandingScores) => average(events.map((event) => event.scores[key]));
  const mostAtRiskArea = areaRisk[0];

  return {
    metrics: {
      totalEvents: events.length,
      averageDoU: scoreAverage("degreeOfUnderstanding"),
      averageMeaningLossRisk: scoreAverage("meaningLossRisk"),
      handoffsAtRisk: handoffsAtRisk.length,
      aiUnderstandingDebt: scoreAverage("aiUnderstandingDebt"),
      technicalReadiness: scoreAverage("technicalReadiness"),
      onboardingReadiness: scoreAverage("onboardingReadiness"),
    },
    topRisks,
    backlog,
    handoffsAtRisk,
    areaRisk,
    answers: {
      losingUnderstanding: backlog[0]?.gap ?? "No material understanding gap detected",
      highestRiskArea: mostAtRiskArea ? `${mostAtRiskArea.label} · directional finding across ${mostAtRiskArea.eventCount} event${mostAtRiskArea.eventCount === 1 ? "" : "s"}` : "No active area risk",
      firstCorrection: backlog[0]
        ? `Resolve “${backlog[0].gap}” across ${backlog[0].eventCount} affected event${backlog[0].eventCount === 1 ? "" : "s"}.`
        : "Continue monitoring new Understanding Events.",
    },
    recommendedActions: [
      backlog[0] && `Resolve ${backlog[0].gap.toLowerCase()} in ${backlog[0].events.join(", ")}.`,
      handoffsAtRisk[0] && `Clarify ownership and completion boundaries for ${handoffsAtRisk[0].title}.`,
      mostAtRiskArea && `Run a focused ${mostAtRiskArea.label} understanding review.`,
      "Review these estimates with accountable teams before changing operational policy.",
    ].filter((action): action is string => Boolean(action)),
  };
}
