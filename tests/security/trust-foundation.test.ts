import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dataHandlingSummary, retentionPolicy, securityOverview } from "@/lib/trust/security-foundation";

describe("security foundation", () => {
  it("publishes the privacy-first trust contract", () => {
    expect(dataHandlingSummary.default_privacy_mode).toBe("safe");
    expect(dataHandlingSummary.raw_data_stored_by_default).toBe(false);
    expect(retentionPolicy.raw_data_retention).toBe("none");
    expect(securityOverview.raw_stored).toBe(false);
    expect(securityOverview.pipeline).toEqual(["Auth", "Tenant Guard", "PrivacyPolicyGuard", "Privacy Shield", "Analyze-Safe", "Store Signals"]);
  });

  it("keeps forbidden raw-content columns out of the Prisma schema", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    for (const name of ["rawInput", "raw_text", "original_content", "full_message", "full_document", "transcript", "conversation_body"]) {
      expect(schema).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });
});
