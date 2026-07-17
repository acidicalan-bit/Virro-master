import { describe, expect, it } from "vitest";
import { auditDeliverables } from "@/lib/config/audit-offer";

describe("Flow Understanding Audit offer", () => {
  it("defines twelve concrete bilingual deliverables", () => {
    expect(auditDeliverables).toHaveLength(12);
    expect(auditDeliverables.every((item) => item.en && item.es)).toBe(true);
    expect(new Set(auditDeliverables.map((item) => item.en)).size).toBe(12);
  });
});
