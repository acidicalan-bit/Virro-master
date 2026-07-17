import { describe, expect, it } from "vitest";
import { getSignalSufficiencyState, signalSufficiencyStates } from "@/lib/evidence/signal-sufficiency";

describe("signal sufficiency", () => {
  it("defines the six public states without a numeric fallback", () => {
    expect(signalSufficiencyStates.map(state => state.id)).toEqual(["ready", "ready_with_conditions", "needs_context", "insufficient_signal", "human_review_required", "not_applicable"]);
    expect(signalSufficiencyStates.every(state => !("score" in state))).toBe(true);
  });

  it("keeps insufficient signal distinct from not ready", () => {
    const state = getSignalSufficiencyState("insufficient_signal");
    expect(state.es).toBe("Señal insuficiente");
    expect(state.description.es).toContain("no permite determinar de forma confiable");
  });
});

