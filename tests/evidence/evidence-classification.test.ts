import { describe, expect, it } from "vitest";
import { evidenceClassificationLabels } from "@/lib/evidence/evidence-classification";

describe("evidence classification", () => {
  it("separates observations, estimates, inferences, confirmations, insufficiency and limitations", () => {
    expect(Object.keys(evidenceClassificationLabels)).toEqual(["observed", "estimated", "inferred", "client_confirmed", "insufficient", "limitation"]);
    expect(evidenceClassificationLabels.client_confirmed.es).toBe("Confirmado por el cliente");
  });
});
