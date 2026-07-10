import { describe, expect, it } from "vitest";
import { virroSeed } from "@/lib/data/seed";
import { buildWorkspaceStats, validateUnderstandingEvent } from "@/lib/domain/understanding-event";
import { validateWorkspaceReferences } from "@/lib/domain/workspace";

describe("domain seed integrity", () => {
  it("contains valid workspace references", () => {
    expect(validateWorkspaceReferences(virroSeed.workspace, virroSeed.roleCards, virroSeed.workflows)).toEqual([]);
  });

  it("contains valid Understanding Events", () => {
    for (const event of virroSeed.events) expect(validateUnderstandingEvent(event)).toEqual([]);
  });

  it("builds bounded workspace statistics", () => {
    const stats = buildWorkspaceStats(virroSeed.events);
    expect(stats.openEvents).toBeLessThanOrEqual(stats.virroScore + virroSeed.events.length);
    expect(stats.virroScore).toBeGreaterThanOrEqual(0);
    expect(stats.virroScore).toBeLessThanOrEqual(100);
    expect(stats.readyForAction).toBeGreaterThanOrEqual(0);
    expect(stats.readyForAction).toBeLessThanOrEqual(100);
  });
});
